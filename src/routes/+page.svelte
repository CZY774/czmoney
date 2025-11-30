<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import BalanceChart from "$lib/components/BalanceChart.svelte";
  import CategoryChart from "$lib/components/CategoryChart.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";

  let user: { id: string; email?: string } | null = null;
  let balance = { income: 0, expense: 0, total: 0 };
  let recentTransactions: Array<Record<string, unknown>> = [];
  let categoryData: Array<{ name: string; amount: number }> = [];
  let profile = { monthly_income: 0, savings_target: 0 };
  let loading = true;
  let dataLoading = true;

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user || null;
    loading = false;

    if (user) {
      loadDashboardData();
      
      // Listen for transaction updates
      window.addEventListener('transactionUpdated', loadDashboardData);
    }
  });

  onDestroy(() => {
    window.removeEventListener('transactionUpdated', loadDashboardData);
  });

  async function loadDashboardData() {
    if (!user) return;
    dataLoading = true;

    // Load profile data
    const { data: profileData } = await supabase
      .from("profiles")
      .select("monthly_income, savings_target")
      .eq("id", user.id)
      .single();

    if (profileData) {
      profile = profileData;
    }

    // Load transactions directly from Supabase
    const month = new Date().toISOString().slice(0, 7);
    const [year, monthNum] = month.split("-");
    const startDate = `${year}-${monthNum}-01`;
    const endDate = new Date(parseInt(year), parseInt(monthNum) + 1, 0).toISOString().split("T")[0];

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*, categories(name)")
      .eq("user_id", user.id)
      .gte("txn_date", startDate)
      .lte("txn_date", endDate)
      .order("txn_date", { ascending: false });

    if (transactions) {
      recentTransactions = transactions.slice(0, 5);

      balance.income = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      balance.expense = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      balance.total = balance.income - balance.expense;

      const categoryTotals: { [key: string]: number } = {};
      transactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          const categoryName = t.categories?.name || "No Category";
          categoryTotals[categoryName] =
            (categoryTotals[categoryName] || 0) + t.amount;
        });

      categoryData = Object.entries(categoryTotals)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);
    }
    dataLoading = false;
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  }
</script>

<svelte:head>
  <title>{user ? "Dashboard" : "Welcome"} - CZmoneY</title>
</svelte:head>

{#if !user && loading}
  <div class="space-y-6">
    <div class="h-10 bg-card/50 rounded w-48 animate-pulse"></div>
    <Skeleton type="card" count={3} />
  </div>
{:else if !user}
  <!-- Landing Page -->
  <div class="min-h-screen flex flex-col">
    <main class="flex-1 flex items-center justify-center px-4">
      <div class="max-w-md mx-auto text-center w-full">
        <h1 class="text-3xl sm:text-4xl font-bold mb-4">CZmoneY</h1>
        <p class="text-muted-foreground mb-8 text-sm sm:text-base">
          Track expenses, view reports, get insights.
        </p>

        <div class="space-y-3">
          <a
            href={resolve("/auth/register")}
            class="block w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-sm sm:text-base"
          >
            Get Started
          </a>
          <a
            href={resolve("/auth/login")}
            class="block w-full px-6 py-3 border border-border rounded-lg hover:bg-accent font-medium text-sm sm:text-base"
          >
            Sign In
          </a>
        </div>
      </div>
    </main>
  </div>
{:else}
  <!-- Dashboard for authenticated users -->
  <div class="space-y-6 sm:space-y-8">
    <h1 class="text-3xl sm:text-4xl font-bold">Dashboard</h1>

    <!-- Balance Cards -->
    {#if dataLoading}
      <Skeleton type="card" count={3} />
    {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
      <div class="bg-card p-4 sm:p-6 rounded-lg border border-border">
        <h3 class="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
          Total Income
        </h3>
        <p class="text-2xl sm:text-3xl font-bold text-green-400 break-all">
          {formatCurrency(balance.income)}
        </p>
      </div>

      <div class="bg-card p-4 sm:p-6 rounded-lg border border-border">
        <h3 class="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
          Total Expense
        </h3>
        <p class="text-2xl sm:text-3xl font-bold text-red-400 break-all">
          {formatCurrency(balance.expense)}
        </p>
      </div>

      <div class="bg-card p-4 sm:p-6 rounded-lg border border-border sm:col-span-2 md:col-span-1">
        <h3 class="text-xs sm:text-sm font-medium text-muted-foreground mb-2">Balance</h3>
        <p
          class="text-2xl sm:text-3xl font-bold break-all {balance.total >= 0
            ? 'text-green-400'
            : 'text-red-400'}"
        >
          {formatCurrency(balance.total)}
        </p>
      </div>
    </div>
    {/if}

    <!-- Savings & Spending Progress -->
    {#if profile.savings_target > 0 || profile.monthly_income > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {#if profile.savings_target > 0}
          <div class="bg-card p-4 sm:p-6 rounded-lg border border-border">
            <h3 class="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
              Savings Progress
            </h3>
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1">
              <span class="text-lg sm:text-2xl font-bold text-blue-400 truncate">
                {formatCurrency(balance.total)}
              </span>
              <span class="text-xs sm:text-sm text-muted-foreground">
                / {formatCurrency(profile.savings_target)}
              </span>
            </div>
            <div class="w-full bg-muted rounded-full h-2">
              <div
                class="bg-blue-400 h-2 rounded-full transition-all"
                style="width: {Math.min(
                  100,
                  Math.max(0, (balance.total / profile.savings_target) * 100)
                )}%"
              ></div>
            </div>
            <p class="text-xs text-muted-foreground mt-1">
              {Math.round((balance.total / profile.savings_target) * 100)}% of target
            </p>
          </div>
        {/if}

        {#if profile.monthly_income > 0}
          <div class="bg-card p-4 sm:p-6 rounded-lg border border-border">
            <h3 class="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
              Spending Ratio
            </h3>
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1">
              <span class="text-lg sm:text-2xl font-bold text-orange-400">
                {Math.round((balance.expense / profile.monthly_income) * 100)}%
              </span>
              <span class="text-xs sm:text-sm text-muted-foreground">
                of income spent
              </span>
            </div>
            <div class="w-full bg-muted rounded-full h-2">
              <div
                class="bg-orange-400 h-2 rounded-full transition-all"
                style="width: {Math.min(
                  100,
                  (balance.expense / profile.monthly_income) * 100
                )}%"
              ></div>
            </div>
            <p class="text-xs text-muted-foreground mt-1 truncate">
              {formatCurrency(balance.expense)} / {formatCurrency(profile.monthly_income)}
            </p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Quick Actions -->
    <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
      <button
        on:click={() => goto(resolve("/transactions"))}
        class="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-sm sm:text-base"
      >
        Add Transaction
      </button>
      <button
        on:click={() => goto(resolve("/reports"))}
        class="w-full sm:w-auto px-6 py-3 border border-border rounded-lg hover:bg-accent font-medium text-sm sm:text-base"
      >
        View Reports
      </button>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
      <div class="bg-card p-4 sm:p-6 rounded-lg border border-border">
        <h2 class="text-lg sm:text-xl font-semibold mb-4">Income vs Expense</h2>
        <BalanceChart income={balance.income} expense={balance.expense} />
      </div>

      <div class="bg-card p-4 sm:p-6 rounded-lg border border-border">
        <h2 class="text-lg sm:text-xl font-semibold mb-4">Expense Categories</h2>
        <CategoryChart categories={categoryData} />
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="bg-card p-4 sm:p-6 rounded-lg border border-border">
      <h2 class="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Recent Transactions</h2>

      {#if recentTransactions.length === 0}
        <p class="text-muted-foreground text-center py-8 text-sm sm:text-base">
          No transactions yet.
          <a href={resolve("/transactions")} class="text-primary hover:underline"
            >Add your first transaction</a
          >
        </p>
      {:else}
        <div class="space-y-3 sm:space-y-4">
          {#each recentTransactions as transaction (transaction.id)}
            <div
              class="flex justify-between items-start sm:items-center py-3 border-b border-border last:border-b-0 gap-3"
            >
              <div class="min-w-0 flex-1">
                <p class="font-medium text-sm sm:text-base truncate">
                  {transaction.description || "No description"}
                </p>
                <p class="text-xs sm:text-sm text-muted-foreground">
                  {new Date(transaction.txn_date as string).toLocaleDateString()}
                </p>
              </div>
              <div class="text-right flex-shrink-0">
                <p
                  class="font-semibold text-sm sm:text-base {transaction.type === 'income'
                    ? 'text-green-400'
                    : 'text-red-400'}"
                >
                  {transaction.type === "income" ? "+" : "-"}{formatCurrency(
                    transaction.amount as number
                  )}
                </p>
                <p class="text-xs sm:text-sm text-muted-foreground capitalize">
                  {transaction.type}
                </p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
