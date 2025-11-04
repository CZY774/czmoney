<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { queueTransaction, clearTransactionCache } from "$lib/services/sync";

  export let isOpen = false;
  export let transaction: any = null; // For editing

  const dispatch = createEventDispatcher();

  let form = {
    txn_date: new Date().toISOString().split("T")[0],
    category_id: "",
    type: "expense",
    amount: "",
    description: "",
  };

  let categories: any[] = [];
  let loading = false;
  let user: any = null;
  let isOffline = false;

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user;

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

    loading = true;

    try {
      const transactionData: any = {
        ...form,
        amount: parseFloat(form.amount),
        user_id: user.id,
      };

      if (transaction) {
        transactionData.id = transaction.id;
      }

      if (isOffline) {
        // Queue for offline sync
        const action = transaction ? "update" : "create";
        await queueTransaction(action, transactionData);

        // Notify dashboard to refresh
        localStorage.setItem('transaction_updated', Date.now().toString());

        dispatch("success", { ...transactionData, _pending: true });
        alert("Transaction saved offline. Will sync when online.");
        closeModal();
      } else {
        // Online - use API
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;

        const method = transaction ? "PUT" : "POST";
        const body = transaction ? transactionData : transactionData;

        const response = await fetch("/api/transactions", {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        const result = await response.json();

        if (response.ok) {
          // Clear cache to force fresh data
          await clearTransactionCache();
          
          // Notify dashboard to refresh
          localStorage.setItem('transaction_updated', Date.now().toString());
          
          dispatch("success", result.data);
          closeModal();
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
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-card rounded-lg p-6 w-full max-w-md">
      <h2 class="text-xl font-semibold mb-4">
        {transaction ? "Edit Transaction" : "Add Transaction"}
        {#if isOffline}
          <span class="text-sm text-orange-500 ml-2">(Offline Mode)</span>
        {/if}
      </h2>

      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        <div>
          <label for="txn-date" class="block text-sm font-medium mb-1"
            >Date</label
          >
          <input
            id="txn-date"
            type="date"
            bind:value={form.txn_date}
            class="w-full p-2 border border-border rounded bg-background"
            required
            style="color-scheme: dark;"
            
          />
        </div>

        <div>
          <label for="txn-type" class="block text-sm font-medium mb-1"
            >Type</label
          >
          <select
            id="txn-type"
            bind:value={form.type}
            class="w-full p-2 border border-border rounded bg-background"
            required
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        <div>
          <label for="txn-category" class="block text-sm font-medium mb-1"
            >Category</label
          >
          <select
            id="txn-category"
            bind:value={form.category_id}
            class="w-full p-2 border border-border rounded bg-background"
          >
            <option value="">No Category</option>
            {#each filteredCategories as category}
              <option value={category.id}>{category.name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="txn-amount" class="block text-sm font-medium mb-1"
            >Amount (IDR)</label
          >
          <input
            id="txn-amount"
            type="number"
            bind:value={form.amount}
            min="0"
            step="1"
            inputmode="numeric"
            class="w-full p-2 border border-border rounded bg-background"
            placeholder="0"
            required
            style="color-scheme: dark;"
          />
        </div>

        <div>
          <label for="txn-description" class="block text-sm font-medium mb-1"
            >Description</label
          >
          <input
            id="txn-description"
            type="text"
            bind:value={form.description}
            class="w-full p-2 border border-border rounded bg-background"
            placeholder="Optional description"
          />
        </div>

        <div class="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Saving..." : transaction ? "Update" : "Add"}
          </button>
          <button
            type="button"
            on:click={closeModal}
            class="px-4 py-2 border border-border rounded hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
