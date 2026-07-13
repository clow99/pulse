interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitState>();

export function checkRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [bucketKey, state] of buckets) {
      if (state.resetAt <= now) buckets.delete(bucketKey);
    }
  }
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: options.limit - 1, resetAt };
  }

  if (existing.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export function clearRateLimitBuckets() {
  buckets.clear();
}
