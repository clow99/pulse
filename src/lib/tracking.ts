export const VISIT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export type TrackingPropertyValue = string | number | boolean | null;
export type TrackingProperties = Record<string, TrackingPropertyValue>;

export function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  return (configured || 'http://localhost:3000').replace(/\/$/, '');
}

export function buildTrackingSnippet(token: string, collectWebVitals = false) {
  const webVitalsAttr = collectWebVitals ? ' data-web-vitals="true"' : '';
  return `<script defer src="${getAppUrl()}/t.js" data-token="${token}"${webVitalsAttr}></script>`;
}

export function normalizeHostname(value: string) {
  return value.replace(/^www\./i, '').toLowerCase();
}

export function domainMatches(configuredDomain: string, observedHostname: string) {
  const configured = normalizeHostname(configuredDomain.replace(/^https?:\/\//i, '').split('/')[0] || '');
  const observed = normalizeHostname(observedHostname);
  return Boolean(configured && observed && (observed === configured || observed.endsWith(`.${configured}`)));
}

export function parseRevenueProperties(properties?: TrackingProperties | null) {
  const value = properties?.value;
  const numericValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : null;
  const currency = properties?.currency ? String(properties.currency).toUpperCase().slice(0, 12) : null;
  const orderId = properties?.orderId ? String(properties.orderId).slice(0, 200) : null;

  if (!numericValue || !Number.isFinite(numericValue) || numericValue <= 0) {
    return { revenueValue: null, revenueCurrency: null, orderId };
  }

  return {
    revenueValue: Math.round(numericValue * 100) / 100,
    revenueCurrency: currency || 'USD',
    orderId,
  };
}

const VITAL_THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

export function getWebVitalRating(name: string, value: number) {
  const thresholds = VITAL_THRESHOLDS[name.toUpperCase()];
  if (!thresholds) return 'unknown';
  if (value <= thresholds[0]) return 'good';
  if (value <= thresholds[1]) return 'needs-improvement';
  return 'poor';
}

export function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}
