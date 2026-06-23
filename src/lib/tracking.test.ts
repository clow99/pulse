import { describe, expect, it } from 'vitest';
import { domainMatches, getWebVitalRating, parseRevenueProperties, percentile } from './tracking';

describe('parseRevenueProperties', () => {
  it('extracts revenue metadata from event properties', () => {
    expect(parseRevenueProperties({ value: 49.126, currency: 'usd', orderId: 'ord_1' })).toEqual({
      revenueValue: 49.13,
      revenueCurrency: 'USD',
      orderId: 'ord_1',
    });
  });

  it('ignores non-positive revenue values but keeps order id', () => {
    expect(parseRevenueProperties({ value: 0, orderId: 'ord_2' })).toEqual({
      revenueValue: null,
      revenueCurrency: null,
      orderId: 'ord_2',
    });
  });
});

describe('getWebVitalRating', () => {
  it('rates core web vitals by metric-specific thresholds', () => {
    expect(getWebVitalRating('LCP', 2400)).toBe('good');
    expect(getWebVitalRating('LCP', 3000)).toBe('needs-improvement');
    expect(getWebVitalRating('CLS', 0.4)).toBe('poor');
  });
});

describe('domainMatches', () => {
  it('allows exact host and subdomain matches', () => {
    expect(domainMatches('example.com', 'example.com')).toBe(true);
    expect(domainMatches('example.com', 'www.example.com')).toBe(true);
    expect(domainMatches('example.com', 'docs.example.com')).toBe(true);
    expect(domainMatches('example.com', 'example.org')).toBe(false);
  });
});

describe('percentile', () => {
  it('returns the requested percentile from sorted values', () => {
    expect(percentile([1, 2, 3, 4], 75)).toBe(3);
  });
});
