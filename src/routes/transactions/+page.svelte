<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { realtimeManager } from "$lib/services/realtimeManager";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import TransactionForm from "$lib/components/TransactionForm.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { clearTransactionCache, cacheTransactions } from "$lib/services/sync";
  import { debounce } from "$lib/utils/perf";
  import { toast } from "$lib/stores/toast";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { get } from "idb-keyval";
  import { localMonthString } from "$lib/utils/localDate";
  import { addTransactionRequested } from "$lib/stores/addTransaction";
  import { readPageCache, writePageCache } from "$lib/stores/pageCache";

  let user: { id: string } | null = null;
  let transactions: Array<Record<string, unknown>> = [];
  let categories: Array<{ id: string; name: string; type: string }> = [];
  let dataLoading = true;
  let showForm = false;
  let editingTransaction: {
    id?: string;
    txn_date: string;
    category_id?: string;
    type: string;
    amount: number;
    description?: string;
  } | null = null;
  let unsubscribe: (() => void) | null = null;
  let showDeleteConfirm = false;
  let transactionToDelete: string | null = null;
  let isDeleting = false; // Prevent race condition
  let pendingOperations = new SvelteSet<string>(); // Track operations in progress

  // Pagination
  let currentPage = 1;
  let totalPages = 1;
  let totalCount = 0;
  const pageSize = 50;

  // Filters
  let filters = {
    month: localMonthString(),
    category: "",
    type: "",
    search: "",
  };

  const debouncedLoadTransactions = debounce(loadTransactions, 300);

  onMount(() => {
    let disposed = false;
    async function initializeTransactions() {
      const { data } = await supabase.auth.getSession();
      // Unmounted while waiting: attach nothing, or the subscription would never be released.
      if (disposed) return;
      user = data.session?.user || null;

      if (!user) {
        goto(resolve("/auth/login"));
        return;
      }

      loadCategories();
      loadTransactions();

      unsubscribe = realtimeManager.subscribe(
        "transactions-list",
        "transactions",
        user.id,
        () => {
          // Debounce realtime updates to prevent race with optimistic updates
          setTimeout(() => {
            if (pendingOperations.size === 0) {
              loadTransactions();
            }
          }, 300);
        },
      );
    }

    void initializeTransactions();

    return () => {
      disposed = true;
      if (unsubscribe) unsubscribe();
    };
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
    if (!user) return;

    // Try loading from cache if offline
    if (!navigator.onLine) {
      const cached = await get('cached_transactions');
      if (cached && cached.data) {
        transactions = cached.data;
        dataLoading = false;
        toast.info('Showing cached data (offline)');
        return;
      }
    }

    // Same filters and page as a recent visit: show those rows now, refresh below
    const cacheKey = `transactions:${user.id}:${JSON.stringify(filters)}:${currentPage}`;
    const cached = readPageCache<{ transactions: typeof transactions; totalCount: number }>(cacheKey);
    if (cached) {
      transactions = [...cached.transactions];
      totalCount = cached.totalCount;
      totalPages = Math.ceil(totalCount / pageSize);
      dataLoading = false;
    } else {
      dataLoading = true;
    }

    const [year, month] = filters.month.split("-");
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate().toString().padStart(2, "0")}`;

    // Count total for pagination
    let countQuery = supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("txn_date", startDate)
      .lte("txn_date", endDate);

    if (filters.category) {
      countQuery = countQuery.eq("category_id", filters.category);
    }

    if (filters.type) {
      countQuery = countQuery.eq("type", filters.type);
    }

    if (filters.search) {
      countQuery = countQuery.ilike("description", `%${filters.search}%`);
    }

    // Fetch paginated data
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

    const [{ count }, { data }] = await Promise.all([
      countQuery,
      query
        .order("txn_date", { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1),
    ]);

    totalCount = count || 0;
    totalPages = Math.ceil(totalCount / pageSize);
    transactions = data || [];
    writePageCache(cacheKey, { transactions: [...transactions], totalCount });
    
    // Cache for offline use
    if (transactions.length > 0) {
      await cacheTransactions(transactions);
    }
    
    dataLoading = false;
  }

  function confirmDelete(id: string) {
    transactionToDelete = id;
    showDeleteConfirm = true;
  }

  async function deleteTransaction() {
    if (!transactionToDelete || isDeleting) return;

    isDeleting = true; // Prevent double-click
    const id = transactionToDelete;
    const targetTransaction = transactions.find((t) => t.id === id);

    if (!targetTransaction) {
      toast.error("Transaction not found");
      isDeleting = false;
      return;
    }

    // Store backup for rollback
    const backup = [...transactions];

    // Optimistic delete
    transactions = transactions.filter((t) => t.id !== id);

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
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({ id }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      // Success - clear cache and notify
      await clearTransactionCache();
      window.dispatchEvent(new CustomEvent("transactionUpdated"));
      toast.success("Transaction deleted successfully");
    } catch (error) {
      // Rollback on any error
      transactions = backup;
      console.error("Delete failed:", error);

      if (error instanceof Error && error.name === "AbortError") {
        toast.error("Delete request timed out. Please try again.");
      } else {
        toast.error(
          `Failed to delete transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } finally {
      isDeleting = false;
    }
  }

  function openAddForm() {
    editingTransaction = null;
    showForm = true;
  }

  // Opened from an "Add transaction" button, including the tab bar one while
  // this page is already open
  $: if ($addTransactionRequested) {
    addTransactionRequested.set(false);
    openAddForm();
  }

  function openEditForm(transaction: Record<string, unknown>) {
    editingTransaction = structuredClone(transaction) as { id?: string; txn_date: string; category_id?: string; type: string; amount: number; description?: string };
    showForm = true;
  }

  async function handleFormSuccess(event: CustomEvent) {
    const txn = event.detail;
    const operationId = txn.id || `temp-${Date.now()}`;

    // Mark operation as pending
    pendingOperations.add(operationId);

    // Optimistic update
    if (editingTransaction?.id) {
      // UPDATE: Replace existing transaction
      const editId = editingTransaction.id;
      transactions = transactions.map((t) =>
        t.id === editId ? { ...t, ...txn } : t,
      );
    } else {
      // CREATE: Add new transaction only if not already exists
      const exists = transactions.some((t) => t.id === operationId);
      if (!exists) {
        transactions = [txn, ...transactions];
      }
    }

    // Listen for real data from API to replace temp ID
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const realData = customEvent.detail;
      
      if (realData && operationId.startsWith('temp-')) {
        // Replace temp transaction with real one
        transactions = transactions.map((t) =>
          t.id === operationId ? { ...t, ...realData, id: realData.id } : t
        );
      }
      
      pendingOperations.delete(operationId);
    };

    window.addEventListener('transactionUpdated', handleUpdate, { once: true });

    // Cleanup after timeout
    setTimeout(() => {
      window.removeEventListener('transactionUpdated', handleUpdate);
      pendingOperations.delete(operationId);
    }, 2000);
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
    currentPage = 1; // Reset to page 1 on filter change
    if (user) debouncedLoadTransactions();
  }

  // Reload when page changes
  $: if (currentPage && user) {
    loadTransactions();
  }

  function nextPage() {
    if (currentPage < totalPages) {
      currentPage++;
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      currentPage--;
    }
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }

  // Day groups for the list. The query already orders by txn_date, newest first.
  $: dayGroups = transactions.reduce<Array<[string, Array<Record<string, unknown>>]>>(
    (days, t) => {
      const key = String(t.txn_date);
      const last = days[days.length - 1];
      if (last && last[0] === key) last[1].push(t);
      else days.push([key, [t]]);
      return days;
    },
    [],
  );

  function formatDay(key: string) {
    return new Date(`${key}T00:00:00`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  }
</script>

<svelte:head>
  <title>Transactions - CZmoneY</title>
</svelte:head>

<div class="mx-auto max-w-[1040px] space-y-8">
  <header class="flex flex-wrap items-center justify-between gap-4">
    <h1 class="text-xl font-semibold tracking-tight">Transactions</h1>
    <button
      type="button"
      on:click={openAddForm}
      class="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/85 active:scale-[0.98]"
    >
      Add transaction
    </button>
  </header>

  <!-- One filter row above the list. Every filter applies to the same list. -->
  <div class="grid grid-cols-1 gap-3 min-[21rem]:grid-cols-2 md:grid-cols-4">
    <div class="min-w-0">
      <label for="filter-month" class="mb-1.5 block text-xs text-ink-2">Month</label>
      <input
        id="filter-month"
        type="month"
        bind:value={filters.month}
        class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground"
      />
    </div>

    <div class="min-w-0">
      <label for="filter-category" class="mb-1.5 block text-xs text-ink-2">Category</label>
      <select
        id="filter-category"
        bind:value={filters.category}
        class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground"
      >
        <option value="">All categories</option>
        {#each categories as category (category.id)}
          <option value={category.id}>{category.name}</option>
        {/each}
      </select>
    </div>

    <div class="min-w-0">
      <label for="filter-type" class="mb-1.5 block text-xs text-ink-2">Type</label>
      <select
        id="filter-type"
        bind:value={filters.type}
        class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground"
      >
        <option value="">All types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </select>
    </div>

    <div class="min-w-0 min-[21rem]:col-span-2 md:col-span-1">
      <label for="filter-search" class="mb-1.5 block text-xs text-ink-2">Search</label>
      <input
        id="filter-search"
        type="text"
        bind:value={filters.search}
        placeholder="Search description"
        class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground placeholder:text-ink-3"
      />
    </div>
  </div>

  <section aria-label="Transaction list">
    {#if dataLoading}
      <Skeleton type="list" count={5} />
    {:else if transactions.length === 0}
      <div class="py-16 text-center">
        <p class="text-ink-2">No transactions found.</p>
        <button
          type="button"
          on:click={openAddForm}
          class="mt-4 text-sm text-blue-text underline-offset-4 hover:underline"
        >
          Add your first transaction
        </button>
      </div>
    {:else}
      <p class="pb-2 font-mono text-xs text-ink-3">{totalCount} {totalCount === 1 ? "transaction" : "transactions"}</p>

      {#each dayGroups as [day, items] (day)}
        <h3 class="pt-6 pb-2 font-mono text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase first:pt-0">
          {formatDay(day)}
        </h3>
        <ul>
          {#each items as transaction (transaction.id)}
            <li class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 border-t border-border py-3.5">
              <div class="min-w-0">
                <p class="truncate text-[15px]">{transaction.description || "No description"}</p>
                <p class="mt-0.5 text-[13px] text-ink-3">
                  {getCategoryName(transaction.category_id as string)}
                </p>
              </div>

              <div class="flex flex-col items-end gap-1.5">
                <p class="amt text-[15px] {transaction.type === 'income' ? 'text-blue-text' : ''}">
                  {transaction.type === "income" ? "+" : "−"}
                  {formatCurrency(transaction.amount as number)}
                </p>
                <div class="flex gap-4 text-[13px]">
                  <button
                    type="button"
                    on:click={() => openEditForm(transaction)}
                    class="min-h-8 text-ink-2 underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    on:click={() => confirmDelete(transaction.id as string)}
                    class="min-h-8 text-critical underline-offset-4 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          {/each}
        </ul>
      {/each}

      {#if totalPages > 1}
        <nav class="mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Pagination">
          <p class="font-mono text-xs text-ink-3">
            {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
          </p>

          <div class="flex items-center gap-2">
            <button
              type="button"
              on:click={prevPage}
              disabled={currentPage === 1}
              class="min-h-10 rounded-lg border border-rule-strong px-4 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <div class="flex gap-1">
              {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                if (totalPages <= 5) return i + 1;
                if (currentPage <= 3) return i + 1;
                if (currentPage >= totalPages - 2) return totalPages - 4 + i;
                return currentPage - 2 + i;
              }) as page (page)}
                <button
                  type="button"
                  on:click={() => goToPage(page)}
                  aria-current={currentPage === page ? "page" : undefined}
                  class="min-h-10 min-w-10 rounded-lg px-2 font-mono text-sm {currentPage === page
                    ? 'bg-blue-wash text-foreground underline decoration-primary underline-offset-4'
                    : 'text-ink-2 hover:text-foreground'}"
                >
                  {page}
                </button>
              {/each}
            </div>

            <button
              type="button"
              on:click={nextPage}
              disabled={currentPage === totalPages}
              class="min-h-10 rounded-lg border border-rule-strong px-4 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </nav>
      {/if}
    {/if}
  </section>
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
