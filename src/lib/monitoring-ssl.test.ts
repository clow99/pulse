import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeMonitor } from './monitoring';

const mocks = vi.hoisted(() => ({
  resolveSafeHttpUrl: vi.fn(),
  connect: vi.fn(),
  monitorFind: vi.fn(),
  monitorUpdate: vi.fn(),
  checkCreate: vi.fn(),
}));

vi.mock('tls', () => ({ default: { connect: mocks.connect } }));
vi.mock('./safe-fetch', () => ({
  assertSafeHttpUrl: vi.fn(), safeFetch: vi.fn(), resolveSafeHttpUrl: mocks.resolveSafeHttpUrl,
}));
vi.mock('./notifications', () => ({ sendNotification: vi.fn() }));
vi.mock('./prisma', () => ({ prisma: {
  monitor: { findUnique: mocks.monitorFind, update: mocks.monitorUpdate },
  uptimeCheck: { create: mocks.checkCreate, findMany: vi.fn().mockResolvedValue([]) },
  alertRule: { findMany: vi.fn().mockResolvedValue([]) },
  incident: { findFirst: vi.fn().mockResolvedValue(null) },
} }));

const monitor = {
  id: 'synthetic-ssl-monitor', enabled: true, type: 'ssl_expiry', name: 'Synthetic TLS',
  config: { url: 'https://reports.example.invalid:8443/', warningDays: 30 },
  timeoutMs: 30_000, intervalSeconds: 300,
  service: { id: 'synthetic-service', name: 'Synthetic', sites: [], environment: { project: { name: 'Synthetic' } } },
};

function socket() {
  return Object.assign(new EventEmitter(), {
    getPeerCertificate: vi.fn(() => ({ valid_to: 'Jan 1 00:00:00 2099 GMT' })),
    end: vi.fn(), destroy: vi.fn(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.monitorFind.mockResolvedValue(monitor);
  mocks.monitorUpdate.mockResolvedValue({});
  mocks.checkCreate.mockImplementation(async ({ data }) => ({ ...data, checkedAt: new Date() }));
  mocks.resolveSafeHttpUrl.mockResolvedValue({
    url: new URL(monitor.config.url), addresses: [{ address: '93.184.216.34', family: 4 }],
  });
});
afterEach(() => vi.useRealTimers());

describe('SSL monitor outbound safety', () => {
  it('connects to the vetted address and preserves the original hostname for SNI', async () => {
    const connection = socket();
    mocks.connect.mockImplementation(() => {
      queueMicrotask(() => connection.emit('secureConnect'));
      return connection;
    });
    const result = await executeMonitor(monitor.id);
    expect(result).toMatchObject({ isUp: true, error: null });
    expect(mocks.resolveSafeHttpUrl).toHaveBeenCalledWith(monitor.config.url);
    expect(mocks.connect).toHaveBeenCalledWith({
      host: '93.184.216.34', port: 8443,
      servername: 'reports.example.invalid', rejectUnauthorized: false,
    });
    expect(connection.end).toHaveBeenCalledOnce();
  });

  it('never opens a socket when URL resolution rejects a blocked address', async () => {
    mocks.resolveSafeHttpUrl.mockRejectedValue(new Error('URL resolves to a blocked network address'));
    const result = await executeMonitor(monitor.id);
    expect(result).toMatchObject({ isUp: false, error: 'URL resolves to a blocked network address' });
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('bounds DNS and never connects when an approved answer arrives after the deadline', async () => {
    vi.useFakeTimers();
    let finishDns!: (value: unknown) => void;
    mocks.resolveSafeHttpUrl.mockImplementation(() => new Promise((resolve) => { finishDns = resolve; }));
    const checking = executeMonitor(monitor.id);
    await vi.advanceTimersByTimeAsync(monitor.timeoutMs);
    expect(await checking).toMatchObject({ isUp: false, error: 'TLS connection timed out' });
    finishDns({ url: new URL(monitor.config.url), addresses: [{ address: '93.184.216.34', family: 4 }] });
    await Promise.resolve();
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('preserves a configured 30-second handshake budget and destroys a timed-out socket', async () => {
    vi.useFakeTimers();
    const connection = socket();
    mocks.connect.mockReturnValue(connection);
    const checking = executeMonitor(monitor.id);
    await vi.advanceTimersByTimeAsync(10_001);
    expect(connection.destroy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(19_999);
    expect(await checking).toMatchObject({ isUp: false, error: 'TLS connection timed out' });
    expect(connection.destroy).toHaveBeenCalledOnce();
  });

  it('pins public IPv6 literals while omitting the unsupported IP-literal SNI name', async () => {
    const connection = socket();
    mocks.resolveSafeHttpUrl.mockResolvedValue({
      url: new URL('https://[2606:4700:4700::1111]/'),
      addresses: [{ address: '2606:4700:4700::1111', family: 6 }],
    });
    mocks.connect.mockImplementation(() => {
      queueMicrotask(() => connection.emit('secureConnect'));
      return connection;
    });
    expect(await executeMonitor(monitor.id)).toMatchObject({ isUp: true });
    expect(mocks.connect).toHaveBeenCalledWith(expect.objectContaining({
      host: '2606:4700:4700::1111', port: 443, servername: undefined,
    }));
  });

  it('releases its socket on TLS failure', async () => {
    const connection = socket();
    mocks.connect.mockImplementation(() => {
      queueMicrotask(() => connection.emit('error', new Error('Synthetic TLS error')));
      return connection;
    });
    expect(await executeMonitor(monitor.id)).toMatchObject({ isUp: false, error: 'Synthetic TLS error' });
    expect(connection.destroy).toHaveBeenCalledOnce();
  });
});
