import { Redis } from "@upstash/redis";
import { CACHE_TTL } from "$lib/config/constants";

interface IdempotencyRecord {
  response: unknown;
  timestamp: number;
}

// Redis client for persistent storage
let redis: Redis | null = null;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (redisUrl && redisToken) {
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
}

// Fallback in-memory store for development
const memoryStore = new Map<string, IdempotencyRecord>();

// Server-side: Check if request was already processed
export async function checkIdempotency(key: string): Promise<unknown | null> {
  const cacheKey = `idem_${key}`;

  if (redis) {
    try {
      const cached = await redis.get<IdempotencyRecord>(cacheKey);
      return cached?.response || null;
    } catch (error) {
      console.error("Redis idempotency check failed:", error);
      // Fallback to memory
    }
  }

  // Memory fallback
  const record = memoryStore.get(cacheKey);
  if (!record) return null;

  // Check expiry
  if (Date.now() - record.timestamp > CACHE_TTL.IDEMPOTENCY * 1000) {
    memoryStore.delete(cacheKey);
    return null;
  }

  return record.response;
}

// Server-side: Store successful response
export async function storeIdempotency(
  key: string,
  response: unknown,
): Promise<void> {
  const cacheKey = `idem_${key}`;
  const record: IdempotencyRecord = {
    response,
    timestamp: Date.now(),
  };

  if (redis) {
    try {
      await redis.setex(cacheKey, CACHE_TTL.IDEMPOTENCY, record);
      return;
    } catch (error) {
      console.error("Redis idempotency store failed:", error);
      // Fallback to memory
    }
  }

  // Memory fallback
  memoryStore.set(cacheKey, record);
}
