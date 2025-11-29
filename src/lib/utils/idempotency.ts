import { get, set, del } from "idb-keyval";

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface IdempotencyRecord {
  response: unknown;
  timestamp: number;
}

// Server-side: Check if request was already processed
export async function checkIdempotency(key: string): Promise<unknown | null> {
  const record: IdempotencyRecord | undefined = await get(`idem_${key}`);

  if (!record) return null;

  // Expired?
  if (Date.now() - record.timestamp > IDEMPOTENCY_TTL) {
    await del(`idem_${key}`);
    return null;
  }

  return record.response;
}

// Server-side: Store successful response
export async function storeIdempotency(
  key: string,
  response: unknown,
): Promise<void> {
  await set(`idem_${key}`, {
    response,
    timestamp: Date.now(),
  });
}

// Client-side: Generate idempotency key
export function generateIdempotencyKey(): string {
  return `${Date.now()}_${crypto.randomUUID()}`;
}
