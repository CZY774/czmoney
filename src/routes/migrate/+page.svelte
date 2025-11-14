<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";

  let user: { id: string } | null = null;
  let migrating = false;
  let progress = "";
  let results: { expenses: number; income: number; total: number; dateRange?: string } = { expenses: 0, income: 0, total: 0 };

  // Sample data from your CSV files
  const sampleTransactions = [
    // Income entries (from month headers)
    {
      date: "2025-01-01",
      type: "income",
      amount: 5605000,
      description: "Monthly Income",
    },
    {
      date: "2024-01-01",
      type: "income",
      amount: 2020000,
      description: "Monthly Income",
    },

    // Expense entries (from daily transactions)
    {
      date: "2025-01-01",
      type: "expense",
      amount: 35000,
      description: "bensin (2.89 liter)",
    },
    {
      date: "2025-01-01",
      type: "expense",
      amount: 30000,
      description: "pulsa (30.000)",
    },
    {
      date: "2025-01-02",
      type: "expense",
      amount: 25500,
      description: "spaghetti carbonara (1)",
    },
    {
      date: "2025-01-13",
      type: "expense",
      amount: 22000,
      description: "babi kecap+nasi+sambal (1)",
    },
    {
      date: "2024-01-01",
      type: "expense",
      amount: 35000,
      description: "potong",
    },
    {
      date: "2024-01-08",
      type: "expense",
      amount: 33000,
      description: "beras (3kg)",
    },
    { date: "2024-01-08", type: "expense", amount: 500000, description: "kos" },
  ];

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user;

    if (!user) {
      goto(resolve("/auth/login"));
      return;
    }
  });

  async function startMigration() {
    migrating = true;
    progress = "Starting migration...";

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      let imported = 0;
      let incomeCount = 0;
      let expenseCount = 0;

      for (const transaction of sampleTransactions) {
        progress = `Importing transaction ${imported + 1}/${sampleTransactions.length}...`;

        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            txn_date: transaction.date,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            category_id: null,
          }),
        });

        if (response.ok) {
          imported++;
          if (transaction.type === "income") incomeCount++;
          else expenseCount++;
        }

        // Small delay to show progress
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      results = {
        expenses: expenseCount,
        income: incomeCount,
        total: imported,
        dateRange: "2024-01-01 to 2025-01-13",
      };

      progress = "Migration completed!";
    } catch (error: unknown) {
      progress = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    } finally {
      migrating = false;
    }
  }
</script>

<svelte:head>
  <title>CSV Migration - CZmoneY</title>
</svelte:head>

<div class="max-w-2xl mx-auto p-6">
  <h1 class="text-3xl font-bold mb-6">CSV Data Migration</h1>

  <div class="bg-card p-6 rounded-lg border mb-6">
    <h2 class="text-xl font-semibold mb-4">Import Your Historical Data</h2>
    <p class="text-muted-foreground mb-4">
      This will import your expense data from CSV files (2022-2025) into
      CZmoneY.
    </p>

    <div class="space-y-2 text-sm mb-4">
      <p>✅ Income from month headers (JANUARI - 5.605k)</p>
      <p>✅ Expenses from daily entries</p>
      <p>✅ Auto-categorization</p>
      <p>✅ Proper date formatting</p>
    </div>

    {#if !migrating && !results}
      <button
        on:click={startMigration}
        class="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
      >
        Start Migration
      </button>
    {/if}

    {#if migrating}
      <div class="space-y-2">
        <div class="w-full bg-accent rounded-full h-2">
          <div class="bg-primary h-2 rounded-full animate-pulse w-1/2"></div>
        </div>
        <p class="text-sm">{progress}</p>
      </div>
    {/if}

    {#if results}
      <div class="bg-accent/20 p-4 rounded border-l-4 border-primary">
        <h3 class="font-semibold mb-2">Migration Results</h3>
        <div class="space-y-1 text-sm">
          <p>💸 Expenses imported: {results.expenses}</p>
          <p>💰 Income entries: {results.income}</p>
          <p>📅 Date range: {results.dateRange}</p>
          <p>✅ Total transactions: {results.total}</p>
        </div>
        <div class="mt-4">
          <a
            href={resolve("/")}
            class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            View Dashboard
          </a>
        </div>
      </div>
    {/if}
  </div>
</div>
