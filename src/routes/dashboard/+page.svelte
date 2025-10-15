<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/services/supabase';
  import { goto } from '$app/navigation';
  import BalanceChart from '$lib/components/BalanceChart.svelte';
  import CategoryChart from '$lib/components/CategoryChart.svelte';

  let user = null;
  let balance = { income: 0, expense: 0, total: 0 };
  let recentTransactions = [];
  let categoryData = [];
  let loading = true;

  export let data;
  user = data.user;

  onMount(async () => {
    await loadDashboardData();
    loading = false;
  });

  async function loadDashboardData() {
    // Get current month transactions
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*, categories(name)')
      .eq('user_id', user.id)
      .gte('txn_date', startOfMonth.toISOString().split('T')[0])
      .order('txn_date', { ascending: false });

    if (transactions) {
      recentTransactions = transactions.slice(0, 5);
      
      // Calculate balance
      balance.income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      balance.expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      balance.total = balance.income - balance.expense;

      // Calculate category data for chart
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

  function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  }
</script>

<svelte:head>
  <title>Dashboard - CZmoneY</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center min-h-64">
    <div class="text-lg">Loading dashboard...</div>
  </div>
{:else}
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">Dashboard</h1>
    
    <!-- Balance Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-sm font-medium text-muted-foreground">Total Income</h3>
        <p class="text-2xl font-bold text-green-500">{formatCurrency(balance.income)}</p>
      </div>
      
      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-sm font-medium text-muted-foreground">Total Expense</h3>
        <p class="text-2xl font-bold text-red-500">{formatCurrency(balance.expense)}</p>
      </div>
      
      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-sm font-medium text-muted-foreground">Balance</h3>
        <p class="text-2xl font-bold {balance.total >= 0 ? 'text-green-500' : 'text-red-500'}">
          {formatCurrency(balance.total)}
        </p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="flex gap-4">
      <button 
        on:click={() => goto('/transactions')}
        class="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
      >
        Add Transaction
      </button>
      <button 
        on:click={() => goto('/reports')}
        class="px-6 py-3 border border-border rounded-lg hover:bg-accent"
      >
        View Reports
      </button>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <BalanceChart income={balance.income} expense={balance.expense} />
      <CategoryChart categories={categoryData} />
    </div>

    <!-- Recent Transactions -->
    <div class="bg-card p-6 rounded-lg border">
      <h2 class="text-xl font-semibold mb-4">Recent Transactions</h2>
      
      {#if recentTransactions.length === 0}
        <p class="text-muted-foreground">No transactions yet. <a href="/transactions" class="text-primary hover:underline">Add your first transaction</a></p>
      {:else}
        <div class="space-y-3">
          {#each recentTransactions as transaction}
            <div class="flex justify-between items-center py-2 border-b border-border last:border-b-0">
              <div>
                <p class="font-medium">{transaction.description || 'No description'}</p>
                <p class="text-sm text-muted-foreground">{new Date(transaction.txn_date).toLocaleDateString()}</p>
              </div>
              <div class="text-right">
                <p class="font-medium {transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}">
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </p>
                <p class="text-sm text-muted-foreground capitalize">{transaction.type}</p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
