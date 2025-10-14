<script>
  import { onMount } from "svelte";
  import { supabase, getUser } from "$lib/services/supabase";
  import {
    formatCurrency,
    formatDate,
    getCurrentMonth,
    groupByCategory,
  } from "$lib/utils";
  import {
    getCachedTransactions,
    cacheTransactions,
    getPendingCount,
  } from "$lib/services/sync";
  import Chart from "svelte-apexcharts";

  let user = null;
  let profile = null;
  let transactions = [];
  let categories = [];
  let loading = true;
  let showAddModal = false;
  let pendingSync = 0;

  let stats = {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    savingsProgress: 0,
  };

  // Chart data
  let monthlyChartOptions = {};
  let categoryChartOptions = {};

  onMount(async () => {
    const { user: currentUser } = await getUser();
    user = currentUser;

    if (user) {
      await loadData();
      pendingSync = await getPendingCount();
    }
  });

  async function loadData() {
    loading = true;

    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      profile = profileData;

      // Load categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id);
      categories = categoriesData || [];

      // Try to get transactions from cache first
      let txnData = await getCachedTransactions(user.id);

      if (!txnData || !navigator.onLine) {
        // Fetch from server
        const currentMonth = getCurrentMonth();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);

        const { data } = await supabase
          .from("transactions")
          .select("*, categories(*)")
          .eq("user_id", user.id)
          .gte("txn_date", startDate.toISOString().split("T")[0])
          .order("txn_date", { ascending: false });

        txnData = data || [];

        // Cache for offline use
        await cacheTransactions(user.id);
      }

      transactions = txnData;
      calculateStats();
      setupCharts();
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      loading = false;
    }
  }

  function calculateStats() {
    const currentMonth = getCurrentMonth();
    const monthTransactions = transactions.filter((t) =>
      t.txn_date.startsWith(currentMonth)
    );

    stats.totalIncome = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    stats.totalExpense = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    stats.balance = stats.totalIncome - stats.totalExpense;

    if (profile?.savings_target) {
      stats.savingsProgress = (stats.balance / profile.savings_target) * 100;
    }
  }

  function setupCharts() {
    const currentMonth = getCurrentMonth();
    const monthTransactions = transactions.filter((t) =>
      t.txn_date.startsWith(currentMonth)
    );

    // Monthly income vs expense chart
    monthlyChartOptions = {
      series: [
        {
          name: "Income",
          data: [stats.totalIncome],
        },
        {
          name: "Expense",
          data: [stats.totalExpense],
        },
      ],
      chart: {
        type: "bar",
        height: 250,
        background: "transparent",
        toolbar: { show: false },
      },
      colors: ["#10b981", "#ef4444"],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "50%",
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ["This Month"],
        labels: { style: { colors: "#9fb0c8" } },
      },
      yaxis: {
        labels: {
          style: { colors: "#9fb0c8" },
          formatter: (val) => formatCurrency(val).replace("Rp", ""),
        },
      },
      theme: { mode: "dark" },
      grid: { borderColor: "#0f1b2b" },
    };

    // Category breakdown donut chart
    const expenseTransactions = monthTransactions.filter(
      (t) => t.type === "expense"
    );
    const grouped = groupByCategory(expenseTransactions);
    const top5 = grouped.slice(0, 5);

    categoryChartOptions = {
      series: top5.map((g) => g.total),
      chart: {
        type: "donut",
        height: 300,
        background: "transparent",
      },
      labels: top5.map((g) => g.category_name),
      colors: top5.map((g) => g.color),
      legend: {
        position: "bottom",
        labels: { colors: "#9fb0c8" },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => val.toFixed(0) + "%",
      },
      theme: { mode: "dark" },
    };
  }
</script>

<div class="container py-6 fade-in">
  {#if loading}
    <div class="flex justify-center py-12">
      <div class="spinner"></div>
    </div>
  {:else}
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-white mb-1">
        Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}!
      </h1>
      <p class="text-muted">Here's your financial overview</p>
    </div>

    <!-- Sync Status -->
    {#if pendingSync > 0}
      <div
        class="mb-4 bg-accent/10 border border-accent/50 text-accent px-4 py-3 rounded-lg"
      >
        {pendingSync} transaction(s) pending sync. Will sync when online.
      </div>
    {/if}

    <!-- Balance Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="card p-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-muted text-sm">Total Income</span>
          <svg
            class="w-5 h-5 text-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        </div>
        <p class="text-2xl font-bold text-white">
          {formatCurrency(stats.totalIncome)}
        </p>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-muted text-sm">Total Expense</span>
          <svg
            class="w-5 h-5 text-danger"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
            />
          </svg>
        </div>
        <p class="text-2xl font-bold text-white">
          {formatCurrency(stats.totalExpense)}
        </p>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-muted text-sm">Balance</span>
          <svg
            class="w-5 h-5 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p class="text-2xl font-bold text-white">
          {formatCurrency(stats.balance)}
        </p>
        {#if profile?.savings_target}
          <div class="mt-2">
            <div class="flex justify-between text-xs text-muted mb-1">
              <span>Savings Target</span>
              <span>{stats.savingsProgress.toFixed(0)}%</span>
            </div>
            <div class="w-full bg-background rounded-full h-2">
              <div
                class="bg-highlight h-2 rounded-full transition-all duration-300"
                style="width: {Math.min(stats.savingsProgress, 100)}%"
              ></div>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Income vs Expense</h3>
        <Chart options={monthlyChartOptions} />
      </div>

      <div class="card p-6">
        <h3 class="text-lg font-semibold text-white mb-4">
          Expense by Category
        </h3>
        {#if categoryChartOptions.series?.length > 0}
          <Chart options={categoryChartOptions} />
        {:else}
          <p class="text-muted text-center py-12">No expenses this month</p>
        {/if}
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">Recent Transactions</h3>
        <a href="/transactions" class="text-accent text-sm hover:underline"
          >View All</a
        >
      </div>

      {#if transactions.length > 0}
        <div class="space-y-3">
          {#each transactions.slice(0, 5) as txn}
            <div
              class="flex items-center justify-between p-3 bg-background rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center"
                  style="background-color: {txn.categories?.color ||
                    '#64748b'}20"
                >
                  <span style="color: {txn.categories?.color || '#64748b'}">
                    {txn.categories?.name?.charAt(0) || "?"}
                  </span>
                </div>
                <div>
                  <p class="text-white font-medium">
                    {txn.categories?.name || "Uncategorized"}
                  </p>
                  <p class="text-xs text-muted">{formatDate(txn.txn_date)}</p>
                </div>
              </div>
              <div class="text-right">
                <p
                  class="font-semibold {txn.type === 'income'
                    ? 'text-success'
                    : 'text-danger'}"
                >
                  {txn.type === "income" ? "+" : "-"}{formatCurrency(
                    txn.amount
                  )}
                </p>
                {#if txn.description}
                  <p class="text-xs text-muted">{txn.description}</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-muted text-center py-8">No transactions yet</p>
      {/if}
    </div>

    <!-- Floating Action Button -->
    <a
      href="/transactions?add=true"
      class="fixed bottom-24 md:bottom-8 right-8 w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:bg-accent/90 transition-all z-40"
    >
      <svg
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m8-8H4"
        />
      </svg>
    </a>
  {/if}
</div>
