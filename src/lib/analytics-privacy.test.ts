import { describe, expect, it } from 'vitest';
import { cleanAnalyticsReferrer } from './analytics-privacy';

describe('analytics referrer minimization', () => {
  it('removes credentials and sensitive query/fragment data while retaining attribution', () => {
    expect(cleanAnalyticsReferrer('https://name:password@example.com/news?email=test@example.com#token')).toBe('https://example.com/news');
  });
  it('rejects malformed and non-web referrers', () => {
    for (const input of ['', undefined, 'not a url', 'javascript:alert(1)', 'file:///private']) {
      expect(cleanAnalyticsReferrer(input)).toBe('');
    }
  });
});
