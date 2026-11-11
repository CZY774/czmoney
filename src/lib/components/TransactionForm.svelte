<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { queueTransaction, clearTransactionCache } from "$lib/services/sync";
  import { generateIdempotencyKey } from "$lib/utils/idempotency";
  import { toast } from "$lib/stores/toast";
  import { localDateString } from "$lib/utils/localDate";

  export let isOpen = false;
  export let transaction: {
    id?: string;
    txn_date: string;
    category_id?: string;
    type: string;
    amount: number;
    description?: string;
  } | null = null;

  const dispatch = createEventDispatcher();

  let form = {
    txn_date: localDateString(),
    category_id: "",
    type: "expense",
    amount: "",
    description: "",
  };

  let categories: Array<{
    id: string;
    name: string;
    type: string;
    user_id: string;
  }> = [];
  let loading = false;
  let user: { id: string } | null = null;
  let isOffline = false;

  function handleOnline() {
    isOffline = false;
  }

  function handleOffline() {
    isOffline = true;
  }

  onMount(() => {
    let disposed = false;
    async function initializeForm() {
      const { data } = await supabase.auth.getSession();
      if (disposed) return;
      user = data.session?.user || null;

      if (user) {
        await loadCategories();
      }
      if (disposed) return;

      // Monitor online status
      isOffline = !navigator.onLine;
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    void initializeForm();

    return () => {
      disposed = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  });

  $: filteredCategories = categories.filter((cat) => cat.type === form.type);

  // Watch for transaction changes (editing mode)
  $: if (transaction && transaction !== null) {
    form = {
      txn_date: transaction.txn_date,
      category_id: transaction.category_id || "",
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description || "",
    };
  }

  async function loadCategories() {
    if (!user) return;
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (data) {
      categories = data;
    }
  }

  async function handleSubmit() {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!form.description || form.description.trim().length < 3) {
      toast.error("Please add a description (min 3 characters)");
      return;
    }

    if (!user || loading) return;

    loading = true;

    try {
      const transactionData: Record<string, string | number | undefined> = {
        ...form,
        amount: parseFloat(form.amount),
        user_id: user.id,
      };

      // Include ID for updates
      const isEdit = !!transaction?.id;
      if (isEdit && transaction) {
        transactionData.id = transaction.id;
      }

      // Optimistic UI - dispatch immediately with proper ID
      const optimisticData = {
        ...transactionData,
        id: transaction?.id || `temp-${Date.now()}`,
        categories: form.category_id
          ? categories.find((c) => c.id === form.category_id)
          : null,
      };
      dispatch("success", optimisticData);
      closeModal();

      // Show immediate feedback
      const msg = isEdit ? "Updating transaction..." : "Adding transaction...";
      toast.info(msg);

      if (isOffline) {
        // Queue for offline sync
        const action = isEdit ? "update" : "create";
        await queueTransaction(action, transactionData);
        toast.success("Transaction saved offline. Will sync when online.");
        return;
      }

      // Online - save to API in background
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (!token) {
        throw new Error("Authentication required");
      }

      const method = isEdit ? "PUT" : "POST";
      const idempotencyKey = generateIdempotencyKey();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch("/api/transactions", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey,
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(transactionData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      // Success - update with real data
      await clearTransactionCache();
      window.dispatchEvent(
        new CustomEvent("transactionUpdated", { detail: result.data }),
      );

      const successMsg = isEdit ? "Transaction updated!" : "Transaction added!";
      toast.success(successMsg);
    } catch (error) {
      console.error("Transaction save failed:", error);

      if (error instanceof Error && error.name === "AbortError") {
        toast.error("Request timed out. Please try again.");
      } else {
        toast.error(
          `Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } finally {
      loading = false;
    }
  }

  function closeModal() {
    isOpen = false;
    form = {
      txn_date: localDateString(),
      category_id: "",
      type: "expense",
      amount: "",
      description: "",
    };
    dispatch("close");
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-6">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="txn-form-title"
      class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-background sm:rounded-2xl"
    >
      <h2 id="txn-form-title" class="flex flex-none items-baseline gap-3 px-5 pt-5 text-lg font-semibold tracking-tight sm:px-6 sm:pt-6">
        {transaction ? "Edit transaction" : "Add transaction"}
        {#if isOffline}
          <span class="text-xs font-normal text-warning">Offline, saved on this device first</span>
        {/if}
      </h2>

      <form on:submit|preventDefault={handleSubmit} class="mt-5 flex min-h-0 flex-1 flex-col">
        <!-- Only the fields scroll. The buttons sit below them, so Cancel and Add
             stay on screen when the sheet is taller than the viewport (a phone in
             landscape is about 375px high). -->
        <div class="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 pb-5 sm:px-6">
          <div>
            <label for="txn-date" class="mb-1.5 block text-xs text-ink-2">Date</label>
            <input id="txn-date" type="date" bind:value={form.txn_date} required class="w-full h-11 rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground" />
          </div>

          <div>
            <label for="txn-type" class="mb-1.5 block text-xs text-ink-2">Type</label>
            <select id="txn-type" bind:value={form.type} required class="w-full h-11 rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label for="txn-category" class="mb-1.5 block text-xs text-ink-2">Category</label>
            <select id="txn-category" bind:value={form.category_id} class="w-full h-11 rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground">
              <option value="">No category</option>
              {#each filteredCategories as category (category.id)}
                <option value={category.id}>{category.name}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="txn-amount" class="mb-1.5 block text-xs text-ink-2">Amount (IDR)</label>
            <input
              id="txn-amount"
              type="number"
              bind:value={form.amount}
              min="0"
              step="1"
              inputmode="numeric"
              placeholder="0"
              required
              class="w-full h-11 rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground amt"
            />
          </div>

          <div>
            <label for="txn-description" class="mb-1.5 block text-xs text-ink-2">Description</label>
            <input
              id="txn-description"
              type="text"
              bind:value={form.description}
              placeholder="For example, bus ticket Jakarta to Bandung"
              required
              minlength="3"
              class="w-full h-11 rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground"
            />
            <p class="mt-1.5 text-xs text-ink-3">A specific description gives the AI insights more to work with.</p>
          </div>
        </div>

        <div class="flex flex-none gap-2 border-t border-border px-5 pt-4 pb-[calc(20px+env(safe-area-inset-bottom,0px))] sm:justify-end sm:px-6 sm:pb-6">
          <button
            type="button"
            on:click={closeModal}
            class="min-h-11 flex-1 rounded-lg border border-rule-strong px-5 text-sm hover:bg-accent sm:flex-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            class="min-h-11 flex-1 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/85 disabled:opacity-50 active:scale-[0.98] sm:flex-none"
          >
            {loading ? "Saving" : transaction ? "Update" : "Add"}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
