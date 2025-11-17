import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "$env/dynamic/private";

let ratelimit: Ratelimit | null = null;

// Initialize rate limiter only if Redis credentials exist
if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
    analytics: true,
  });
}

// Fallback in-memory rate limiter for development
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryRateLimit(identifier: string, limit = 10, window = 10000) {
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
  return memoryRateLimit(identifier);
}

export async function checkAIRateLimit(identifier: string) {
  // Stricter limit for AI endpoints (expensive)
  if (ratelimit) {
    const aiLimiter = new Ratelimit({
      redis: new Redis({
        url: env.UPSTASH_REDIS_REST_URL!,
        token: env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(3, "60 s"), // 3 requests per minute
    });
    const { success, remaining } = await aiLimiter.limit(`ai:${identifier}`);
    return { success, remaining };
  }
  
  return memoryRateLimit(`ai:${identifier}`, 3, 60000);
}
