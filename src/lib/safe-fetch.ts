import { lookup } from 'dns/promises';
import { isIP } from 'net';

const MAX_REDIRECTS = 5;

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
  const normalized = address.toLowerCase().split('%')[0];
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith('2001:db8:')) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mapped ? blockedIpv4(mapped) : false;
}

export function isBlockedAddress(address: string) {
  const version = isIP(address);
  if (version === 4) return blockedIpv4(address);
  if (version === 6) return blockedIpv6(address);
  return true;
}

export async function assertSafeHttpUrl(input: string) {
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

  const literalVersion = isIP(url.hostname);
  const addresses = literalVersion
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error('URL resolves to a blocked network address');
  }
  return url;
}

export async function safeFetch(
  input: string,
  init: RequestInit = {},
  redirectsRemaining = MAX_REDIRECTS
): Promise<Response> {
  const url = await assertSafeHttpUrl(input);
  const response = await fetch(url, { ...init, redirect: 'manual' });
  if (![301, 302, 303, 307, 308].includes(response.status)) return response;
  if (redirectsRemaining <= 0) throw new Error('Too many redirects');

  const location = response.headers.get('location');
  if (!location) throw new Error('Redirect response is missing a location');
  const redirectedUrl = new URL(location, url);
  const method = response.status === 303 ? 'GET' : init.method;
  return safeFetch(redirectedUrl.toString(), { ...init, method }, redirectsRemaining - 1);
}
