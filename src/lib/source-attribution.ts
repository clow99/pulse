export type SourceGroup =
  | 'ai_assistant'
  | 'search'
  | 'social'
  | 'email'
  | 'paid'
  | 'campaign'
  | 'referral'
  | 'direct';

export interface SourceInput {
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export interface SourceAttribution {
  group: SourceGroup;
  source: string;
  label: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
}

const AI_SOURCES = [
  { source: 'chatgpt', label: 'ChatGPT', patterns: ['chatgpt', 'chat.openai.com', 'openai.com'] },
  { source: 'claude', label: 'Claude', patterns: ['claude', 'anthropic.com'] },
  { source: 'perplexity', label: 'Perplexity', patterns: ['perplexity'] },
  { source: 'gemini', label: 'Gemini', patterns: ['gemini', 'bard.google.com'] },
  { source: 'copilot', label: 'Copilot', patterns: ['copilot', 'bing.com/chat'] },
  { source: 'you.com', label: 'You.com', patterns: ['you.com'] },
  { source: 'phind', label: 'Phind', patterns: ['phind'] },
  { source: 'poe', label: 'Poe', patterns: ['poe.com'] },
] as const;

const SEARCH_HOSTS = ['google.', 'bing.com', 'duckduckgo.com', 'yahoo.', 'yandex.', 'baidu.'];
const SOCIAL_HOSTS = ['facebook.com', 'instagram.com', 'linkedin.com', 'x.com', 'twitter.com', 't.co', 'reddit.com', 'youtube.com', 'threads.net'];
const PAID_MEDIUMS = ['cpc', 'ppc', 'paid', 'paidsearch', 'paid-social', 'paidsocial', 'display', 'retargeting'];
const EMAIL_MEDIUMS = ['email', 'newsletter'];

export function getReferrerHost(referrer?: string | null) {
  if (!referrer) return '';
  try {
    return new URL(referrer).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return referrer.replace(/^https?:\/\//i, '').split('/')[0]?.replace(/^www\./i, '').toLowerCase() || '';
  }
}

export function classifyTrafficSource(input: SourceInput): SourceAttribution {
  const utmSource = normalize(input.utmSource);
  const utmMedium = normalize(input.utmMedium);
  const utmCampaign = normalize(input.utmCampaign);
  const referrerHost = getReferrerHost(input.referrer);
  const signal = [utmSource, utmMedium, utmCampaign, referrerHost].filter(Boolean).join(' ');
  const ai = matchAiSource(signal);

  if (ai) {
    return {
      group: 'ai_assistant',
      source: ai.source,
      label: ai.label,
      referrerHost,
      utmSource,
      utmMedium,
      utmCampaign,
    };
  }

  if (utmSource) {
    const group = groupFromMedium(utmMedium);
    return {
      group,
      source: utmSource,
      label: humanizeSource(utmSource),
      referrerHost,
      utmSource,
      utmMedium,
      utmCampaign,
    };
  }

  if (!referrerHost) {
    return {
      group: 'direct',
      source: 'direct',
      label: 'Direct / unknown',
      referrerHost,
      utmSource,
      utmMedium,
      utmCampaign,
    };
  }

  const hostGroup = SEARCH_HOSTS.some((host) => referrerHost.includes(host))
    ? 'search'
    : SOCIAL_HOSTS.some((host) => referrerHost.includes(host))
      ? 'social'
      : 'referral';

  return {
    group: hostGroup,
    source: referrerHost,
    label: humanizeSource(referrerHost),
    referrerHost,
    utmSource,
    utmMedium,
    utmCampaign,
  };
}

export function isAiSource(input: SourceInput) {
  return classifyTrafficSource(input).group === 'ai_assistant';
}

function matchAiSource(signal: string) {
  const normalized = signal.toLowerCase();
  return AI_SOURCES.find((source) =>
    source.patterns.some((pattern) => normalized.includes(pattern))
  ) ?? null;
}

function groupFromMedium(medium: string): SourceGroup {
  if (EMAIL_MEDIUMS.includes(medium)) return 'email';
  if (PAID_MEDIUMS.includes(medium)) return 'paid';
  if (medium.includes('social')) return 'social';
  return 'campaign';
}

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function humanizeSource(value: string) {
  return value
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\.(com|ai|io|net|org)$/i, '')
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
