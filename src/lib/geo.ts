export function deriveCountry(headers: Headers): string {
  const configuredHeader = process.env.PULSE_TRUSTED_COUNTRY_HEADER?.trim().toLowerCase();
  if (!configuredHeader) return 'Unknown';
  const value = headers.get(configuredHeader)?.trim().toUpperCase();
  return value && /^[A-Z]{2}$/.test(value) ? value : 'Unknown';
}

export function deriveLanguage(acceptLanguage: string | null): string {
  if (!acceptLanguage) return 'Unknown';
  const primary = acceptLanguage.split(',')[0]?.trim().split(';')[0];
  return primary || 'Unknown';
}
