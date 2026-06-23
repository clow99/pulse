import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAIProviderConfig, resolveAIProvider } from './ai-providers';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('AI provider config', () => {
  it('defaults to OpenAI when provider is missing or invalid', () => {
    expect(resolveAIProvider()).toBe('openai');
    expect(resolveAIProvider('unknown')).toBe('openai');
  });

  it('uses OpenAI-compatible settings for Perplexity', () => {
    vi.stubEnv('PERPLEXITY_API_KEY', 'pplx-test');
    vi.stubEnv('PERPLEXITY_MODEL', 'sonar-pro');

    const config = getAIProviderConfig('perplexity');

    expect(config.apiKey).toBe('pplx-test');
    expect(config.model).toBe('sonar-pro');
    expect(config.baseURL).toBe('https://api.perplexity.ai');
  });

  it('keeps Anthropic on the native messages API path', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'anthropic-test');
    vi.stubEnv('ANTHROPIC_MODEL', 'claude-test');

    const config = getAIProviderConfig('anthropic');

    expect(config.apiKey).toBe('anthropic-test');
    expect(config.model).toBe('claude-test');
    expect(config.baseURL).toBeUndefined();
  });
});
