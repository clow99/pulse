import { lookup } from 'dns/promises';
import type { LookupAddress, LookupAllOptions } from 'dns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertSafeHttpUrl, isBlockedAddress, safeFetch } from './safe-fetch';

const { agents, fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn(), agents: [] as Array<{
  options: { connect: { lookup: (...args: unknown[]) => void } };
  close: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}> }));

vi.mock('dns/promises', () => ({ lookup: vi.fn() }));
vi.mock('undici', () => ({
  fetch: fetchMock,
  Agent: class {
    close = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn().mockResolvedValue(undefined);
    constructor(public options: { connect: { lookup: (...args: unknown[]) => void } }) {
      agents.push(this);
    }
  },
}));

const lookupMock = vi.mocked(lookup as (hostname: string, options: LookupAllOptions) => Promise<LookupAddress[]>);

beforeEach(() => {
  vi.clearAllMocks();
  agents.length = 0;
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Use the matching undici fetch implementation'); }));
  lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('outbound URL safety', () => {
  it.each([
    '127.0.0.1', '10.0.0.2', '169.254.169.254', '172.16.0.1',
    '192.168.1.1', '::1', 'fd00::1', 'fe80::1', '2001:db8::1',
    '::ffff:127.0.0.1', '::ffff:7f00:1', '0:0:0:0:0:ffff:7f00:1',
    '64:ff9b::7f00:1', '2002:7f00:1::1', 'ff02::1',
    '2001:0db8:0000:0000:0000:0000:0000:0001',
    '2001:0000:4136:e378:8000:63bf:3fff:fdd2',
    '3fff:0000:0000:0000:0000:0000:0000:0001',
  ])('blocks reserved or transition address %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'])('allows public address %s', (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });

  it.each(['http://2130706433/', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/'])('rejects private literal %s before transport', async (target) => {
    await expect(safeFetch(target)).rejects.toThrow('blocked');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates public IPv6 literals without a DNS lookup', async () => {
    await expect(assertSafeHttpUrl('https://[2606:4700:4700::1111]/')).resolves.toBeInstanceOf(URL);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('rejects credentials and non-http schemes', async () => {
    await expect(assertSafeHttpUrl('ftp://example.invalid/file')).rejects.toThrow('HTTP');
    await expect(assertSafeHttpUrl('https://user:pass@example.invalid')).rejects.toThrow('credentials');
  });

  it('rejects a hostname when any DNS answer is private', async () => {
    lookupMock.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.2', family: 4 },
    ]);
    await expect(safeFetch('https://reports.example.invalid/')).rejects.toThrow('blocked');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects DNS failures without falling back to an unchecked request', async () => {
    lookupMock.mockRejectedValue(new Error('DNS failed'));
    await expect(safeFetch('https://reports.example.invalid/')).rejects.toThrow('DNS failed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pins the actual connection to the vetted addresses even if DNS later changes', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]);
    lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    await safeFetch('https://reports.example.invalid/');
    const callback = vi.fn();
    agents[0].options.connect.lookup('reports.example.invalid', { family: 4 }, callback);
    expect(callback).toHaveBeenCalledWith(null, '93.184.216.34', 4);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(new URL('https://reports.example.invalid/'), expect.objectContaining({
      redirect: 'manual', dispatcher: agents[0], signal: expect.any(AbortSignal),
    }));
    const allCallback = vi.fn();
    agents[0].options.connect.lookup('reports.example.invalid', { all: true }, allCallback);
    expect(allCallback).toHaveBeenCalledWith(null, [{ address: '93.184.216.34', family: 4 }]);
  });

  it('revalidates redirects and never requests a private redirect target', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 307, headers: { location: 'http://127.0.0.1/' } }));
    await expect(safeFetch('https://reports.example.invalid/')).rejects.toThrow('blocked');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('can reject every redirect before sending a webhook payload elsewhere', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 307, headers: { location: 'https://elsewhere.example.invalid/' } }));
    await expect(safeFetch('https://reports.example.invalid/', { method: 'POST', body: 'sensitive report' }, 0)).rejects.toThrow('redirects');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('uses one timeout budget across a permitted redirect chain', async () => {
    const controller = new AbortController();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 303, headers: { location: '/delivery' } }));
    await safeFetch('https://reports.example.invalid/', { signal: controller.signal, method: 'POST', body: 'payload' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'GET', body: undefined });
    expect(fetchMock.mock.calls[1][1].signal).toBe(fetchMock.mock.calls[0][1].signal);
  });

  it('honors the caller deadline without replacing it with the default timeout', async () => {
    const deadline = new AbortController();
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    lookupMock.mockImplementation(() => new Promise(() => {}));
    const request = safeFetch('https://reports.example.invalid/', { signal: deadline.signal });
    deadline.abort(new Error('Caller timeout'));
    await expect(request).rejects.toThrow('Caller timeout');
    expect(timeout).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stops while DNS is pending when the timeout expires', async () => {
    lookupMock.mockImplementation(() => new Promise(() => {}));
    const controller = new AbortController();
    const request = safeFetch('https://reports.example.invalid/', { signal: controller.signal });
    controller.abort(new Error('Synthetic timeout'));
    await expect(request).rejects.toThrow('Synthetic timeout');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aborts an in-flight transport and releases its dispatcher', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
      controller.abort(new Error('Synthetic timeout'));
    }));
    await expect(safeFetch('https://reports.example.invalid/', { signal: controller.signal })).rejects.toThrow('Synthetic timeout');
    expect(agents[0].destroy).toHaveBeenCalled();
  });
});
