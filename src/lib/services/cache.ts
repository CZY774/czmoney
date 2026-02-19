import { Redis } from "@upstash/redis";
import { CACHE_TTL } from "$lib/config/constants";
import { logError } from "./errorHandler";

let redis: Redis | null = null;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (redisUrl && redisToken) {
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
}

// In-memory fallback
const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

export async function getCached<T>(key: string): Promise<T | null> {
  if (redis) {
    try {
      const cached = await redis.get<T>(key);
      return cached;
    } catch (error) {
      logError(error, "Redis Get");
    }
  }

  // Memory fallback
  const cached = memoryCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data as T;
  }
  return null;
}

export async function setCached<T>(
  key: string,
  data: T,
  ttl: number = CACHE_TTL.IDEMPOTENCY,
): Promise<void> {
  if (redis) {
    try {
      await redis.setex(key, ttl, data);
      return;
    } catch (error) {
      logError(error, "Redis Set");
    }
  }

  // Memory fallback
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttl * 1000,
  });
}

export async function deleteCached(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(key);
      return;
    } catch (error) {
      logError(error, "Redis Delete");
    }
  }

  // Memory fallback
  memoryCache.delete(key);
}

export async function invalidatePattern(pattern: string): Promise<void> {
  if (redis) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return;
    } catch (error) {
      logError(error, "Redis Invalidate");
    }
  }

  // Memory fallback - simple prefix match
  const keysToDelete: string[] = [];
  memoryCache.forEach((_, key) => {
    if (key.startsWith(pattern.replace("*", ""))) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => memoryCache.delete(key));
}
