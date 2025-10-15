<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/services/supabase';
  import { goto } from '$app/navigation';
  import CategoryChart from '$lib/components/CategoryChart.svelte';

  let user = null;
  let selectedMonth = new Date().toISOString().slice(0, 7);
  let monthlyData = { income: 0, expense: 0, balance: 0, transactions: [] };
  let categoryData = [];
  let aiSummary = '';
  let loading = true;
  let generatingAI = false;

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user;
    
    if (!user) {
      goto('/auth/login');
      return;
    }

    await loadMonthlyData();
    loading = false;
  });

  async function loadMonthlyData() {
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*, categories(name)')
      .eq('user_id', user.id)
      .gte('txn_date', startDate)
      .lte('txn_date', endDate)
      .order('txn_date', { ascending: false });

    if (transactions) {
      monthlyData.transactions = transactions;
      monthlyData.income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      monthlyData.expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      monthlyData.balance = monthlyData.income - monthlyData.expense;

      // Calculate category data
      const categoryTotals = {};
      transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          const categoryName = t.categories?.name || 'No Category';
          categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + t.amount;
        });

      categoryData = Object.entries(categoryTotals)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);
    }
  }

  async function generateAISummary() {
    if (!monthlyData.transactions.length) {
      alert('No transactions found for this month');
      return;
    }

    generatingAI = true;
    aiSummary = '';

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ month: selectedMonth })
      });

      const result = await response.json();

      if (response.ok) {
        aiSummary = result.summary;
      } else {
        alert(result.error || 'Failed to generate AI summary');
      }
    } catch (error) {
      alert('Error generating AI summary');
      console.error(error);
    } finally {
      generatingAI = false;
    }
  }

  function exportCSV() {
    if (!monthlyData.transactions.length) {
      alert('No transactions to export');
      return;
    }

    const headers = ['Date', 'Type', 'Category', 'Amount', 'Description'];
    const rows = monthlyData.transactions.map(t => [
      t.txn_date,
      t.type,
      t.categories?.name || 'No Category',
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

  function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  }

  // Reload data when month changes
  $: if (selectedMonth && user) {
    loadMonthlyData();
    aiSummary = ''; // Clear previous AI summary
  }
</script>

<svelte:head>
  <title>Reports - CZmoneY</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-3xl font-bold">Reports</h1>
    <div class="flex gap-3">
      <button 
        on:click={exportCSV}
        class="px-4 py-2 border border-border rounded-lg hover:bg-accent"
      >
        Export CSV
      </button>
    </div>
  </div>

  <!-- Month Selector -->
  <div class="bg-card p-4 rounded-lg border">
    <label for="month-select" class="block text-sm font-medium mb-2">Select Month</label>
    <input 
      id="month-select"
      type="month" 
      bind:value={selectedMonth}
      class="p-2 border border-border rounded bg-background"
    />
  </div>

  {#if loading}
    <div class="flex items-center justify-center min-h-64">
      <div class="text-lg">Loading reports...</div>
    </div>
  {:else}
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-sm font-medium text-muted-foreground">Total Income</h3>
        <p class="text-2xl font-bold text-green-500">{formatCurrency(monthlyData.income)}</p>
      </div>
      
      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-sm font-medium text-muted-foreground">Total Expense</h3>
        <p class="text-2xl font-bold text-red-500">{formatCurrency(monthlyData.expense)}</p>
      </div>
      
      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-sm font-medium text-muted-foreground">Net Balance</h3>
        <p class="text-2xl font-bold {monthlyData.balance >= 0 ? 'text-green-500' : 'text-red-500'}">
          {formatCurrency(monthlyData.balance)}
        </p>
      </div>
    </div>

    <!-- AI Summary -->
    <div class="bg-card p-6 rounded-lg border">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">AI Insights</h2>
        <button 
          on:click={generateAISummary}
          disabled={generatingAI || !monthlyData.transactions.length}
          class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          {generatingAI ? 'Generating...' : 'Generate Summary'}
        </button>
      </div>
      
      {#if aiSummary}
        <div class="p-4 bg-accent/20 rounded border-l-4 border-primary">
          <p class="text-sm leading-relaxed">{aiSummary}</p>
        </div>
      {:else if !monthlyData.transactions.length}
        <p class="text-muted-foreground">No transactions found for this month. Add some transactions to get AI insights.</p>
      {:else}
        <p class="text-muted-foreground">Click "Generate Summary" to get AI-powered insights about your spending patterns.</p>
      {/if}
    </div>

    <!-- Category Chart -->
    {#if categoryData.length > 0}
      <CategoryChart categories={categoryData} />
    {/if}

    <!-- Category Breakdown Table -->
    {#if categoryData.length > 0}
      <div class="bg-card rounded-lg border">
        <div class="p-4 border-b border-border">
          <h2 class="text-xl font-semibold">Category Breakdown</h2>
        </div>
        <div class="divide-y divide-border">
          {#each categoryData as category}
            <div class="p-4 flex justify-between items-center">
              <span class="font-medium">{category.name}</span>
              <span class="font-semibold text-red-500">{formatCurrency(category.amount)}</span>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="bg-card p-8 rounded-lg border text-center">
        <p class="text-muted-foreground">No expense data available for this month.</p>
      </div>
    {/if}
  {/if}
</div>
