import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMITS } from "$lib/config/constants";

let ratelimit: Ratelimit | null = null;

// Initialize rate limiter only if Redis credentials exist
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (redisUrl && redisToken) {
  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      RATE_LIMITS.DEFAULT.REQUESTS,
      RATE_LIMITS.DEFAULT.WINDOW,
    ),
    analytics: true,
  });
}

// Fallback in-memory rate limiter for development
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryRateLimit(identifier: string, limit: number, window: number) {
  const now = Date.now();
  const key = identifier;
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + window });
    return { success: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: limit - record.count };
}

export async function checkRateLimit(identifier: string) {
  if (ratelimit) {
    const { success, remaining } = await ratelimit.limit(identifier);
    return { success, remaining };
  }

  // Fallback to in-memory for development
  return memoryRateLimit(identifier, RATE_LIMITS.DEFAULT.REQUESTS, 10000);
}

export async function checkAIRateLimit(identifier: string) {
  // Stricter limit for AI endpoints (expensive)
  if (ratelimit && redisUrl && redisToken) {
    const aiLimiter = new Ratelimit({
      redis: new Redis({
        url: redisUrl,
        token: redisToken,
      }),
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.AI.REQUESTS,
        RATE_LIMITS.AI.WINDOW,
      ),
    });
    const { success, remaining } = await aiLimiter.limit(`ai:${identifier}`);
    return { success, remaining };
  }

  return memoryRateLimit(`ai:${identifier}`, RATE_LIMITS.AI.REQUESTS, 60000);
}
