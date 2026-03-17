const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: 'US',
  'en-us': 'US',
  'en-gb': 'GB',
  'en-au': 'AU',
  'en-ca': 'CA',
  'en-nz': 'NZ',
  fr: 'FR',
  'fr-fr': 'FR',
  'fr-ca': 'CA',
  de: 'DE',
  'de-de': 'DE',
  'de-at': 'AT',
  'de-ch': 'CH',
  es: 'ES',
  'es-es': 'ES',
  'es-mx': 'MX',
  'es-ar': 'AR',
  pt: 'PT',
  'pt-br': 'BR',
  'pt-pt': 'PT',
  it: 'IT',
  ja: 'JP',
  ko: 'KR',
  zh: 'CN',
  'zh-cn': 'CN',
  'zh-tw': 'TW',
  'zh-hk': 'HK',
  ru: 'RU',
  nl: 'NL',
  sv: 'SE',
  no: 'NO',
  da: 'DK',
  fi: 'FI',
  pl: 'PL',
  tr: 'TR',
  ar: 'SA',
  hi: 'IN',
  th: 'TH',
  vi: 'VN',
  id: 'ID',
  ms: 'MY',
  uk: 'UA',
  cs: 'CZ',
  el: 'GR',
  he: 'IL',
  hu: 'HU',
  ro: 'RO',
  sk: 'SK',
  bg: 'BG',
  hr: 'HR',
  sl: 'SI',
  et: 'EE',
  lv: 'LV',
  lt: 'LT',
};

export function deriveCountry(acceptLanguage: string | null): string {
  if (!acceptLanguage) return 'Unknown';

  const primary = acceptLanguage.split(',')[0]?.trim().split(';')[0]?.toLowerCase();
  if (!primary) return 'Unknown';

  return LANGUAGE_TO_COUNTRY[primary] || LANGUAGE_TO_COUNTRY[primary.split('-')[0]] || 'Unknown';
}

export function deriveLanguage(acceptLanguage: string | null): string {
  if (!acceptLanguage) return 'Unknown';
  const primary = acceptLanguage.split(',')[0]?.trim().split(';')[0];
  return primary || 'Unknown';
}
