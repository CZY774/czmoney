<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { realtimeManager } from "$lib/services/realtimeManager";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import SmartInsights from "$lib/components/SmartInsights.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import OnboardingChecklist from "$lib/components/OnboardingChecklist.svelte";
  import { get, set } from "idb-keyval";
  import { toast } from "$lib/stores/toast";
  import { CHART_OTHER_LABEL, CHART_TOP_N } from "$lib/config/chartPalette";
  import { localDateString } from "$lib/utils/localDate";
  import { requestAddTransaction } from "$lib/stores/addTransaction";

  export let data;

  type Snapshot = {
    month: string;
    balance: { income: number; expense: number; total: number };
    recentTransactions: Array<Record<string, unknown>>;
    categoryData: Array<{ name: string; amount: number }>;
    profile: { monthly_income: number; savings_target: number };
    ytd: { current: number; previous: number } | null;
    fourPercent?: FourPercent | null;
  };

  type FourPercent = {
    target: number;
    snapshot: { amount: number; as_of: string } | null;
  };

  let user: { id: string; email?: string } | null = null;
  let balance = { income: 0, expense: 0, total: 0 };
  let recentTransactions: Array<Record<string, unknown>> = [];
  let categoryData: Array<{ name: string; amount: number }> = [];
  let profile = { monthly_income: 0, savings_target: 0 };
  let ytd: { current: number; previous: number } | null = null;
  let fourPercent: FourPercent | null = null;
  // Explanation notes under the Balance rows; each toggles on its own.
  let showYtdNote = false;
  let showFourPercentNote = false;
  let loading = true;
  // True only until something is on screen. Refetches never bring the skeleton back.
  let dataLoading = true;
  let unsubscribe: (() => void) | null = null;
  let showChecklist = true;
  let checklistTasks = [
    {
      id: "transaction",
      label: "Add your first transaction",
      completed: false,
    },
    { id: "income", label: "Set your monthly income", completed: false },
    { id: "budget", label: "Create a budget", completed: false },
    { id: "report", label: "View your first report", completed: false },
  ];

  // Calendar facts for the pace marker. Computed once per page load.
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pacePct = (dayOfMonth / daysInMonth) * 100;
  const monthLabel = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  $: savingsPct =
    profile.savings_target > 0
      ? Math.min(100, Math.max(0, (balance.total / profile.savings_target) * 100))
      : 0;
  $: spentPct =
    profile.monthly_income > 0
      ? Math.max(0, (balance.expense / profile.monthly_income) * 100)
      : 0;
  $: spendingAhead = spentPct > pacePct;
  $: fourPercentPct =
    fourPercent?.snapshot && fourPercent.target > 0
      ? (fourPercent.snapshot.amount / fourPercent.target) * 100
      : null;
  $: keptPct =
    balance.income > 0
      ? Math.min(100, Math.max(0, ((balance.income - balance.expense) / balance.income) * 100))
      : 0;

  $: recentByDay = recentTransactions.reduce<Array<[string, Array<Record<string, unknown>>]>>(
    (days, t) => {
      const key = String(t.txn_date);
      const last = days[days.length - 1];
      if (last && last[0] === key) last[1].push(t);
      else days.push([key, [t]]);
      return days;
    },
    [],
  );

  // Top categories, the rest folded into "Other". Same count as Reports, and a
  // category literally named "Other" folds in too. Bars are scaled to the largest.
  $: rankedCategories = (() => {
    const named = categoryData.filter((c) => c.name !== CHART_OTHER_LABEL);
    const top = named.slice(0, CHART_TOP_N);
    const rest = categoryData.filter((c) => !top.includes(c));
    const items = rest.length
      ? [
          ...top,
          { name: CHART_OTHER_LABEL, amount: rest.reduce((s, c) => s + c.amount, 0) },
        ]
      : top;
    // "Other" can outweigh the top category, so scale to the largest of all bars
    const max = Math.max(...items.map((c) => c.amount)) || 1;
    const total = categoryData.reduce((s, c) => s + c.amount, 0) || 1;
    return items.map((c) => ({
      ...c,
      width: (c.amount / max) * 100,
      share: (c.amount / total) * 100,
    }));
  })();

  function handleDashboardVisibilityChange() {
    if (!document.hidden && user) {
      loadDashboardData();
    }
  }

  onMount(() => {
    let disposed = false;
    async function initializeDashboard() {
      const { data } = await supabase.auth.getSession();
      if (disposed) return;
      user = data.session?.user || null;
      loading = false;

      if (user) {
        loadDashboardData();
        loadChecklistStatus();

        window.addEventListener("transactionUpdated", loadDashboardData);

        unsubscribe = realtimeManager.subscribe(
          "dashboard-transactions",
          "transactions",
          user.id,
          () => loadDashboardData(),
        );

        document.addEventListener(
          "visibilitychange",
          handleDashboardVisibilityChange,
        );
      }
    }

    void initializeDashboard();

    return () => {
      disposed = true;
      window.removeEventListener("transactionUpdated", loadDashboardData);
      document.removeEventListener(
        "visibilitychange",
        handleDashboardVisibilityChange,
      );
      if (unsubscribe) unsubscribe();
    };
  });

  function applySnapshot(s: Snapshot) {
    balance = s.balance;
    recentTransactions = s.recentTransactions;
    categoryData = s.categoryData;
    profile = s.profile;
    ytd = s.ytd ?? null;
    fourPercent = s.fourPercent ?? null;
    dataLoading = false;
  }

  async function loadDashboardData() {
    if (!user) return;

    // Paint the last known numbers first, then replace them when the network answers.
    // Only for this month: last month's cache would be misleading as "current".
    let cached: Snapshot | undefined;
    if (dataLoading) {
      cached = await get<Snapshot>("cached_dashboard");
      if (cached && cached.month === monthKey) applySnapshot(cached);
      else cached = undefined;
    }

    if (!navigator.onLine) {
      if (cached) toast.info("Showing cached data (offline)");
      else dataLoading = false;
      return;
    }

    const startDate = localDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    const endDate = localDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearSameDay = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      now.getDate(),
    );
    // Trailing 12 months: the day after this date last year, through today
    const twelveMonthsStart = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      now.getDate() + 1,
    );

    // Batch queries using Promise.all. YTD sums run in Postgres, not in the browser.
    const [
      profileResult,
      transactionsResult,
      budgetsResult,
      ytdNow,
      ytdPrev,
      expense12Result,
      latestSnapshotResult,
    ] = await Promise.all([
        supabase
          .from("profiles")
          .select("monthly_income, savings_target")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("transactions")
          .select("*, categories(name)")
          .eq("user_id", user.id)
          .gte("txn_date", startDate)
          .lte("txn_date", endDate)
          .order("txn_date", { ascending: false }),
        supabase.from("budgets").select("id").eq("user_id", user.id).limit(1),
        supabase.rpc("expense_total", {
          p_from: localDateString(yearStart),
          p_to: localDateString(now),
        }),
        supabase.rpc("expense_total", {
          p_from: localDateString(lastYearStart),
          p_to: localDateString(lastYearSameDay),
        }),
        supabase.rpc("expense_total", {
          p_from: localDateString(twelveMonthsStart),
          p_to: localDateString(now),
        }),
        supabase
          .from("investment_snapshots")
          .select("amount, as_of")
          .eq("user_id", user.id)
          .order("as_of", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (profileResult.data) {
      profile = profileResult.data;
    }

    // Missing RPC (SQL not run yet) hides the YTD line instead of breaking the page.
    if (ytdNow.error || ytdPrev.error) {
      console.warn("YTD unavailable:", ytdNow.error ?? ytdPrev.error);
      ytd = null;
    } else {
      ytd = {
        current: Number(ytdNow.data ?? 0),
        previous: Number(ytdPrev.data ?? 0),
      };
    }

    // 4% rule: target is 25 x the last 12 months of expenses. Hidden if either query fails.
    if (expense12Result.error || latestSnapshotResult.error) {
      console.warn(
        "4% rule unavailable:",
        expense12Result.error ?? latestSnapshotResult.error,
      );
      fourPercent = null;
    } else {
      const latest = latestSnapshotResult.data;
      fourPercent = {
        target: Number(expense12Result.data ?? 0) * 25,
        snapshot: latest
          ? { amount: Number(latest.amount), as_of: latest.as_of }
          : null,
      };
    }

    if (transactionsResult.data) {
      const transactions = transactionsResult.data;
      recentTransactions = transactions.slice(0, 8);

      const income = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      balance = { income, expense, total: income - expense };

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

    // Cache dashboard data for offline use and for the next instant paint.
    await set("cached_dashboard", {
      month: monthKey,
      balance,
      recentTransactions,
      categoryData,
      profile,
      ytd,
      fourPercent,
      timestamp: Date.now(),
    } satisfies Snapshot & { timestamp: number });

    updateChecklistProgress(budgetsResult.data);
  }

  async function loadChecklistStatus() {
    const dismissed = localStorage.getItem("checklist_dismissed");
    showChecklist = dismissed !== "true";
  }

  function updateChecklistProgress(budgets: Array<{ id: string }> | null) {
    checklistTasks[0].completed = recentTransactions.length > 0;
    checklistTasks[1].completed = profile.monthly_income > 0;
    checklistTasks[2].completed = (budgets?.length || 0) > 0;
    checklistTasks[3].completed =
      localStorage.getItem("visited_reports") === "true";
    checklistTasks = [...checklistTasks];
  }

  async function handleChecklistToggle(event: CustomEvent<string>) {
    const taskId = event.detail;
    if (taskId === "transaction") {
      requestAddTransaction();
      goto(resolve("/transactions"));
    } else if (taskId === "income") {
      goto(resolve("/settings"));
    } else if (taskId === "budget") {
      goto(resolve("/budgets"));
    } else if (taskId === "report") {
      goto(resolve("/reports"));
    }
  }

  function dismissChecklist() {
    localStorage.setItem("checklist_dismissed", "true");
    showChecklist = false;
  }

  // Hero figure: digits only, the "Rp" is set beside it in the sans.
  function formatFigure(amount: number) {
    return new Intl.NumberFormat("id-ID").format(Math.abs(amount));
  }

  function formatDay(key: string) {
    return new Date(`${key}T00:00:00`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  }

  function formatShortDate(key: string) {
    return new Date(`${key}T00:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  }

  function formatPct(value: number) {
    return `${Math.round(value)}%`;
  }

  // Structured data for SEO (only for landing page)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CZmoneY",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web, Android, iOS",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Modern personal finance manager with offline support, AI insights, and budget tracking",
    featureList: [
      "Transaction Management",
      "Budget Tracking",
      "AI-Powered Insights",
      "Offline Support",
      "Visual Reports",
      "PWA Installation",
    ],
    screenshot: "https://czmoney.vercel.app/icon-512.png",
    softwareVersion: "1.1.7",
  };

  // Pre-render structured data HTML (split closing tag to avoid parser confusion)
  const structuredDataHTML =
    '<script type="application/ld+json">' +
    JSON.stringify(structuredData) +
    "<" +
    "/script>";
</script>

<svelte:head>
  <title>{user ? "Dashboard" : "Welcome"} - CZmoneY</title>
  {#if data?.seo}
    <meta name="description" content={data.seo.description} />
    <meta name="keywords" content={data.seo.keywords} />
    <link rel="canonical" href={data.seo.canonical} />
  {/if}
  {#if !user}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html structuredDataHTML}
  {/if}
</svelte:head>

{#if !user && loading}
  <div class="space-y-6">
    <div class="h-10 bg-card/50 rounded w-48 animate-pulse"></div>
    <Skeleton type="card" count={3} />
  </div>
{:else if !user}
  <!-- Landing -->
  <div class="flex min-h-screen flex-col justify-center px-6 py-12">
    <main class="mx-auto w-full max-w-md">
      <p class="text-sm font-semibold text-blue-text">CZmoneY</p>
      <h1 class="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Track where the money goes.</h1>
      <p class="mt-4 text-[15px] leading-relaxed text-ink-2">
        Track expenses, view reports, get insights. Works offline, and your numbers stay in your own account.
      </p>

      <div class="mt-10 flex flex-col gap-3 sm:flex-row">
        <a
          href={resolve("/auth/register")}
          data-sveltekit-preload-data
          class="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/85 active:scale-[0.98]"
        >
          Get started
        </a>
        <a
          href={resolve("/auth/login")}
          data-sveltekit-preload-data
          class="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-rule-strong px-5 text-sm hover:bg-accent"
        >
          Sign in
        </a>
      </div>
    </main>
  </div>
{:else}
  <!-- Ledger: one sheet, the balance is the only large figure -->
  <div class="mx-auto max-w-[1040px] space-y-10">
    <header class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h1 class="text-xl font-semibold tracking-tight">{monthLabel}</h1>
      <p class="font-mono text-xs text-ink-3">Day {dayOfMonth} of {daysInMonth}</p>
    </header>

    {#if showChecklist && !dataLoading}
      <OnboardingChecklist
        tasks={checklistTasks}
        on:toggle={handleChecklistToggle}
        on:dismiss={dismissChecklist}
      />
    {/if}

    {#if !dataLoading && recentTransactions.length === 0}
      <EmptyState
        title="Start Tracking Your Finances"
        description="Add your first transaction to see your spending patterns, charts, and AI-powered insights."
        actionLabel="Add Transaction"
        onAction={() => {
          requestAddTransaction();
          goto(resolve("/transactions"));
        }}
      />
    {:else if dataLoading}
      <Skeleton type="card" count={3} />
    {:else}
      <!-- Wide: balance over categories on the left, targets and insights stacked
           in one wrapper on the right. Placing the right-hand items in grid rows
           tied them to the left rows, and the shorter side got an empty gap. -->
      <div class="grid gap-10 md:grid-cols-2 md:gap-x-10 wide:grid-cols-[7fr_5fr] wide:grid-rows-[auto_1fr_auto] wide:gap-x-16">
        <!-- Hero: balance, income and expense as lines, kept vs spent as one bar -->
        <section class="min-w-0 md:col-span-2 wide:col-span-1 wide:col-start-1 wide:row-start-1" aria-labelledby="h-balance">
          <h2 id="h-balance" class="text-[13px] font-medium text-ink-2">Balance</h2>
          <p class="amt mt-2 flex w-fit max-w-full items-baseline gap-[0.18em] border-b-[3px] border-double border-ink-3 pb-3.5 text-[clamp(2.5rem,8vw,4.75rem)] leading-none font-medium tracking-[-0.035em]">
            {#if balance.total < 0}<span>−</span>{/if}
            <span class="text-[0.36em] font-medium tracking-normal font-sans text-ink-2">Rp</span>
            <span>{formatFigure(balance.total)}</span>
          </p>
          {#if balance.total < 0}
            <p class="mt-2 text-sm text-ink-2">Expense is higher than income this month.</p>
          {/if}

          <dl class="mt-6 grid gap-2.5">
            <div class="flex items-baseline gap-2.5">
              <dt class="text-sm text-ink-2">Income</dt>
              <i class="min-w-3 flex-1 -translate-y-1 border-b border-dotted border-rule-strong"></i>
              <dd class="amt text-[15px] text-blue-text">+ Rp {formatFigure(balance.income)}</dd>
            </div>
            <div class="flex items-baseline gap-2.5">
              <dt class="text-sm text-ink-2">Expense</dt>
              <i class="min-w-3 flex-1 -translate-y-1 border-b border-dotted border-rule-strong"></i>
              <dd class="amt text-[15px]">− Rp {formatFigure(balance.expense)}</dd>
            </div>
            {#if ytd}
              <div class="flex flex-wrap items-baseline gap-x-2.5">
                <dt class="text-sm text-ink-2">Expense this year<button type="button" class="-my-1.5 ml-0.5 inline-grid size-6 align-middle place-items-center rounded {showYtdNote ? 'text-blue-text' : 'text-ink-3 hover:text-foreground'}" aria-label="How expense this year is counted" aria-expanded={showYtdNote} aria-controls="ytd-note" on:click={() => (showYtdNote = !showYtdNote)}><svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></button></dt>
                <i class="min-w-3 flex-1 -translate-y-1 border-b border-dotted border-rule-strong"></i>
                <dd class="amt text-[15px]">Rp {formatFigure(ytd.current)}</dd>
                {#if showYtdNote}
                  <dd id="ytd-note" class="mt-1 basis-full max-w-prose text-xs leading-relaxed text-ink-3">All expenses from 1 January to today. The line below covers 1 January to the same date last year.</dd>
                {/if}
              </div>
            {/if}
            {#if fourPercent}
              <div class="flex flex-wrap items-baseline gap-x-2.5">
                <dt class="text-sm text-ink-2">4% rule target<button type="button" class="-my-1.5 ml-0.5 inline-grid size-6 align-middle place-items-center rounded {showFourPercentNote ? 'text-blue-text' : 'text-ink-3 hover:text-foreground'}" aria-label="What the 4% rule target means" aria-expanded={showFourPercentNote} aria-controls="four-percent-note" on:click={() => (showFourPercentNote = !showFourPercentNote)}><svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></button></dt>
                <i class="min-w-3 flex-1 -translate-y-1 border-b border-dotted border-rule-strong"></i>
                <dd class="amt text-[15px]">Rp {formatFigure(fourPercent.target)}</dd>
                {#if showFourPercentNote}
                  <dd id="four-percent-note" class="mt-1 basis-full max-w-prose text-xs leading-relaxed text-ink-3">Invested assets that would let you withdraw 4% a year to cover what you spent in the last 12 months. It is 25 × Rp {formatFigure(Math.round(fourPercent.target / 25))}, your expenses over the last 12 months. Progress uses the latest invested assets entry in Settings.</dd>
                {/if}
              </div>
            {/if}
          </dl>

          {#if balance.income > 0}
            <div class="mt-6 flex h-2 gap-0.5" role="img" aria-label="{formatPct(keptPct)} of income kept, {formatPct(100 - keptPct)} spent">
              <i class="block h-full rounded-l-sm bg-primary" style="width: {keptPct}%"></i>
              <i class="block h-full flex-1 rounded-r-sm bg-spent"></i>
            </div>
            <p class="mt-2 flex flex-wrap justify-between gap-x-3 font-mono text-xs text-ink-3">
              <span class="inline-flex items-center gap-2"><i class="size-2 rounded-sm bg-primary"></i>{formatPct(keptPct)} of income kept</span>
              <span class="inline-flex items-center gap-2"><i class="size-2 rounded-sm bg-spent"></i>{formatPct(100 - keptPct)} spent</span>
            </p>
          {/if}

          {#if ytd}
            <p class="mt-4 font-mono text-xs text-ink-3">
              Same period last year Rp {formatFigure(ytd.previous)}
            </p>
          {/if}

          {#if fourPercent}
            {#if fourPercent.snapshot}
              <p class="mt-2 font-mono text-xs text-ink-3">
                {fourPercentPct !== null ? `${formatPct(fourPercentPct)} of target, ` : ""}Rp {formatFigure(fourPercent.snapshot.amount)} invested as of {formatShortDate(fourPercent.snapshot.as_of)}
              </p>
            {:else}
              <p class="mt-2 text-sm text-ink-2">
                <a href={resolve("/settings")} data-sveltekit-preload-data class="text-blue-text underline-offset-4 hover:underline">Add invested assets</a> to track progress.
              </p>
            {/if}
          {/if}

          <a
            href={resolve("/transactions")}
            on:click={requestAddTransaction}
            data-sveltekit-preload-data
            class="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/85 active:scale-[0.98]"
          >
            Add transaction
          </a>
        </section>

        <div class="grid min-w-0 content-start gap-10 md:col-span-2 wide:col-span-1 wide:col-start-2 wide:row-span-2 wide:row-start-1">
          <!-- Targets -->
          {#if profile.savings_target > 0 || profile.monthly_income > 0}
            <section class="min-w-0 border-t border-border pt-5" aria-labelledby="h-targets">
              <h2 id="h-targets" class="pb-4 text-[15px] font-semibold">Targets</h2>
              <div class="grid gap-7 md:grid-cols-2 md:gap-10 wide:grid-cols-1">
                {#if profile.savings_target > 0}
                  <div>
                    <div class="flex items-baseline justify-between gap-3">
                      <span class="text-sm text-ink-2">Savings target</span>
                      <span class="amt text-[22px] leading-none">{formatPct(savingsPct)}</span>
                    </div>
                    <div class="mt-3 h-1.5 rounded-sm bg-blue-track" role="img" aria-label="{formatPct(savingsPct)} of savings target">
                      <i class="block h-full rounded-r-sm bg-primary" style="width: {savingsPct}%"></i>
                    </div>
                    <p class="mt-2 flex flex-wrap justify-between gap-x-3 font-mono text-xs text-ink-3">
                      <span>Rp {formatFigure(balance.total)} of Rp {formatFigure(profile.savings_target)}</span>
                      <span>Rp {formatFigure(Math.max(0, profile.savings_target - balance.total))} to go</span>
                    </p>
                  </div>
                {/if}

                {#if profile.monthly_income > 0}
                  <div>
                    <div class="flex items-baseline justify-between gap-3">
                      <span class="text-sm text-ink-2">Spent of monthly income</span>
                      <span class="amt text-[22px] leading-none {spendingAhead ? 'text-warning' : ''}">{formatPct(spentPct)}</span>
                    </div>
                    <div class="relative mt-3 h-1.5 rounded-sm {spendingAhead ? 'bg-warning-track' : 'bg-blue-track'}" role="img" aria-label="{formatPct(spentPct)} of monthly income spent, {formatPct(pacePct)} of the month gone">
                      <i class="block h-full rounded-r-sm {spendingAhead ? 'bg-warning' : 'bg-primary'}" style="width: {Math.min(100, spentPct)}%"></i>
                      <b class="absolute -top-1 -bottom-1 w-0.5 -ml-px rounded-full bg-foreground shadow-[0_0_0_2px_var(--color-background)]" style="left: {pacePct}%" title="Today, day {dayOfMonth} of {daysInMonth}"></b>
                    </div>
                    <p class="mt-2 flex flex-wrap justify-between gap-x-3 font-mono text-xs text-ink-3">
                      <span>Rp {formatFigure(balance.expense)} of Rp {formatFigure(profile.monthly_income)}</span>
                      <span class="inline-flex items-center gap-2">
                        {#if spendingAhead}
                          <i class="inline-block size-[9px] bg-warning [clip-path:polygon(50%_4%,100%_96%,0_96%)]"></i>Faster than the month
                        {:else}
                          {formatPct(pacePct)} of the month gone
                        {/if}
                      </span>
                    </p>
                  </div>
                {/if}
              </div>
            </section>
          {/if}

          <!-- Insights -->
          <div class="min-w-0 border-t border-border pt-5">
            <SmartInsights />
          </div>
        </div>

        <!-- Spending by category: one series, so one color on every bar -->
        {#if rankedCategories.length > 0}
          <section class="min-w-0 border-t border-border pt-5 md:col-span-2 wide:col-span-1 wide:col-start-1 wide:row-start-2" aria-labelledby="h-cats">
            <div class="flex items-baseline justify-between gap-4 pb-4">
              <h2 id="h-cats" class="text-[15px] font-semibold">Spending by category</h2>
              <a href={resolve("/reports")} data-sveltekit-preload-data class="inline-flex items-center gap-1.5 text-[13px] text-blue-text hover:underline">Reports</a>
            </div>
            <ol class="grid gap-4">
              {#each rankedCategories as category (category.name)}
                <li>
                  <div class="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-3">
                    <span class="truncate text-sm">{category.name}</span>
                    <span class="w-[5ch] text-right font-mono text-xs text-ink-3">{category.share.toFixed(1)}%</span>
                    <span class="amt min-w-[13ch] text-right text-sm">Rp {formatFigure(category.amount)}</span>
                  </div>
                  <div class="mt-2 h-1 bg-transparent" role="img" aria-label="{category.name}, {formatPct(category.width)} of the largest category">
                    <i class="block h-full rounded-r-sm bg-primary" style="width: {category.width}%"></i>
                  </div>
                </li>
              {/each}
            </ol>
          </section>
        {/if}

        <!-- Recent transactions, grouped by day -->
        <section class="min-w-0 border-t border-border pt-5 md:col-span-2 wide:row-start-3" aria-labelledby="h-recent">
          <div class="flex items-baseline justify-between gap-4 pb-4">
            <h2 id="h-recent" class="text-[15px] font-semibold">Recent transactions</h2>
            <a href={resolve("/transactions")} data-sveltekit-preload-data class="inline-flex items-center gap-1.5 text-[13px] text-blue-text hover:underline">All transactions</a>
          </div>

          {#if recentByDay.length === 0}
            <p class="py-8 text-center text-sm text-ink-2">No transactions yet.</p>
          {:else}
            {#each recentByDay as [day, items] (day)}
              <div>
                <h3 class="pt-4 pb-2 font-mono text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase first:pt-0">{formatDay(day)}</h3>
                <ul>
                  {#each items as transaction (transaction.id)}
                    <li class="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 border-t border-border py-3 md:grid-cols-[minmax(0,1fr)_120px_minmax(12ch,auto)]">
                      <span class="truncate text-sm md:text-[15px]">{transaction.description || "No description"}</span>
                      <span class="amt text-sm {transaction.type === 'income' ? 'text-blue-text' : ''}">
                        {transaction.type === "income" ? "+" : "−"} Rp {formatFigure(transaction.amount as number)}
                      </span>
                      <span class="col-start-1 text-[13px] text-ink-3 md:col-start-auto md:text-sm">{(transaction.categories as { name?: string } | null)?.name ?? "No Category"}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          {/if}
        </section>
      </div>

    {/if}
  </div>
{/if}
