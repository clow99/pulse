import { lookup } from 'dns/promises';
import { isIP, type LookupFunction } from 'net';
import { Agent, fetch as undiciFetch, type RequestInit as UndiciRequestInit } from 'undici';

const MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 10_000;

function blockedIpv4(address: string) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function blockedIpv6(address: string) {
  const literal = address.toLowerCase().split('%')[0];
  const normalized = new URL(`http://[${literal}]/`).hostname.slice(1, -1);
  // URL canonicalization converts IPv4-mapped literals to hexadecimal form.
  // Reject the entire mapped/compatible and transition spaces rather than let
  // an IPv6 spelling reach an IPv4-only private address.
  if (normalized.startsWith('::') || /^0:0:0:0:0:/.test(normalized)) return true;
  // Public Internet IPv6 unicast uses 2000::/3. Exclude transition and
  // documentation ranges within it as well.
  if (!/^[23][0-9a-f]{3}:/.test(normalized)) return true;
  return normalized.startsWith('2001:db8:') ||
    normalized.startsWith('2002:') ||
    normalized.startsWith('2001:0:') ||
    normalized.startsWith('2001::') ||
    /^3fff:[0-9a-f]{0,3}:/.test(normalized);
}

export function isBlockedAddress(address: string) {
  const version = isIP(address);
  if (version === 4) return blockedIpv4(address);
  if (version === 6) return blockedIpv6(address);
  return true;
}

export async function resolveSafeHttpUrl(input: string) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are allowed');
  }
  if (url.username || url.password) {
    throw new Error('URLs with embedded credentials are not allowed');
  }
  if (url.port && !/^\d{1,5}$/.test(url.port)) {
    throw new Error('Invalid URL port');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const literalVersion = isIP(hostname);
  const addresses = literalVersion
    ? [{ address: hostname, family: literalVersion }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error('URL resolves to a blocked network address');
  }
  return { url, addresses };
}

export async function assertSafeHttpUrl(input: string) {
  return (await resolveSafeHttpUrl(input)).url;
}

function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    operation.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export async function safeFetch(
  input: string,
  init: RequestInit = {},
  redirectsRemaining = MAX_REDIRECTS
): Promise<Response> {
  // Share the caller's deadline across DNS, response consumption and every
  // redirect. Use a bounded default when no caller deadline is supplied.
  const signal = init.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  return fetchSafeUrl(input, { ...init, signal }, redirectsRemaining);
}

async function fetchSafeUrl(
  input: string,
  init: RequestInit & { signal: AbortSignal },
  redirectsRemaining: number
): Promise<Response> {
  const { signal } = init;
  signal.throwIfAborted();
  const { url, addresses } = await abortable(resolveSafeHttpUrl(input), signal);
  signal.throwIfAborted();

  // Pin the connection to the exact addresses checked above. Resolving once
  // for validation and again inside fetch would allow DNS rebinding.
  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, addresses);
      return;
    }
    const address = addresses.find((candidate) => !options.family || candidate.family === options.family);
    if (!address) {
      callback(new Error('No safe address matches the requested address family'), '', 0);
      return;
    }
    callback(null, address.address, address.family);
  };
  const dispatcher = new Agent({ connect: { lookup: pinnedLookup } });
  const destroy = () => { void dispatcher.destroy().catch(() => {}); };
  signal.addEventListener('abort', destroy, { once: true });

  try {
    const options = { ...init, signal, redirect: 'manual' as const, dispatcher };
    // Pair the dispatcher with its own fetch implementation: Node's bundled
    // fetch can use an older dispatcher protocol than the installed package.
    const response = await undiciFetch(url, options as UndiciRequestInit);
    // close() is graceful: a caller can still consume the response body, and
    // the deadline destroys the connection if the body is left unread.
    void dispatcher.close().catch(() => {}).finally(() => signal.removeEventListener('abort', destroy));
    if (![301, 302, 303, 307, 308].includes(response.status)) return response as unknown as Response;
    await response.body?.cancel();
    if (redirectsRemaining <= 0) throw new Error('Too many redirects');

    const location = response.headers.get('location');
    if (!location) throw new Error('Redirect response is missing a location');
    const redirectedUrl = new URL(location, url);
    const method = response.status === 303 ? 'GET' : init.method;
    const body = response.status === 303 ? undefined : init.body;
    return fetchSafeUrl(redirectedUrl.toString(), { ...init, method, body, signal }, redirectsRemaining - 1);
  } catch (error) {
    signal.removeEventListener('abort', destroy);
    await dispatcher.destroy();
    throw error;
  }
}
