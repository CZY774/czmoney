<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import BalanceChart from "$lib/components/BalanceChart.svelte";
  import CategoryChart from "$lib/components/CategoryChart.svelte";

  let user: { id: string; email?: string } | null = null;
  let balance = { income: 0, expense: 0, total: 0 };
  let recentTransactions: Array<Record<string, unknown>> = [];
  let categoryData: Array<{ name: string; amount: number }> = [];
  let profile = { monthly_income: 0, savings_target: 0 };
  let loading = true;

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user || null;

    if (user) {
      await loadDashboardData();
      
      // Listen for transaction updates
      window.addEventListener('transactionUpdated', loadDashboardData);
    }

    loading = false;
  });

  onDestroy(() => {
    window.removeEventListener('transactionUpdated', loadDashboardData);
  });

  async function loadDashboardData() {
    if (!user) return;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    // Load profile data
    const { data: profileData } = await supabase
      .from("profiles")
      .select("monthly_income, savings_target")
      .eq("id", user.id)
      .single();

    if (profileData) {
      profile = profileData;
    }

    // Force fresh data with timestamp to bypass cache
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*, categories(name)")
      .eq("user_id", user.id)
      .gte("txn_date", startOfMonth.toISOString().split("T")[0])
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

{#if loading}
  <div class="flex items-center justify-center min-h-64">
    <div class="text-lg text-muted-foreground">Loading...</div>
  </div>
{:else if !user}
  <!-- Landing Page -->
  <div class="min-h-screen flex flex-col">
    <!-- Main -->
    <main class="flex-1 flex items-center justify-center px-6">
      <div class="max-w-md mx-auto text-center">
        <h1 class="text-3xl font-bold mb-4">CZmoneY</h1>
        <p class="text-muted-foreground mb-8">
          Track expenses, view reports, get insights.
        </p>

        <div class="space-y-3">
          <a
            href={resolve("/auth/register")}
            class="block w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
          >
            Get Started
          </a>
          <a
            href={resolve("/auth/login")}
            class="block w-full px-6 py-3 border border-border rounded-lg hover:bg-accent font-medium"
          >
            Sign In
          </a>
        </div>
      </div>
    </main>
  </div>
{:else}
  <!-- Dashboard for authenticated users -->
  <div class="space-y-8">
    <h1 class="text-4xl font-bold">Dashboard</h1>

    <!-- Balance Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-card p-6 rounded-lg border border-border">
        <h3 class="text-sm font-medium text-muted-foreground mb-2">
          Total Income
        </h3>
        <p class="text-3xl font-bold text-green-400">
          {formatCurrency(balance.income)}
        </p>
      </div>

      <div class="bg-card p-6 rounded-lg border border-border">
        <h3 class="text-sm font-medium text-muted-foreground mb-2">
          Total Expense
        </h3>
        <p class="text-3xl font-bold text-red-400">
          {formatCurrency(balance.expense)}
        </p>
      </div>

      <div class="bg-card p-6 rounded-lg border border-border">
        <h3 class="text-sm font-medium text-muted-foreground mb-2">Balance</h3>
        <p
          class="text-3xl font-bold {balance.total >= 0
            ? 'text-green-400'
            : 'text-red-400'}"
        >
          {formatCurrency(balance.total)}
        </p>
      </div>
    </div>

    <!-- Savings & Spending Progress -->
    {#if profile.savings_target > 0 || profile.monthly_income > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#if profile.savings_target > 0}
          <div class="bg-card p-6 rounded-lg border border-border">
            <h3 class="text-sm font-medium text-muted-foreground mb-2">
              Savings Progress
            </h3>
            <div class="flex items-center justify-between mb-2">
              <span class="text-2xl font-bold text-blue-400">
                {formatCurrency(balance.total)}
              </span>
              <span class="text-sm text-muted-foreground">
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
          <div class="bg-card p-6 rounded-lg border border-border">
            <h3 class="text-sm font-medium text-muted-foreground mb-2">
              Spending Ratio
            </h3>
            <div class="flex items-center justify-between mb-2">
              <span class="text-2xl font-bold text-orange-400">
                {Math.round((balance.expense / profile.monthly_income) * 100)}%
              </span>
              <span class="text-sm text-muted-foreground">
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
            <p class="text-xs text-muted-foreground mt-1">
              {formatCurrency(balance.expense)} / {formatCurrency(profile.monthly_income)}
            </p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Quick Actions -->
    <div class="flex gap-4">
      <button
        on:click={() => goto(resolve("/transactions"))}
        class="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
      >
        Add Transaction
      </button>
      <button
        on:click={() => goto(resolve("/reports"))}
        class="px-6 py-3 border border-border rounded-lg hover:bg-accent font-medium"
      >
        View Reports
      </button>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="bg-card p-6 rounded-lg border border-border">
        <h2 class="text-xl font-semibold mb-4">Income vs Expense</h2>
        <BalanceChart income={balance.income} expense={balance.expense} />
      </div>

      <div class="bg-card p-6 rounded-lg border border-border">
        <h2 class="text-xl font-semibold mb-4">Expense Categories</h2>
        <CategoryChart categories={categoryData} />
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="bg-card p-6 rounded-lg border border-border">
      <h2 class="text-xl font-semibold mb-6">Recent Transactions</h2>

      {#if recentTransactions.length === 0}
        <p class="text-muted-foreground text-center py-8">
          No transactions yet.
          <a href={resolve("/transactions")} class="text-primary hover:underline"
            >Add your first transaction</a
          >
        </p>
      {:else}
        <div class="space-y-4">
          {#each recentTransactions as transaction (transaction.id)}
            <div
              class="flex justify-between items-center py-3 border-b border-border last:border-b-0"
            >
              <div>
                <p class="font-medium">
                  {transaction.description || "No description"}
                </p>
                <p class="text-sm text-muted-foreground">
                  {new Date(transaction.txn_date as string).toLocaleDateString()}
                </p>
              </div>
              <div class="text-right">
                <p
                  class="font-semibold {transaction.type === 'income'
                    ? 'text-green-400'
                    : 'text-red-400'}"
                >
                  {transaction.type === "income" ? "+" : "-"}{formatCurrency(
                    transaction.amount as number
                  )}
                </p>
                <p class="text-sm text-muted-foreground capitalize">
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
