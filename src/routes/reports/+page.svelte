<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { toast } from "$lib/stores/toast";
  import CategoryChart from "$lib/components/CategoryChart.svelte";
  import CategoryTrendsChart from "$lib/components/CategoryTrendsChart.svelte";
  import { generatePDF } from "$lib/services/pdfExport";

  let user: { id: string } | null = null;
  let selectedMonth = new Date().toISOString().slice(0, 7);
  let monthlyData: { income: number; expense: number; balance: number; transactions: Array<Record<string, unknown>> } = { income: 0, expense: 0, balance: 0, transactions: [] };
  let categoryData: Array<{ name: string; amount: number }> = [];
  let aiSummary = "";
  let loading = true;
  let generatingAI = false;
  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

  let selectedPeriod: 3 | 6 | 12 = 3;
  let trendData: {
    months: string[];
    categories: Array<{ name: string; color: string; amounts: number[] }>;
  } | null = null;
  let loadingTrends = false;
  let exportingPDF = false;
  let chartElement: HTMLElement;

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user || null;

    if (!user) {
      goto(resolve("/auth/login"));
      return;
    }

    await loadMonthlyData();
    await fetchCategoryTrends();
    loading = false;

    window.addEventListener('transactionUpdated', loadMonthlyData);

    realtimeChannel = supabase
      .channel('reports-transactions')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        () => loadMonthlyData()
      )
      .subscribe();
  });

  onDestroy(() => {
    window.removeEventListener('transactionUpdated', loadMonthlyData);
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
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
      toast.warning("No transactions found for this month");
      return;
    }

    generatingAI = true;
    aiSummary = "Analyzing your spending patterns...";

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const response = await fetch("/api/ai-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          month: selectedMonth,
          lookback: 3 // 3 months of context
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        aiSummary = "";
        toast.error(error.error || "Failed to generate AI summary");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        aiSummary = "";
        toast.error("Failed to read AI response");
        return;
      }

      aiSummary = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        aiSummary += chunk;
      }

      if (aiSummary.trim()) {
        toast.success("AI insights generated successfully!");
      }
    } catch (error) {
      aiSummary = "";
      console.error(error);
      toast.error("Error generating AI summary. Please try again.");
    } finally {
      generatingAI = false;
    }
  }

  async function fetchCategoryTrends() {
    loadingTrends = true;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const res = await fetch(`/api/reports/category-trends?period=${selectedPeriod}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await res.json();

      if (result.success) {
        trendData = result.data;
      } else {
        toast.error(result.error || "Failed to load trends");
      }
    } catch {
      toast.error("Network error");
    } finally {
      loadingTrends = false;
    }
  }

  function exportCSV() {
    if (!monthlyData.transactions.length) {
      toast.warning("No transactions to export");
      return;
    }

    try {
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

      toast.success("CSV exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export CSV");
    }
  }

  async function exportPDF() {
    if (!monthlyData.transactions.length) {
      toast.warning("No transactions to export");
      return;
    }

    exportingPDF = true;

    try {
      await generatePDF({
        transactions: monthlyData.transactions.map((t) => ({
          date: (t as { txn_date: string }).txn_date,
          category:
            ((t as { categories?: { name?: string } }).categories?.name) ||
            "Unknown",
          type: (t as { type: "income" | "expense" }).type,
          amount: (t as { amount: number }).amount,
          description: (t as { description?: string }).description,
        })),
        summary: {
          totalIncome: monthlyData.income,
          totalExpense: monthlyData.expense,
          netSavings: monthlyData.income - monthlyData.expense,
          savingsRate:
            monthlyData.income > 0
              ? ((monthlyData.income - monthlyData.expense) /
                  monthlyData.income) *
                100
              : 0,
        },
        period: new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        chartElement: chartElement,
        currency: "IDR",
      });

      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      exportingPDF = false;
    }
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

  $: if (selectedPeriod && user) {
    fetchCategoryTrends();
  }
</script>

<svelte:head>
  <title>Reports - CZmoneY</title>
</svelte:head>

<div class="space-y-6 sm:space-y-8">
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
    <h1 class="text-3xl sm:text-4xl font-bold">Reports</h1>
    <div class="flex gap-2 w-full sm:w-auto">
      <button
        on:click={exportCSV}
        class="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base border border-border rounded-lg hover:bg-accent font-medium active:scale-95 transition-transform"
      >
        Export CSV
      </button>
      <button
        on:click={exportPDF}
        disabled={exportingPDF}
        class="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
      >
        {exportingPDF ? "Generating..." : "Export PDF"}
      </button>
    </div>
  </div>

  <!-- Month Selector -->
  <div class="bg-card p-4 sm:p-6 rounded-lg border border-border">
    <label for="month-select" class="block text-xs sm:text-sm font-medium mb-2 sm:mb-3"
      >Select Month</label
    >
    <input
      id="month-select"
      type="month"
      bind:value={selectedMonth}
      class="w-full p-2 sm:p-3 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground"
      style="color-scheme: dark;"
    />
  </div>

  {#if loading}
    <div class="flex items-center justify-center min-h-64">
      <div class="text-base sm:text-lg text-muted-foreground">Loading reports...</div>
    </div>
  {:else}
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
      <div class="bg-card p-4 sm:p-6 rounded-lg border border-border">
        <h3 class="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
          Total Income
        </h3>
        <p class="text-2xl sm:text-3xl font-bold text-green-400 break-all">
          {formatCurrency(monthlyData.income)}
        </p>
      </div>

      <div class="bg-card p-4 sm:p-6 rounded-lg border border-border">
        <h3 class="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
          Total Expense
        </h3>
        <p class="text-2xl sm:text-3xl font-bold text-red-400 break-all">
          {formatCurrency(monthlyData.expense)}
        </p>
      </div>

      <div class="bg-card p-4 sm:p-6 rounded-lg border border-border sm:col-span-2 md:col-span-1">
        <h3 class="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
          Net Balance
        </h3>
        <p
          class="text-2xl sm:text-3xl font-bold break-all {monthlyData.balance >= 0
            ? 'text-green-400'
            : 'text-red-400'}"
        >
          {formatCurrency(monthlyData.balance)}
        </p>
      </div>
    </div>

    <!-- AI Summary -->
    <div class="bg-card p-4 sm:p-6 rounded-lg border border-border">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h2 class="text-lg sm:text-xl font-semibold">AI Insights</h2>
        <button
          on:click={generateAISummary}
          disabled={generatingAI || !monthlyData.transactions.length}
          class="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
        >
          {generatingAI ? "Generating..." : "Generate Summary"}
        </button>
      </div>

      {#if aiSummary}
        <div class="p-3 sm:p-4 bg-accent/20 rounded-lg border-l-4 border-primary">
          <p class="text-xs sm:text-sm leading-relaxed">{aiSummary}</p>
        </div>
      {:else if !monthlyData.transactions.length}
        <p class="text-muted-foreground text-xs sm:text-sm">
          No transactions found for this month. Add some transactions to get AI
          insights.
        </p>
      {:else}
        <p class="text-muted-foreground text-xs sm:text-sm">
          Click "Generate Summary" to get AI-powered insights about your
          spending patterns.
        </p>
      {/if}
    </div>

    <!-- Category Trends -->
    <div class="bg-card p-4 sm:p-6 rounded-lg border border-border">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h2 class="text-lg sm:text-xl font-semibold">Category Trends</h2>
        <div class="flex gap-2 w-full sm:w-auto">
          <button
            class="flex-1 sm:flex-none px-3 py-1.5 text-sm rounded-lg transition-colors {selectedPeriod === 3 ? 'bg-primary text-white' : 'bg-background border border-border hover:bg-accent'}"
            on:click={() => selectedPeriod = 3}
          >
            3 Months
          </button>
          <button
            class="flex-1 sm:flex-none px-3 py-1.5 text-sm rounded-lg transition-colors {selectedPeriod === 6 ? 'bg-primary text-white' : 'bg-background border border-border hover:bg-accent'}"
            on:click={() => selectedPeriod = 6}
          >
            6 Months
          </button>
          <button
            class="flex-1 sm:flex-none px-3 py-1.5 text-sm rounded-lg transition-colors {selectedPeriod === 12 ? 'bg-primary text-white' : 'bg-background border border-border hover:bg-accent'}"
            on:click={() => selectedPeriod = 12}
          >
            12 Months
          </button>
        </div>
      </div>

      {#if loadingTrends}
        <div class="h-96 bg-background/50 rounded-lg animate-pulse"></div>
      {:else if trendData && trendData.categories.length > 0}
        <CategoryTrendsChart data={trendData} />
      {:else}
        <p class="text-muted-foreground text-xs sm:text-sm text-center py-8">
          No expense data available for this period.
        </p>
      {/if}
    </div>

    <!-- Category Chart -->
    {#if categoryData.length > 0}
      <div class="bg-card p-4 sm:p-6 rounded-lg border border-border">
        <h2 class="text-lg sm:text-xl font-semibold mb-4">Expense Categories</h2>
        <div bind:this={chartElement}>
          <CategoryChart categories={categoryData} />
        </div>
      </div>
    {/if}

    <!-- Category Breakdown Table -->
    {#if categoryData.length > 0}
      <div class="bg-card rounded-lg border border-border">
        <div class="p-4 sm:p-6 border-b border-border">
          <h2 class="text-lg sm:text-xl font-semibold">Category Breakdown</h2>
        </div>
        <div class="divide-y divide-border">
          {#each categoryData as category (category.name)}
            <div class="p-3 sm:p-4 flex justify-between items-center gap-3">
              <span class="font-medium text-sm sm:text-base truncate">{category.name}</span>
              <span class="font-semibold text-red-400 text-sm sm:text-base whitespace-nowrap"
                >{formatCurrency(category.amount)}</span
              >
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="bg-card p-6 sm:p-8 rounded-lg border border-border text-center">
        <p class="text-muted-foreground text-sm sm:text-base">
          No expense data available for this month.
        </p>
      </div>
    {/if}
  {/if}
</div>
