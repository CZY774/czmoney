<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import CategoryChart from "$lib/components/CategoryChart.svelte";

  let user: { id: string } | null = null;
  let selectedMonth = new Date().toISOString().slice(0, 7);
  let monthlyData: { income: number; expense: number; balance: number; transactions: Array<Record<string, unknown>> } = { income: 0, expense: 0, balance: 0, transactions: [] };
  let categoryData: Array<{ name: string; amount: number }> = [];
  let aiSummary = "";
  let loading = true;
  let generatingAI = false;

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user || null;

    if (!user) {
      goto(resolve("/auth/login"));
      return;
    }

    await loadMonthlyData();
    loading = false;
  });

  async function loadMonthlyData() {
    if (!user) return;
    const [year, month] = selectedMonth.split("-");
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*, categories(name)")
      .eq("user_id", user.id)
      .gte("txn_date", startDate)
      .lte("txn_date", endDate)
      .order("txn_date", { ascending: false });

    if (transactions) {
      monthlyData.transactions = transactions;
      monthlyData.income = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyData.expense = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyData.balance = monthlyData.income - monthlyData.expense;

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

  async function generateAISummary() {
    if (!monthlyData.transactions.length) {
      alert("No transactions found for this month");
      return;
    }

    generatingAI = true;
    aiSummary = "";

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const response = await fetch("/api/ai-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ month: selectedMonth }),
      });

      const result = await response.json();

      if (response.ok) {
        aiSummary = result.summary;
      } else {
        alert(result.error || "Failed to generate AI summary");
      }
    } catch (error) {
      alert("Error generating AI summary");
      console.error(error);
    } finally {
      generatingAI = false;
    }
  }

  function exportCSV() {
    if (!monthlyData.transactions.length) {
      alert("No transactions to export");
      return;
    }

    const headers = ["Date", "Type", "Category", "Amount", "Description"];
    const rows = monthlyData.transactions.map((t: Record<string, unknown>) => [
      t.txn_date,
      t.type,
      (t.categories as { name?: string })?.name || "No Category",
      t.amount,
      t.description || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field: unknown) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  }

  $: if (selectedMonth && user) {
    loadMonthlyData();
    aiSummary = "";
  }
</script>

<svelte:head>
  <title>Reports - CZmoneY</title>
</svelte:head>

<div class="space-y-8">
  <div class="flex justify-between items-center">
    <h1 class="text-4xl font-bold">Reports</h1>
    <button
      on:click={exportCSV}
      class="px-4 py-2 border border-border rounded-lg hover:bg-accent font-medium"
    >
      Export CSV
    </button>
  </div>

  <!-- Month Selector -->
  <div class="bg-card p-6 rounded-lg border border-border">
    <label for="month-select" class="block text-sm font-medium mb-3"
      >Select Month</label
    >
    <input
      id="month-select"
      type="month"
      bind:value={selectedMonth}
      class="p-3 border border-border rounded-lg bg-background text-foreground"
      style="color-scheme: dark;"
    />
  </div>

  {#if loading}
    <div class="flex items-center justify-center min-h-64">
      <div class="text-lg text-muted-foreground">Loading reports...</div>
    </div>
  {:else}
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-card p-6 rounded-lg border border-border">
        <h3 class="text-sm font-medium text-muted-foreground mb-2">
          Total Income
        </h3>
        <p class="text-3xl font-bold text-green-400">
          {formatCurrency(monthlyData.income)}
        </p>
      </div>

      <div class="bg-card p-6 rounded-lg border border-border">
        <h3 class="text-sm font-medium text-muted-foreground mb-2">
          Total Expense
        </h3>
        <p class="text-3xl font-bold text-red-400">
          {formatCurrency(monthlyData.expense)}
        </p>
      </div>

      <div class="bg-card p-6 rounded-lg border border-border">
        <h3 class="text-sm font-medium text-muted-foreground mb-2">
          Net Balance
        </h3>
        <p
          class="text-3xl font-bold {monthlyData.balance >= 0
            ? 'text-green-400'
            : 'text-red-400'}"
        >
          {formatCurrency(monthlyData.balance)}
        </p>
      </div>
    </div>

    <!-- AI Summary -->
    <div class="bg-card p-6 rounded-lg border border-border">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold">AI Insights</h2>
        <button
          on:click={generateAISummary}
          disabled={generatingAI || !monthlyData.transactions.length}
          class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
        >
          {generatingAI ? "Generating..." : "Generate Summary"}
        </button>
      </div>

      {#if aiSummary}
        <div class="p-4 bg-accent/20 rounded-lg border-l-4 border-primary">
          <p class="text-sm leading-relaxed">{aiSummary}</p>
        </div>
      {:else if !monthlyData.transactions.length}
        <p class="text-muted-foreground">
          No transactions found for this month. Add some transactions to get AI
          insights.
        </p>
      {:else}
        <p class="text-muted-foreground">
          Click "Generate Summary" to get AI-powered insights about your
          spending patterns.
        </p>
      {/if}
    </div>

    <!-- Category Chart -->
    {#if categoryData.length > 0}
      <div class="bg-card p-6 rounded-lg border border-border">
        <h2 class="text-xl font-semibold mb-4">Expense Categories</h2>
        <CategoryChart categories={categoryData} />
      </div>
    {/if}

    <!-- Category Breakdown Table -->
    {#if categoryData.length > 0}
      <div class="bg-card rounded-lg border border-border">
        <div class="p-6 border-b border-border">
          <h2 class="text-xl font-semibold">Category Breakdown</h2>
        </div>
        <div class="divide-y divide-border">
          {#each categoryData as category (category.name)}
            <div class="p-4 flex justify-between items-center">
              <span class="font-medium">{category.name}</span>
              <span class="font-semibold text-red-400"
                >{formatCurrency(category.amount)}</span
              >
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="bg-card p-8 rounded-lg border border-border text-center">
        <p class="text-muted-foreground">
          No expense data available for this month.
        </p>
      </div>
    {/if}
  {/if}
</div>
