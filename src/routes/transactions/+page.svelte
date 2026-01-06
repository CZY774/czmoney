<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import TransactionForm from "$lib/components/TransactionForm.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { clearTransactionCache } from "$lib/services/sync";
  import { debounce } from "$lib/utils/perf";
  import { toast } from "$lib/stores/toast";
  import Skeleton from "$lib/components/Skeleton.svelte";

  let user: { id: string } | null = null;
  let transactions: Array<Record<string, unknown>> = [];
  let categories: Array<{ id: string; name: string; type: string }> = [];
  let dataLoading = true;
  let showForm = false;
  let editingTransaction: { id?: string; txn_date: string; category_id?: string; type: string; amount: number; description?: string } | null = null;
  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
  let showDeleteConfirm = false;
  let transactionToDelete: string | null = null;

  // Filters
  let filters = {
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    category: "",
    type: "",
    search: "",
  };

  const debouncedLoadTransactions = debounce(loadTransactions, 300);

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user || null;

    if (!user) {
      goto(resolve("/auth/login"));
      return;
    }

    loadCategories();
    loadTransactions();

    realtimeChannel = supabase
      .channel('transactions-list')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        () => loadTransactions()
      )
      .subscribe();
  });

  onDestroy(() => {
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
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
    dataLoading = true;
    if (!user) return;

    const [year, month] = filters.month.split("-");
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate().toString().padStart(2, '0')}`;

    let query = supabase
      .from("transactions")
      .select("*, categories(name)")
      .eq("user_id", user.id)
      .gte("txn_date", startDate)
      .lte("txn_date", endDate);

    if (filters.category) {
      query = query.eq("category_id", filters.category);
    }

    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.search) {
      query = query.ilike("description", `%${filters.search}%`);
    }

    const { data } = await query.order("txn_date", { ascending: false });

    transactions = data || [];
    dataLoading = false;
  }

  function confirmDelete(id: string) {
    transactionToDelete = id;
    showDeleteConfirm = true;
  }

  async function deleteTransaction() {
    if (!transactionToDelete) return;

    const id = transactionToDelete;
    const targetTransaction = transactions.find(t => t.id === id);
    
    if (!targetTransaction) {
      toast.error("Transaction not found");
      return;
    }

    // Store backup for rollback
    const backup = [...transactions];

    // Optimistic delete
    transactions = transactions.filter(t => t.id !== id);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (!token) {
        throw new Error("No auth token");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch("/api/transactions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ id }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      // Success - clear cache and notify
      await clearTransactionCache();
      window.dispatchEvent(new CustomEvent('transactionUpdated'));
      toast.success("Transaction deleted successfully");
      
    } catch (error) {
      // Rollback on any error
      transactions = backup;
      console.error("Delete failed:", error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error("Delete request timed out. Please try again.");
      } else {
        toast.error(`Failed to delete transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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

  async function handleFormSuccess(event: CustomEvent) {
    const txn = event.detail;
    
    // Optimistic update - add/update immediately
    if (editingTransaction?.id) {
      transactions = transactions.map(t => t.id === txn.id ? { ...t, ...txn } : t);
    } else {
      transactions = [txn, ...transactions];
    }
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
    filters.type !== undefined ||
    filters.search !== undefined
  ) {
    if (user) debouncedLoadTransactions();
  }
</script>

<svelte:head>
  <title>Transactions - CZmoneY</title>
</svelte:head>

<div class="space-y-4 sm:space-y-6">
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
    <h1 class="text-2xl sm:text-3xl font-bold">Transactions</h1>
    <button
      on:click={openAddForm}
      class="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
    >
      Add Transaction
    </button>
  </div>

  <!-- Filters -->
  <div class="bg-card p-3 sm:p-4 rounded-lg border">
    <h2 class="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Filters</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <div>
        <label for="filter-month" class="block text-xs sm:text-sm font-medium mb-1"
          >Month</label
        >
        <input
          id="filter-month"
          type="month"
          bind:value={filters.month}
          class="w-full p-2 text-sm sm:text-base border border-border rounded bg-background"
          style="color-scheme: dark;"
        />
      </div>

      <div>
        <label for="filter-category" class="block text-xs sm:text-sm font-medium mb-1"
          >Category</label
        >
        <select
          id="filter-category"
          bind:value={filters.category}
          class="w-full p-2 text-sm sm:text-base border border-border rounded bg-background"
        >
          <option value="">All Categories</option>
          {#each categories as category (category.id)}
            <option value={category.id}>{category.name}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="filter-type" class="block text-xs sm:text-sm font-medium mb-1"
          >Type</label
        >
        <select
          id="filter-type"
          bind:value={filters.type}
          class="w-full p-2 text-sm sm:text-base border border-border rounded bg-background"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <div>
        <label for="filter-search" class="block text-xs sm:text-sm font-medium mb-1"
          >Search</label
        >
        <input
          id="filter-search"
          type="text"
          bind:value={filters.search}
          placeholder="Search description..."
          class="w-full p-2 text-sm sm:text-base border border-border rounded bg-background"
        />
      </div>
    </div>
  </div>

  <!-- Transactions List -->
  <div class="bg-card rounded-lg border">
    {#if dataLoading}
      <div class="p-4">
        <Skeleton type="list" count={5} />
      </div>
    {:else if transactions.length === 0}
      <div class="p-6 sm:p-8 text-center">
        <p class="text-muted-foreground mb-4 text-sm sm:text-base">No transactions found</p>
        <button
          on:click={openAddForm}
          class="px-4 py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Add Your First Transaction
        </button>
      </div>
    {:else}
      <div class="divide-y divide-border">
        {#each transactions as transaction (transaction.id)}
          <div class="p-3 sm:p-4 hover:bg-accent/50">
            <div class="flex gap-2 sm:gap-3">
              <div
                class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mt-1 flex-shrink-0 {transaction.type === 'income'
                  ? 'bg-green-500'
                  : 'bg-red-500'}"
              ></div>
              
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm sm:text-base break-words">
                  {transaction.description || "No description"}
                </p>
                <p class="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {getCategoryName(transaction.category_id as string)} • {new Date(
                    transaction.txn_date as string
                  ).toLocaleDateString()}
                </p>
                
                <div class="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <p
                    class="font-semibold text-sm sm:text-base {transaction.type === 'income'
                      ? 'text-green-500'
                      : 'text-red-500'}"
                  >
                    {transaction.type === "income" ? "+" : "-"}{formatCurrency(
                      transaction.amount as number
                    )}
                  </p>
                  
                  <div class="flex gap-2">
                    <button
                      on:click={() => openEditForm(transaction)}
                      class="px-2.5 py-1 text-xs sm:text-sm border border-border rounded hover:bg-accent"
                    >
                      Edit
                    </button>
                    <button
                      on:click={() => confirmDelete(transaction.id as string)}
                      class="px-2.5 py-1 text-xs sm:text-sm text-destructive border border-destructive rounded hover:bg-destructive hover:text-destructive-foreground"
                    >
                      Delete
                    </button>
                  </div>
                </div>
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

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
  bind:open={showDeleteConfirm}
  title="Delete Transaction"
  message="Are you sure you want to delete this transaction? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  danger={true}
  on:confirm={deleteTransaction}
  on:cancel={() => {
    transactionToDelete = null;
  }}
/>
