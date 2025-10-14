import { get, set, keys, del } from "idb-keyval";
import { supabase } from "./supabase";

const PENDING_QUEUE = "pending_transactions";
const CACHE_PREFIX = "txn_cache_";

// Enqueue a transaction for later sync when offline
export async function enqueuePendingTransaction(transaction) {
  try {
    const queue = (await get(PENDING_QUEUE)) || [];
    queue.push({
      ...transaction,
      local_id: crypto.randomUUID(),
      timestamp: Date.now(),
    });
    await set(PENDING_QUEUE, queue);
    return true;
  } catch (error) {
    console.error("Error enqueueing transaction:", error);
    return false;
  }
}

// Process pending transactions queue
export async function processPendingQueue(userId) {
  if (!navigator.onLine) {
    console.log("Offline: skipping sync");
    return { success: false, message: "Offline" };
  }

  try {
    const queue = (await get(PENDING_QUEUE)) || [];
    if (queue.length === 0) {
      return { success: true, synced: 0 };
    }

    const results = [];
    for (const transaction of queue) {
      try {
        const { local_id, timestamp, ...txnData } = transaction;
        const { data, error } = await supabase
          .from("transactions")
          .insert([{ ...txnData, user_id: userId }])
          .select()
          .single();

        if (!error) {
          results.push({ success: true, local_id });
        } else {
          console.error("Sync error:", error);
          results.push({ success: false, local_id, error });
        }
      } catch (err) {
        console.error("Transaction sync failed:", err);
      }
    }

    // Remove successfully synced items
    const successIds = results.filter((r) => r.success).map((r) => r.local_id);
    const remaining = queue.filter((q) => !successIds.includes(q.local_id));
    await set(PENDING_QUEUE, remaining);

    return {
      success: true,
      synced: successIds.length,
      remaining: remaining.length,
    };
  } catch (error) {
    console.error("Queue processing error:", error);
    return { success: false, error: error.message };
  }
}

// Cache transactions for offline reading
export async function cacheTransactions(userId, months = 3) {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("txn_date", startDate.toISOString().split("T")[0])
      .order("txn_date", { ascending: false });

    if (error) throw error;

    const cacheKey = `${CACHE_PREFIX}${userId}`;
    await set(cacheKey, {
      data,
      cached_at: Date.now(),
    });

    return { success: true, count: data.length };
  } catch (error) {
    console.error("Cache error:", error);
    return { success: false, error: error.message };
  }
}

// Get cached transactions
export async function getCachedTransactions(userId) {
  try {
    const cacheKey = `${CACHE_PREFIX}${userId}`;
    const cached = await get(cacheKey);

    if (!cached) return null;

    // Check if cache is less than 24 hours old
    const cacheAge = Date.now() - cached.cached_at;
    if (cacheAge > 24 * 60 * 60 * 1000) {
      return null; // Cache expired
    }

    return cached.data;
  } catch (error) {
    console.error("Error reading cache:", error);
    return null;
  }
}

// Check pending queue status
export async function getPendingCount() {
  try {
    const queue = (await get(PENDING_QUEUE)) || [];
    return queue.length;
  } catch (error) {
    return 0;
  }
}

// Setup online/offline listeners
export function setupSyncListeners(userId) {
  window.addEventListener("online", async () => {
    console.log("Back online - syncing...");
    const result = await processPendingQueue(userId);
    if (result.success) {
      console.log(`Synced ${result.synced} transactions`);
    }
  });

  window.addEventListener("offline", () => {
    console.log("Gone offline - queueing changes");
  });
}
