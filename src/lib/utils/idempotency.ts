// Client-side: Generate idempotency key
export function generateIdempotencyKey(): string {
  return `${Date.now()}_${crypto.randomUUID()}`;
}
