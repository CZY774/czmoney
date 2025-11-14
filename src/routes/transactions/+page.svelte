<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import TransactionForm from "$lib/components/TransactionForm.svelte";
  import { clearTransactionCache } from "$lib/services/sync";

  let user: { id: string } | null = null;
  let transactions: Array<Record<string, unknown>> = [];
  let categories: Array<{ id: string; name: string; type: string }> = [];
  let loading = true;
  let showForm = false;
  let editingTransaction: { id?: string; txn_date: string; category_id?: string; type: string; amount: number; description?: string } | null = null;

  // Filters
  let filters = {
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    category: "",
    type: "",
  };

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user || null;

    if (!user) {
      goto(resolve("/auth/login"));
      return;
    }

    await loadCategories();
    await loadTransactions();
    loading = false;
  });

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

  async function loadTransactions() {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;

    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const params = new URLSearchParams();
    if (filters.month) params.append("month", filters.month);
    if (filters.category) params.append("category", filters.category);
    if (filters.type) params.append("type", filters.type);

    const response = await fetch(`/api/transactions?${params}&_t=${Date.now()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
    });

    if (response.ok) {
      const result = await response.json();
      transactions = result.data || [];
    }
  }

  async function deleteTransaction(id: string) {
    if (!confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;

    const response = await fetch(`/api/transactions?_t=${Date.now()}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify({ id }),
    });

    if (response.ok) {
      // Clear cache to force fresh data
      await clearTransactionCache();
      
      await loadTransactions();
      
      // Notify dashboard
      window.dispatchEvent(new CustomEvent('transactionUpdated'));
    } else {
      alert("Failed to delete transaction");
    }
  }

  function openAddForm() {
    editingTransaction = null;
    showForm = true;
  }

  function openEditForm(transaction: Record<string, unknown>) {
    editingTransaction = transaction as { id?: string; txn_date: string; category_id?: string; type: string; amount: number; description?: string };
    showForm = true;
  }

  async function handleFormSuccess() {
    // Force immediate reload
    await clearTransactionCache();
    await loadTransactions();
    // Notify dashboard
    window.dispatchEvent(new CustomEvent('transactionUpdated'));
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  }

  function getCategoryName(categoryId: string) {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "No Category";
  }

  // Reload when filters change
  $: if (
    filters.month ||
    filters.category !== undefined ||
    filters.type !== undefined
  ) {
    if (user) loadTransactions();
  }
</script>

<svelte:head>
  <title>Transactions - CZmoneY</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-3xl font-bold">Transactions</h1>
    <button
      on:click={openAddForm}
      class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
    >
      Add Transaction
    </button>
  </div>

  <!-- Filters -->
  <div class="bg-card p-4 rounded-lg border">
    <h2 class="text-lg font-semibold mb-3">Filters</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label for="filter-month" class="block text-sm font-medium mb-1"
          >Month</label
        >
        <input
          id="filter-month"
          type="month"
          bind:value={filters.month}
          class="w-full p-2 border border-border rounded bg-background"
          style="color-scheme: dark;"
        />
      </div>

      <div>
        <label for="filter-category" class="block text-sm font-medium mb-1"
          >Category</label
        >
        <select
          id="filter-category"
          bind:value={filters.category}
          class="w-full p-2 border border-border rounded bg-background"
        >
          <option value="">All Categories</option>
          {#each categories as category (category.id)}
            <option value={category.id}>{category.name}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="filter-type" class="block text-sm font-medium mb-1"
          >Type</label
        >
        <select
          id="filter-type"
          bind:value={filters.type}
          class="w-full p-2 border border-border rounded bg-background"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Transactions List -->
  <div class="bg-card rounded-lg border">
    {#if loading}
      <div class="p-8 text-center">
        <div class="text-lg">Loading transactions...</div>
      </div>
    {:else if transactions.length === 0}
      <div class="p-8 text-center">
        <p class="text-muted-foreground mb-4">No transactions found</p>
        <button
          on:click={openAddForm}
          class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Add Your First Transaction
        </button>
      </div>
    {:else}
      <div class="divide-y divide-border">
        {#each transactions as transaction (transaction.id)}
          <div class="p-4 flex justify-between items-center hover:bg-accent/50">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <div
                  class="w-3 h-3 rounded-full {transaction.type === 'income'
                    ? 'bg-green-500'
                    : 'bg-red-500'}"
                ></div>
                <div>
                  <p class="font-medium">
                    {transaction.description || "No description"}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    {getCategoryName(transaction.category_id as string)} • {new Date(
                      transaction.txn_date as string
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <div class="text-right">
                <p
                  class="font-semibold {transaction.type === 'income'
                    ? 'text-green-500'
                    : 'text-red-500'}"
                >
                  {transaction.type === "income" ? "+" : "-"}{formatCurrency(
                    transaction.amount as number
                  )}
                </p>
                <p class="text-sm text-muted-foreground capitalize">
                  {transaction.type}
                </p>
              </div>

              <div class="flex gap-2">
                <button
                  on:click={() => openEditForm(transaction)}
                  class="px-3 py-1 text-sm border border-border rounded hover:bg-accent"
                >
                  Edit
                </button>
                <button
                  on:click={() => deleteTransaction(transaction.id as string)}
                  class="px-3 py-1 text-sm text-destructive border border-destructive rounded hover:bg-destructive hover:text-destructive-foreground"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Transaction Form Modal -->
<TransactionForm
  bind:isOpen={showForm}
  transaction={editingTransaction}
  on:success={handleFormSuccess}
  on:close={() => {
    showForm = false;
    editingTransaction = null;
  }}
/>
