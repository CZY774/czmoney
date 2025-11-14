import { get, set, del, keys } from "idb-keyval";
import { supabase } from "./supabase";

interface PendingTransaction {
  id: string;
  data: Record<string, unknown>;
  action: "create" | "update" | "delete";
  timestamp: number;
}

// Queue transaction for offline sync
export async function queueTransaction(
  action: "create" | "update" | "delete",
  data: Record<string, unknown>,
) {
  const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const pending: PendingTransaction = {
    id,
    data,
    action,
    timestamp: Date.now(),
  };

  await set(id, pending);
  return id;
}

// Process all pending transactions
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

      let success = false;

      switch (pending.action) {
        case "create": {
          const { error: createError } = await supabase
            .from("transactions")
            .insert([pending.data]);
          success = !createError;
          break;
        }

        case "update": {
          const { error: updateError } = await supabase
            .from("transactions")
            .update(pending.data)
            .eq("id", pending.data.id);
          success = !updateError;
          break;
        }

        case "delete": {
          const { error: deleteError } = await supabase
            .from("transactions")
            .delete()
            .eq("id", pending.data.id);
          success = !deleteError;
          break;
        }
      }

      if (success) {
        await del(key);
        synced++;
      } else {
        failed++;
      }
    } catch {
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

// Get cached transactions
export async function getCachedTransactions() {
  const cached = await get("cached_transactions");
  if (!cached) return [];

  // No cache for mutations - always return empty to force fresh fetch
  // Cache only useful for offline mode
  return [];
}

// Clear cached transactions (called after mutations)
export async function clearTransactionCache() {
  await del("cached_transactions");
  // Trigger dashboard refresh
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
