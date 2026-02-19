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
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Start with 1s, exponential backoff

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
  return id;
}

// Exponential backoff delay
function getRetryDelay(retryCount: number): number {
  return RETRY_DELAY_MS * Math.pow(2, retryCount);
}

// Process all pending transactions with retry logic
export async function syncPendingTransactions() {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const pendingKeys = await keys();
  const pendingIds = pendingKeys.filter((key) =>
    key.toString().startsWith("pending_"),
  );

  let synced = 0;
  let failed = 0;

  for (const key of pendingIds) {
    try {
      const pending: PendingTransaction | undefined = await get(key);
      if (!pending) continue;

      // Check if max retries exceeded
      if ((pending.retryCount || 0) >= MAX_RETRIES) {
        logError(
          new Error(`Max retries exceeded for ${pending.action}`),
          "Sync",
        );
        await del(key); // Remove from queue
        failed++;
        continue;
      }

      // Get auth token
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (!token) {
        failed++;
        continue;
      }

      let success = false;

      switch (pending.action) {
        case "create": {
          const response = await fetch("/api/transactions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "Idempotency-Key": pending.idempotencyKey,
            },
            body: JSON.stringify(pending.data),
          });
          success = response.ok;
          break;
        }

        case "update": {
          const response = await fetch("/api/transactions", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "Idempotency-Key": pending.idempotencyKey,
            },
            body: JSON.stringify(pending.data),
          });
          success = response.ok;
          break;
        }

        case "delete": {
          const response = await fetch("/api/transactions", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ id: pending.data.id }),
          });
          success = response.ok;
          break;
        }
      }

      if (success) {
        await del(key);
        synced++;
      } else {
        // Increment retry count and save back
        pending.retryCount = (pending.retryCount || 0) + 1;
        await set(key, pending);

        // Wait before next retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, getRetryDelay(pending.retryCount!)),
        );

        failed++;
      }
    } catch (error) {
      logError(error, "Sync Transaction");
      failed++;
    }
  }

  return { synced, failed };
}

// Get sync status
export async function getSyncStatus() {
  const pendingKeys = await keys();
  const pendingCount = pendingKeys.filter((key) =>
    key.toString().startsWith("pending_"),
  ).length;

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

// Clear cached transactions (called after mutations)
export async function clearTransactionCache() {
  await del("cached_transactions");
  window.dispatchEvent(new CustomEvent("transactionUpdated"));
}

// Auto-sync when online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    syncPendingTransactions().then(() => {
      set("lastSync", Date.now());
      // Clear cache to force fresh data fetch
      clearTransactionCache();
    });
  });
}
