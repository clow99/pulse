import OpenAI from 'openai';

export const AI_PROVIDERS = ['openai', 'anthropic', 'perplexity'] as const;
export type AIProvider = (typeof AI_PROVIDERS)[number];

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseURL?: string;
}

export function resolveAIProvider(requestedProvider?: string | null): AIProvider {
  const configured = requestedProvider || process.env.PULSE_AI_PROVIDER || 'openai';
  return AI_PROVIDERS.includes(configured as AIProvider)
    ? (configured as AIProvider)
    : 'openai';
}

export function getAIProviderConfig(provider: AIProvider): AIProviderConfig {
  switch (provider) {
    case 'anthropic':
      return {
        provider,
        apiKey: process.env.ANTHROPIC_API_KEY,
        model:
          process.env.ANTHROPIC_MODEL ||
          process.env.PULSE_AI_MODEL ||
          'claude-sonnet-4-5',
      };
    case 'perplexity':
      return {
        provider,
        apiKey: process.env.PERPLEXITY_API_KEY,
        model:
          process.env.PERPLEXITY_MODEL ||
          process.env.PULSE_AI_MODEL ||
          'sonar-pro',
        baseURL: 'https://api.perplexity.ai',
      };
    case 'openai':
      return {
        provider,
        apiKey: process.env.OPENAI_API_KEY,
        model:
          process.env.OPENAI_MODEL ||
          process.env.PULSE_AI_MODEL ||
          'gpt-4o-mini',
      };
  }
}

export function assertProviderConfigured(config: AIProviderConfig) {
  if (!config.apiKey) {
    throw new Error(`${config.provider} API key not configured`);
  }
}

export async function* streamChatCompletion({
  provider,
  systemPrompt,
  messages,
}: {
  provider: AIProvider;
  systemPrompt: string;
  messages: AIChatMessage[];
}): AsyncGenerator<string> {
  const config = getAIProviderConfig(provider);
  assertProviderConfigured(config);

  if (provider === 'anthropic') {
    yield* streamAnthropicChat(config, systemPrompt, messages);
    return;
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  const stream = await client.chat.completions.create({
    model: config.model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
    max_tokens: 1024,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

async function* streamAnthropicChat(
  config: AIProviderConfig,
  systemPrompt: string,
  messages: AIChatMessage[]
) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiKey!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      errorText || `Anthropic request failed with status ${response.status}`
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        const dataLine = block
          .split('\n')
          .find((line) => line.startsWith('data: '));
        if (!dataLine) continue;

        const payload = dataLine.slice('data: '.length);
        if (payload === '[DONE]') return;

        try {
          const event = JSON.parse(payload) as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          if (
            event.type === 'content_block_delta' &&
            event.delta?.type === 'text_delta' &&
            event.delta.text
          ) {
            yield event.delta.text;
          }
        } catch {
          // Ignore malformed SSE events from upstream providers.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
