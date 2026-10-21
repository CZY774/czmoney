<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { realtimeManager } from "$lib/services/realtimeManager";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { toast } from "$lib/stores/toast";
  import CategoryChart from "$lib/components/CategoryChart.svelte";
  import CategoryTrendsChart from "$lib/components/CategoryTrendsChart.svelte";
  import { generatePDF } from "$lib/services/pdfExport";

  let user: { id: string } | null = null;
  let selectedMonth = new Date().toISOString().slice(0, 7);
  let monthlyData: {
    income: number;
    expense: number;
    balance: number;
    transactions: Array<Record<string, unknown>>;
  } = { income: 0, expense: 0, balance: 0, transactions: [] };
  let categoryData: Array<{ name: string; amount: number }> = [];
  let aiSummary = "";
  let aiGeneratedAt: string | null = null;
  let aiIsStale = false;
  let loading = true;
  let dataLoading = true; // Separate loading for main data
  let generatingAI = false;
  let unsubscribe: (() => void) | null = null;

  let selectedPeriod: 3 | 6 | 12 = 3;
  let trendData: {
    months: string[];
    categories: Array<{ name: string; color: string; amounts: number[] }>;
  } | null = null;
  let loadingTrends = false;
  let exportingPDF = false;
  let chartElement: HTMLElement;
  let trendAbortController: AbortController | null = null;

  onMount(() => {
    let disposed = false;
    async function initializeReports() {
      const { data } = await supabase.auth.getSession();
      if (disposed) return;
      user = data.session?.user || null;

      if (!user) {
        goto(resolve("/auth/login"));
        return;
      }

      loading = false; // Hide initial loader immediately

      // Mark reports as visited for onboarding checklist
      localStorage.setItem("visited_reports", "true");

      // Load main data first (fast)
      await Promise.all([loadMonthlyData(), fetchCategoryTrends()]);
      if (disposed) return;

      // Load AI summary in background (slow, don't block UI)
      loadAISummary();

      window.addEventListener("transactionUpdated", loadMonthlyData);

      unsubscribe = realtimeManager.subscribe(
        "reports-transactions",
        "transactions",
        user.id,
        () => loadMonthlyData(),
      );
    }

    void initializeReports();

    return () => {
      disposed = true;
      window.removeEventListener("transactionUpdated", loadMonthlyData);
      trendAbortController?.abort();
      if (unsubscribe) unsubscribe();
    };
  });

  async function loadMonthlyData() {
    if (!user) return;
    dataLoading = true;

    const [year, month] = selectedMonth.split("-");
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0)
      .toISOString()
      .split("T")[0];

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

    dataLoading = false;
  }

  async function loadAISummary() {
    if (!user) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (!token) return;

      const response = await fetch(
        `/api/ai-summary?month=${selectedMonth}&lookback=3`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        aiSummary = data.summary;
        aiGeneratedAt = data.generated_at;
        aiIsStale = data.is_stale || false;
      }
    } catch (error) {
      console.error("Failed to load AI summary:", error);
    }
  }

  async function generateAISummary(forceRefresh = false) {
    if (!monthlyData.transactions.length) {
      toast.warning("No transactions found for this month");
      return;
    }

    generatingAI = true;
    aiSummary = "Analyzing your spending patterns...";
    aiIsStale = false;

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
          lookback: 3, // 3 months of context
          refresh: forceRefresh, // Force new generation
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        aiSummary = "";
        toast.error(error.error || "Failed to generate AI summary");
        return;
      }

      const data = await response.json();
      aiSummary = data.summary;
      aiGeneratedAt = data.generated_at;
      aiIsStale = false;
      toast.success("AI summary generated successfully!");
    } catch (error) {
      console.error("AI summary error:", error);
      aiSummary = "";
      toast.error("Failed to generate AI summary. Please try again.");
    } finally {
      generatingAI = false;
    }
  }

  async function fetchCategoryTrends() {
    // Abort previous request if still pending
    if (trendAbortController) {
      trendAbortController.abort();
    }

    // Create new AbortController for this request
    trendAbortController = new AbortController();
    const signal = trendAbortController.signal;

    loadingTrends = true;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const res = await fetch(
        `/api/reports/category-trends?period=${selectedPeriod}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal, // Pass abort signal
        },
      );

      // Check if request was aborted
      if (signal.aborted) return;

      const result = await res.json();

      if (result.success) {
        trendData = result.data;
      } else {
        toast.error(result.error || "Failed to load trends");
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      toast.error("Network error");
    } finally {
      // Only set loading false if not aborted
      if (!signal.aborted) {
        loadingTrends = false;
      }
    }
  }

  function exportCSV() {
    if (!monthlyData.transactions.length) {
      toast.warning("No transactions to export");
      return;
    }

    try {
      const headers = ["Date", "Type", "Category", "Amount", "Description"];
      const rows = monthlyData.transactions.map(
        (t: Record<string, unknown>) => [
          t.txn_date,
          t.type,
          (t.categories as { name?: string })?.name || "No Category",
          t.amount,
          t.description || "",
        ],
      );

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
            (t as { categories?: { name?: string } }).categories?.name ||
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

  async function handleMonthChange() {
    if (!user || loading) return;
    await loadMonthlyData();
    loadAISummary();
  }

  function setPeriod(period: 3 | 6 | 12) {
    if (selectedPeriod === period || !user || loading) return;
    selectedPeriod = period;
    fetchCategoryTrends();
  }
</script>

<svelte:head>
  <title>Reports - CZmoneY</title>
</svelte:head>

<div class="max-w-[1040px] space-y-10">
  <header class="flex flex-wrap items-end justify-between gap-4">
    <div class="space-y-1">
      <h1 class="text-xl font-semibold tracking-tight">Reports</h1>
      <p class="text-sm text-ink-2">Pick a month. Every figure on the page covers that month.</p>
    </div>
    <div class="flex gap-2">
      <button
        type="button"
        on:click={exportCSV}
        class="min-h-11 rounded-lg border border-rule-strong px-4 text-sm hover:bg-accent active:scale-[0.98]"
      >
        Export CSV
      </button>
      <button
        type="button"
        on:click={exportPDF}
        disabled={exportingPDF}
        class="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/85 disabled:opacity-40 active:scale-[0.98]"
      >
        {exportingPDF ? "Generating" : "Export PDF"}
      </button>
    </div>
  </header>

  <div class="max-w-xs">
    <label for="month-select" class="mb-1.5 block text-xs text-ink-2">Month</label>
    <input
      id="month-select"
      type="month"
      bind:value={selectedMonth}
      on:change={handleMonthChange}
      class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground"
    />
  </div>

  {#if loading}
    <p class="py-16 text-center text-sm text-ink-2">Loading</p>
  {:else if dataLoading}
    <div class="grid animate-pulse gap-6" aria-hidden="true">
      <div class="h-24 w-2/3 rounded bg-muted"></div>
      <div class="h-64 rounded bg-muted"></div>
    </div>
  {:else}
    <!-- Month totals: one line each, the net is the figure that leads -->
    <section aria-labelledby="h-totals" class="border-t border-border pt-5">
      <h2 id="h-totals" class="pb-4 text-[15px] font-semibold">This month</h2>
      <dl class="grid gap-6 md:grid-cols-3 md:gap-10">
        <div>
          <dt class="text-sm text-ink-2">Income</dt>
          <dd class="amt mt-1 text-[22px] text-blue-text">{formatCurrency(monthlyData.income)}</dd>
        </div>
        <div>
          <dt class="text-sm text-ink-2">Expense</dt>
          <dd class="amt mt-1 text-[22px]">{formatCurrency(monthlyData.expense)}</dd>
        </div>
        <div>
          <dt class="text-sm text-ink-2">Net balance</dt>
          <dd class="amt mt-1 text-[22px] {monthlyData.balance < 0 ? 'text-critical' : ''}">
            {monthlyData.balance < 0 ? "−" : ""}{formatCurrency(Math.abs(monthlyData.balance))}
          </dd>
        </div>
      </dl>
    </section>

    <!-- AI summary -->
    <section aria-labelledby="h-ai" class="border-t border-border pt-5">
      <div class="flex flex-wrap items-baseline justify-between gap-3 pb-4">
        <h2 id="h-ai" class="text-[15px] font-semibold">AI insights</h2>
        <button
          type="button"
          on:click={() => generateAISummary(true)}
          disabled={generatingAI || !monthlyData.transactions.length}
          class="min-h-10 rounded-lg border border-rule-strong px-4 text-sm hover:bg-accent disabled:opacity-40"
        >
          {generatingAI ? "Generating" : aiSummary ? "Refresh" : "Generate summary"}
        </button>
      </div>

      {#if aiSummary}
        {#if aiIsStale}
          <p class="mb-3 flex items-center gap-2 text-sm text-warning">
            <i class="inline-block size-[9px] bg-warning [clip-path:polygon(50%_4%,100%_96%,0_96%)]"></i>
            Data has changed since this summary. Refresh for updated insights.
          </p>
        {:else if aiGeneratedAt}
          <p class="mb-3 font-mono text-xs text-ink-3">
            Up to date, as of {new Date(aiGeneratedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        {/if}
        <p class="border-l-2 border-primary pl-4 text-[15px] leading-relaxed">{aiSummary}</p>
        <p class="mt-4 text-xs text-ink-3">
          Longer descriptions give the AI more to work with. "Bus ticket Jakarta to Bandung" tells it more than "transport".
        </p>
      {:else if !monthlyData.transactions.length}
        <p class="text-sm text-ink-2">No transactions this month. Add some to get AI insights.</p>
      {:else}
        <p class="text-sm text-ink-2">Generate a summary for an AI read on this month's spending.</p>
      {/if}
    </section>

    <!-- Category trends -->
    <section aria-labelledby="h-trends" class="border-t border-border pt-5">
      <div class="flex flex-wrap items-baseline justify-between gap-3 pb-4">
        <h2 id="h-trends" class="text-[15px] font-semibold">Category trends</h2>
        <div class="flex gap-1 text-sm" role="group" aria-label="Period">
          {#each [3, 6, 12] as period (period)}
            <button
              type="button"
              aria-pressed={selectedPeriod === period}
              on:click={() => setPeriod(period as 3 | 6 | 12)}
              class="min-h-10 rounded-lg px-3 {selectedPeriod === period
                ? 'bg-blue-wash text-foreground underline decoration-primary underline-offset-4'
                : 'text-ink-2 hover:text-foreground'}"
            >
              {period} months
            </button>
          {/each}
        </div>
      </div>

      {#if loadingTrends}
        <div class="h-96 animate-pulse rounded bg-muted"></div>
      {:else if trendData && trendData.categories.length > 0}
        <CategoryTrendsChart data={trendData} />
      {:else}
        <p class="py-10 text-center text-sm text-ink-2">No expense data for this period.</p>
      {/if}
    </section>

    <!-- Expense split -->
    {#if categoryData.length > 0}
      <section aria-labelledby="h-split" class="border-t border-border pt-5">
        <h2 id="h-split" class="pb-4 text-[15px] font-semibold">Expense by category</h2>
        <div bind:this={chartElement}>
          <CategoryChart categories={categoryData} />
        </div>
        <ul class="mt-6">
          {#each categoryData as category (category.name)}
            <li class="flex items-baseline justify-between gap-4 border-t border-border py-3">
              <span class="min-w-0 truncate text-[15px]">{category.name}</span>
              <span class="amt shrink-0 text-[15px]">{formatCurrency(category.amount)}</span>
            </li>
          {/each}
        </ul>
      </section>
    {:else}
      <p class="border-t border-border pt-8 text-center text-sm text-ink-2">No expense data for this month.</p>
    {/if}
  {/if}
</div>
