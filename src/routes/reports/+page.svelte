<script lang="ts">
  import { onMount } from "svelte";
  import { supabase, getSession } from "$lib/services/supabase";
  import { formatCurrency } from "$lib/utils";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  import Input from "$lib/components/ui/input.svelte";
  import Chart from "$lib/components/Chart.svelte";
  
  let user = null;
  let loading = true;
  let selectedMonth = new Date().toISOString().slice(0, 7);
  let transactions = [];
  let categories = [];
  let summary = {
    income: 0,
    expenses: 0,
    balance: 0
  };
  let categoryBreakdown = [];
  let aiSummary = '';
  let generatingAI = false;

  onMount(async () => {
    const { data } = await getSession();
    user = data.session?.user;
    
    if (user) {
      await loadData();
    }
    loading = false;
  });

  async function loadData() {
    // Load transactions for selected month
    const { data: txns } = await supabase
      .from('transactions')
      .select(`
        *,
        categories(name)
      `)
      .eq('user_id', user.id)
      .gte('txn_date', `${selectedMonth}-01`)
      .lt('txn_date', `${selectedMonth}-32`)
      .order('txn_date', { ascending: false });
    
    transactions = txns || [];

    // Load categories
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);
    
    categories = cats || [];

    // Calculate summary
    summary.income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    summary.expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    summary.balance = summary.income - summary.expenses;

    // Calculate category breakdown
    const categoryTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const catName = t.categories?.name || 'Uncategorized';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + t.amount;
    });

    categoryBreakdown = Object.entries(categoryTotals)
      .map(([name, amount]) => ({ name, amount: Number(amount) }))
      .sort((a, b) => b.amount - a.amount);
  }

  async function generateAISummary() {
    generatingAI = true;
    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth })
      });
      
      const data = await response.json();
      aiSummary = data.summary || 'Unable to generate summary.';
    } catch (error) {
      aiSummary = 'Error generating AI summary.';
    }
    generatingAI = false;
  }

  function exportCSV() {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Description'];
    const rows = transactions.map(t => [
      t.txn_date,
      t.type,
      t.categories?.name || 'Uncategorized',
      t.amount,
      t.description || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Chart data
  $: chartData = {
    series: categoryBreakdown.map(c => c.amount),
    labels: categoryBreakdown.map(c => c.name)
  };

  $: if (selectedMonth) {
    loadData();
  }
</script>

{#if loading}
  <div class="flex items-center justify-center min-h-64">
    <div class="text-lg">Loading...</div>
  </div>
{:else}
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">Reports</h1>
      <div class="flex gap-2">
        <Input type="month" bind:value={selectedMonth} />
        <Button on:click={exportCSV} disabled={transactions.length === 0}>
          Export CSV
        </Button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-6">
        <h3 class="font-semibold text-muted-foreground">Income</h3>
        <p class="text-2xl font-bold text-green-500">
          {formatCurrency(summary.income)}
        </p>
      </Card>
      
      <Card className="p-6">
        <h3 class="font-semibold text-muted-foreground">Expenses</h3>
        <p class="text-2xl font-bold text-red-500">
          {formatCurrency(summary.expenses)}
        </p>
      </Card>
      
      <Card className="p-6">
        <h3 class="font-semibold text-muted-foreground">Balance</h3>
        <p class="text-2xl font-bold" 
           class:text-green-500={summary.balance >= 0} 
           class:text-red-500={summary.balance < 0}>
          {formatCurrency(summary.balance)}
        </p>
      </Card>
    </div>

    <!-- AI Summary -->
    <Card className="p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">AI Insights</h2>
        <Button on:click={generateAISummary} disabled={generatingAI || transactions.length === 0}>
          {generatingAI ? 'Generating...' : 'Generate Summary'}
        </Button>
      </div>
      
      {#if aiSummary}
        <div class="bg-muted/50 p-4 rounded-lg">
          <p class="text-sm">{aiSummary}</p>
        </div>
      {:else}
        <p class="text-muted-foreground text-sm">
          Click "Generate Summary" to get AI-powered insights about your spending.
        </p>
      {/if}
    </Card>

    <!-- Category Breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Chart -->
      <Card className="p-6">
        <h2 class="text-xl font-semibold mb-4">Expense Breakdown</h2>
        {#if categoryBreakdown.length > 0}
          <Chart 
            type="donut"
            series={chartData.series}
            labels={chartData.labels}
            height={300}
          />
        {:else}
          <p class="text-muted-foreground text-center py-8">No expenses to display</p>
        {/if}
      </Card>

      <!-- Category Table -->
      <Card className="p-6">
        <h2 class="text-xl font-semibold mb-4">Category Details</h2>
        {#if categoryBreakdown.length > 0}
          <div class="space-y-2">
            {#each categoryBreakdown as category}
              <div class="flex justify-between items-center p-3 border rounded">
                <span class="font-medium">{category.name}</span>
                <span class="font-semibold text-red-500">
                  {formatCurrency(category.amount)}
                </span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-muted-foreground">No categories to display</p>
        {/if}
      </Card>
    </div>

    <!-- Transaction List -->
    <Card className="p-6">
      <h2 class="text-xl font-semibold mb-4">Transactions ({transactions.length})</h2>
      {#if transactions.length === 0}
        <p class="text-muted-foreground">No transactions for this month.</p>
      {:else}
        <div class="space-y-2 max-h-96 overflow-y-auto">
          {#each transactions as txn}
            <div class="flex justify-between items-center p-3 border rounded text-sm">
              <div>
                <span class="font-medium">{txn.description || 'No description'}</span>
                <span class="text-muted-foreground ml-2">
                  • {txn.categories?.name || 'Uncategorized'}
                </span>
              </div>
              <div class="text-right">
                <p class="font-semibold" 
                   class:text-green-500={txn.type === 'income'} 
                   class:text-red-500={txn.type === 'expense'}>
                  {txn.type === 'expense' ? '-' : '+'}{formatCurrency(txn.amount)}
                </p>
                <p class="text-xs text-muted-foreground">
                  {new Date(txn.txn_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  </div>
{/if}
