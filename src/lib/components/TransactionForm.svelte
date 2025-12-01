<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { queueTransaction, clearTransactionCache } from "$lib/services/sync";
  import { generateIdempotencyKey } from "$lib/utils/idempotency";

  export let isOpen = false;
  export let transaction: { id?: string; txn_date: string; category_id?: string; type: string; amount: number; description?: string } | null = null;

  const dispatch = createEventDispatcher();

  let form = {
    txn_date: new Date().toISOString().split("T")[0],
    category_id: "",
    type: "expense",
    amount: "",
    description: "",
  };

  let categories: Array<{ id: string; name: string; type: string; user_id: string }> = [];
  let loading = false;
  let user: { id: string } | null = null;
  let isOffline = false;

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user || null;

    if (user) {
      await loadCategories();
    }

    // Monitor online status
    isOffline = !navigator.onLine;
    window.addEventListener("online", () => (isOffline = false));
    window.addEventListener("offline", () => (isOffline = true));
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
      alert("Please enter a valid amount");
      return;
    }

    if (!user) return;

    loading = true;

    try {
      const transactionData: Record<string, string | number | undefined> = {
        ...form,
        amount: parseFloat(form.amount),
        user_id: user.id,
      };

      if (transaction?.id) {
        transactionData.id = transaction.id;
      }

      if (isOffline) {
        // Queue for offline sync
        const action = transaction ? "update" : "create";
        await queueTransaction(action, transactionData);

        dispatch("success", { ...transactionData, _pending: true });
        alert("Transaction saved offline. Will sync when online.");
        closeModal();
      } else {
        // Online - save to API
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;

        const method = transaction ? "PUT" : "POST";

        const response = await fetch("/api/transactions", {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "Idempotency-Key": generateIdempotencyKey(),
          },
          body: JSON.stringify(transactionData),
        });

        const result = await response.json();

        if (response.ok) {
          await clearTransactionCache();
          
          // Notify all listeners
          dispatch("success", result.data);
          window.dispatchEvent(new CustomEvent('transactionUpdated'));
          
          closeModal();
          
          // Show success message
          const msg = transaction ? "Transaction updated!" : "Transaction added!";
          const toast = document.createElement("div");
          toast.className = "fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50";
          toast.textContent = msg;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);
        } else {
          alert(result.error || "Failed to save transaction");
        }
      }
    } catch (error) {
      alert("Error saving transaction");
      console.error(error);
    } finally {
      loading = false;
    }
  }

  function closeModal() {
    isOpen = false;
    form = {
      txn_date: new Date().toISOString().split("T")[0],
      category_id: "",
      type: "expense",
      amount: "",
      description: "",
    };
    dispatch("close");
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4"
  >
    <div class="bg-card rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
      <h2 class="text-lg sm:text-xl font-semibold mb-4">
        {transaction ? "Edit Transaction" : "Add Transaction"}
        {#if isOffline}
          <span class="text-xs sm:text-sm text-orange-500 ml-2">(Offline)</span>
        {/if}
      </h2>

      <form on:submit|preventDefault={handleSubmit} class="space-y-3 sm:space-y-4">
        <div>
          <label for="txn-date" class="block text-xs sm:text-sm font-medium mb-1"
            >Date</label
          >
          <input
            id="txn-date"
            type="date"
            bind:value={form.txn_date}
            class="w-full p-2 text-sm sm:text-base border border-border rounded bg-background"
            required
            style="color-scheme: dark;"
          />
        </div>

        <div>
          <label for="txn-type" class="block text-xs sm:text-sm font-medium mb-1"
            >Type</label
          >
          <select
            id="txn-type"
            bind:value={form.type}
            class="w-full p-2 text-sm sm:text-base border border-border rounded bg-background"
            required
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        <div>
          <label for="txn-category" class="block text-xs sm:text-sm font-medium mb-1"
            >Category</label
          >
          <select
            id="txn-category"
            bind:value={form.category_id}
            class="w-full p-2 text-sm sm:text-base border border-border rounded bg-background"
          >
            <option value="">No Category</option>
            {#each filteredCategories as category (category.id)}
              <option value={category.id}>{category.name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="txn-amount" class="block text-xs sm:text-sm font-medium mb-1"
            >Amount (IDR)</label
          >
          <input
            id="txn-amount"
            type="number"
            bind:value={form.amount}
            min="0"
            step="1"
            inputmode="numeric"
            class="w-full p-2 text-sm sm:text-base border border-border rounded bg-background"
            placeholder="0"
            required
            style="color-scheme: dark;"
          />
        </div>

        <div>
          <label for="txn-description" class="block text-xs sm:text-sm font-medium mb-1"
            >Description</label
          >
          <input
            id="txn-description"
            type="text"
            bind:value={form.description}
            class="w-full p-2 text-sm sm:text-base border border-border rounded bg-background"
            placeholder="Optional description"
          />
        </div>

        <div class="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
          <button
            type="submit"
            disabled={loading}
            class="w-full sm:flex-1 px-4 py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-transform active:scale-95"
          >
            {loading ? "Saving..." : transaction ? "Update" : "Add"}
          </button>
          <button
            type="button"
            on:click={closeModal}
            class="w-full sm:w-auto px-4 py-2 text-sm sm:text-base border border-border rounded hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
