import { get, set, del, keys } from "idb-keyval";
import { supabase } from "./supabase";
import { generateIdempotencyKey } from "$lib/utils/idempotency";
import { logError } from "./errorHandler";

interface PendingTransaction {
  id: string;
  idempotencyKey: string;
  data: Record<string, unknown>;
  action: "create" | "update" | "delete";
  timestamp: number;
  retryCount?: number;
  lastError?: string;
}

export interface PendingItem {
  id: string;
  action: "create" | "update" | "delete";
  data: Record<string, unknown>;
  retryCount: number;
  lastError?: string;
  timestamp: number;
}

export interface SyncResult {
  synced: number;
  failed: number;
}

// Queue transaction for offline sync
export async function queueTransaction(
  action: "create" | "update" | "delete",
  data: Record<string, unknown>,
) {
  const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const idempotencyKey = generateIdempotencyKey();

  const pending: PendingTransaction = {
    id,
    idempotencyKey,
    data,
    action,
    timestamp: Date.now(),
    retryCount: 0,
  };

  await set(id, pending);
  notifyQueueChanged();
  return id;
}

function notifyQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("syncStatusChanged"));
  }
}

function isPendingKey(key: IDBValidKey): boolean {
  return key.toString().startsWith("pending_");
}

// Items are never removed here. A failed item keeps its place in the queue
// and is retried on the next run. If the item was discarded while the request
// was in flight, it is not written back.
async function recordFailure(
  key: string,
  pending: PendingTransaction,
  lastError: string,
) {
  if ((await get(key)) === undefined) return;
  pending.retryCount = (pending.retryCount || 0) + 1;
  pending.lastError = lastError;
  await set(key, pending);
}

async function sendPending(
  pending: PendingTransaction,
  token: string,
): Promise<Response> {
  switch (pending.action) {
    case "create":
      return fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": pending.idempotencyKey,
        },
        body: JSON.stringify(pending.data),
      });
    case "update":
      return fetch("/api/transactions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": pending.idempotencyKey,
        },
        body: JSON.stringify(pending.data),
      });
    case "delete":
      return fetch("/api/transactions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: pending.data.id }),
      });
  }
}

// Sends one queued item. Returns true when it was accepted and removed.
async function syncOne(key: string): Promise<boolean> {
  let pending: PendingTransaction | undefined;
  try {
    pending = await get<PendingTransaction>(key);
    if (!pending) return false;

    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      await recordFailure(key, pending, "Not signed in");
      return false;
    }

    const response = await sendPending(pending, token);
    if (response.ok) {
      await del(key);
      return true;
    }

    await recordFailure(key, pending, `HTTP ${response.status}`);
    return false;
  } catch (error) {
    logError(error, "Sync Transaction");
    if (pending) {
      const message = error instanceof Error ? error.message : String(error);
      await recordFailure(key, pending, message).catch(() => undefined);
    }
    return false;
  }
}

let inFlight: Promise<SyncResult> | null = null;

async function runSync(): Promise<SyncResult> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const pendingKeys = (await keys()).filter(isPendingKey).map(String);

  let synced = 0;
  let failed = 0;
  for (const key of pendingKeys) {
    if (await syncOne(key)) synced++;
    else failed++;
  }

  notifyQueueChanged();
  return { synced, failed };
}

// Process all pending transactions. A run that is already in progress is
// shared rather than started again.
export function syncPendingTransactions(): Promise<SyncResult> {
  if (!inFlight) {
    inFlight = runSync().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

// All queued items, oldest first
export async function listPendingTransactions(): Promise<PendingItem[]> {
  const pendingKeys = (await keys()).filter(isPendingKey).map(String);
  const entries = await Promise.all(
    pendingKeys.map((key) => get<PendingTransaction>(key)),
  );

  return entries
    .filter((p): p is PendingTransaction => !!p)
    .map((p) => ({
      id: p.id,
      action: p.action,
      data: p.data,
      retryCount: p.retryCount || 0,
      lastError: p.lastError,
      timestamp: p.timestamp,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

// Sends one queued item again. Returns false when offline or when it fails.
// Waits for a run in progress first, so the same item is never sent twice.
export async function retryPendingTransaction(id: string): Promise<boolean> {
  if (!navigator.onLine) return false;
  if (inFlight) await inFlight;
  if ((await get(id)) === undefined) {
    // The run that just finished already sent it
    notifyQueueChanged();
    return true;
  }
  const ok = await syncOne(id);
  notifyQueueChanged();
  return ok;
}

// Removes one queued item without sending it
export async function discardPendingTransaction(id: string) {
  await del(id);
  notifyQueueChanged();
}

// Get sync status
export async function getSyncStatus() {
  const pendingKeys = await keys();
  const pendingCount = pendingKeys.filter(isPendingKey).length;

  return {
    pending: pendingCount,
    lastSync: (await get("lastSync")) || null,
  };
}

// Cache transactions for offline viewing
export async function cacheTransactions(
  transactions: Array<Record<string, unknown>>,
) {
  await set("cached_transactions", {
    data: transactions,
    timestamp: Date.now(),
  });
}

// Clear all caches (called after mutations)
export async function clearTransactionCache() {
  await del("cached_transactions");
  await del("cached_dashboard");
  window.dispatchEvent(new CustomEvent("transactionUpdated"));
}
