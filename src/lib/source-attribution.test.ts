import { describe, expect, it } from 'vitest';
import { classifyTrafficSource, getReferrerHost } from './source-attribution';

describe('getReferrerHost', () => {
  it('normalizes URL referrers to hostnames', () => {
    expect(getReferrerHost('https://www.perplexity.ai/search/foo')).toBe('perplexity.ai');
  });
});

describe('classifyTrafficSource', () => {
  it('classifies known AI assistants from referrers', () => {
    expect(classifyTrafficSource({ referrer: 'https://chatgpt.com/c/123' })).toMatchObject({
      group: 'ai_assistant',
      source: 'chatgpt',
      label: 'ChatGPT',
    });
    expect(classifyTrafficSource({ referrer: 'https://www.perplexity.ai/search?q=pulse' })).toMatchObject({
      group: 'ai_assistant',
      source: 'perplexity',
      label: 'Perplexity',
    });
  });

  it('classifies AI assistants from UTM values before generic campaigns', () => {
    expect(classifyTrafficSource({ utmSource: 'Claude', utmMedium: 'referral' })).toMatchObject({
      group: 'ai_assistant',
      source: 'claude',
    });
  });

  it('classifies common non-AI sources', () => {
    expect(classifyTrafficSource({ referrer: 'https://google.com/search?q=pulse' }).group).toBe('search');
    expect(classifyTrafficSource({ utmSource: 'newsletter', utmMedium: 'email' }).group).toBe('email');
    expect(classifyTrafficSource({ referrer: '' })).toMatchObject({
      group: 'direct',
      label: 'Direct / unknown',
    });
  });
});
