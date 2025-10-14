<script>
  import { onMount } from "svelte";
  import { supabase, getUser } from "$lib/services/supabase";
  import {
    formatCurrency,
    getCurrentMonth,
    getPreviousMonth,
    getMonthName,
    groupByCategory,
    generateCSV,
    downloadCSV,
    calculatePercentChange,
  } from "$lib/utils";
  import Chart from "svelte-apexcharts";

  let user = null;
  let selectedMonth = getCurrentMonth();
  let transactions = [];
  let loading = true;
  let generatingAI = false;
  let aiSummary = "";

  let monthData = {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    changeVsPrev: 0,
    categories: [],
  };

  let categoryChartOptions = {};

  onMount(async () => {
    const { user: currentUser } = await getUser();
    user = currentUser;

    if (user) {
      await loadReport();
    }
  });

  $: if (selectedMonth && user) {
    loadReport();
  }

  async function loadReport() {
    loading = true;

    try {
      // Load transactions for selected month
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(selectedMonth + "-01");
      endDate.setMonth(endDate.getMonth() + 1);
      const endDateStr = endDate.toISOString().split("T")[0];

      const { data: txnData } = await supabase
        .from("transactions")
        .select("*, categories(*)")
        .eq("user_id", user.id)
        .gte("txn_date", startDate)
        .lt("txn_date", endDateStr)
        .order("txn_date", { ascending: false });

      transactions = txnData || [];

      // Calculate stats
      monthData.totalIncome = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      monthData.totalExpense = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      monthData.balance = monthData.totalIncome - monthData.totalExpense;

      // Calculate change vs previous month
      const prevMonth = getPreviousMonth(selectedMonth);
      const prevStartDate = `${prevMonth}-01`;
      const prevEndDate = `${selectedMonth}-01`;

      const { data: prevTxnData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("txn_date", prevStartDate)
        .lt("txn_date", prevEndDate);

      const prevExpense = (prevTxnData || [])
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      monthData.changeVsPrev = calculatePercentChange(
        monthData.totalExpense,
        prevExpense
      );

      // Group by category
      const expenseTransactions = transactions.filter(
        (t) => t.type === "expense"
      );
      monthData.categories = groupByCategory(expenseTransactions);

      setupChart();
    } catch (err) {
      console.error("Error loading report:", err);
    } finally {
      loading = false;
    }
  }

  function setupChart() {
    const top10 = monthData.categories.slice(0, 10);

    categoryChartOptions = {
      series: [
        {
          name: "Amount",
          data: top10.map((c) => c.total),
        },
      ],
      chart: {
        type: "bar",
        height: 400,
        background: "transparent",
        toolbar: { show: false },
      },
      colors: [top10.map((c) => c.color)],
      plotOptions: {
        bar: {
          horizontal: true,
          distributed: true,
          barHeight: "70%",
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => formatCurrency(val).replace("Rp", "").trim(),
      },
      xaxis: {
        categories: top10.map((c) => c.category_name),
        labels: {
          style: { colors: "#9fb0c8" },
          formatter: (val) => formatCurrency(val).replace("Rp", "").trim(),
        },
      },
      yaxis: {
        labels: { style: { colors: "#9fb0c8" } },
      },
      theme: { mode: "dark" },
      grid: { borderColor: "#0f1b2b" },
      legend: { show: false },
    };
  }

  async function generateAISummary() {
    if (!user || generatingAI) return;

    generatingAI = true;
    aiSummary = "";

    try {
      const response = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedMonth,
          totalIncome: monthData.totalIncome,
          totalExpense: monthData.totalExpense,
          changeVsPrev: monthData.changeVsPrev,
          topCategories: monthData.categories.slice(0, 3).map((c) => ({
            name: c.category_name,
            amount: c.total,
            percentage: ((c.total / monthData.totalExpense) * 100).toFixed(1),
          })),
        }),
      });

      const data = await response.json();

      if (data.summary) {
        aiSummary = data.summary;
      } else {
        throw new Error(data.error || "Failed to generate summary");
      }
    } catch (err) {
      aiSummary = "Unable to generate AI summary. Please try again later.";
      console.error("AI summary error:", err);
    } finally {
      generatingAI = false;
    }
  }

  function exportCSV() {
    if (transactions.length === 0) {
      alert("No transactions to export");
      return;
    }

    const csv = generateCSV(transactions);
    const filename = `transactions_${selectedMonth}.csv`;
    downloadCSV(csv, filename);
  }

  function getMonthOptions() {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = date.toISOString().substring(0, 7);
      const label = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      options.push({ value, label });
    }
    return options;
  }
</script>

<div class="container py-6 fade-in">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-white">Reports</h1>
    <div class="flex space-x-3">
      <button
        on:click={exportCSV}
        class="btn-secondary"
        disabled={loading || transactions.length === 0}
      >
        <svg
          class="w-5 h-5 inline-block mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Export CSV
      </button>
    </div>
  </div>

  <!-- Month Selector -->
  <div class="card p-4 mb-6">
    <label for="month-select" class="label">Select Month</label>
    <select id="month-select" bind:value={selectedMonth} class="input max-w-xs">
      {#each getMonthOptions() as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <div class="spinner"></div>
    </div>
  {:else}
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="card p-6">
        <p class="text-muted text-sm mb-1">Total Income</p>
        <p class="text-2xl font-bold text-success">
          {formatCurrency(monthData.totalIncome)}
        </p>
      </div>

      <div class="card p-6">
        <p class="text-muted text-sm mb-1">Total Expense</p>
        <p class="text-2xl font-bold text-danger">
          {formatCurrency(monthData.totalExpense)}
        </p>
      </div>

      <div class="card p-6">
        <p class="text-muted text-sm mb-1">Balance</p>
        <p class="text-2xl font-bold text-white">
          {formatCurrency(monthData.balance)}
        </p>
      </div>

      <div class="card p-6">
        <p class="text-muted text-sm mb-1">Change vs Prev</p>
        <p
          class="text-2xl font-bold {monthData.changeVsPrev > 0
            ? 'text-danger'
            : 'text-success'}"
        >
          {monthData.changeVsPrev > 0
            ? "+"
            : ""}{monthData.changeVsPrev.toFixed(1)}%
        </p>
      </div>
    </div>

    <!-- AI Summary Section -->
    <div class="card p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">AI Insights</h3>
        <button
          on:click={generateAISummary}
          class="btn-primary"
          disabled={generatingAI || transactions.length === 0}
        >
          {generatingAI ? "Generating..." : "Generate Summary"}
        </button>
      </div>

      {#if aiSummary}
        <div class="bg-accent/10 border border-accent/30 rounded-lg p-4">
          <p class="text-white leading-relaxed">{aiSummary}</p>
        </div>
      {:else if !generatingAI}
        <p class="text-muted text-center py-8">
          Click "Generate Summary" to get AI-powered insights about your
          spending patterns
        </p>
      {:else}
        <div class="flex justify-center py-8">
          <div class="spinner"></div>
        </div>
      {/if}
    </div>

    <!-- Category Breakdown Chart -->
    {#if monthData.categories.length > 0}
      <div class="card p-6 mb-6">
        <h3 class="text-lg font-semibold text-white mb-4">
          Expense by Category
        </h3>
        <Chart options={categoryChartOptions} />
      </div>

      <!-- Category Table -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Category Details</h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-muted/20">
                <th class="text-left py-3 px-4 text-muted font-medium"
                  >Category</th
                >
                <th class="text-right py-3 px-4 text-muted font-medium"
                  >Amount</th
                >
                <th class="text-right py-3 px-4 text-muted font-medium"
                  >% of Total</th
                >
                <th class="text-right py-3 px-4 text-muted font-medium"
                  >Count</th
                >
              </tr>
            </thead>
            <tbody>
              {#each monthData.categories as cat}
                <tr
                  class="border-b border-muted/10 hover:bg-background/50 transition-colors"
                >
                  <td class="py-3 px-4">
                    <div class="flex items-center space-x-3">
                      <div
                        class="w-3 h-3 rounded-full"
                        style="background-color: {cat.color}"
                      ></div>
                      <span class="text-white">{cat.category_name}</span>
                    </div>
                  </td>
                  <td class="text-right py-3 px-4 text-white font-medium">
                    {formatCurrency(cat.total)}
                  </td>
                  <td class="text-right py-3 px-4 text-muted">
                    {((cat.total / monthData.totalExpense) * 100).toFixed(1)}%
                  </td>
                  <td class="text-right py-3 px-4 text-muted">
                    {cat.count}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {:else}
      <div class="card p-12 text-center">
        <svg
          class="w-16 h-16 mx-auto text-muted/50 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p class="text-muted mb-4">
          No transactions found for {getMonthName(selectedMonth)}
        </p>
        <a href="/transactions?add=true" class="btn-primary inline-block">
          Add Transaction
        </a>
      </div>
    {/if}
  {/if}
</div>
