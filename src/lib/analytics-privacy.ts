export function cleanAnalyticsReferrer(value?: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    // Referrer credentials, query parameters and fragments can carry personal data.
    return `${url.origin}${url.pathname}`;
  } catch {
    return '';
  }
}
