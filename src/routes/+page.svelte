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

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user;
    
    if (user) {
      await loadDashboardData();
    }
    
    loading = false;
  });

  async function loadDashboardData() {
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
      
      balance.income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      balance.expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      balance.total = balance.income - balance.expense;

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
  <title>{user ? 'Dashboard' : 'Welcome'} - CZmoneY</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center min-h-64">
    <div class="text-lg text-muted-foreground">Loading...</div>
  </div>
{:else if !user}
  <!-- Landing Page -->
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="border-b border-border bg-card/50 backdrop-blur">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span class="text-primary-foreground font-bold text-sm">CZ</span>
            </div>
            <span class="font-semibold text-lg">CZmoneY</span>
          </div>
          <div class="flex items-center space-x-4">
            <a href="/auth/login" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Login
            </a>
            <a href="/auth/register" class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors">
              Register
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <main class="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto text-center">
        <h1 class="text-4xl sm:text-6xl font-bold mb-6">
          Take Control of Your
          <span class="text-primary">Finances</span>
        </h1>
        <p class="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Track expenses, set savings goals, and get AI-powered insights. 
          Your personal finance manager that works offline.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a href="/auth/register" class="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-lg transition-colors">
            Get Started Free
          </a>
          <a href="/auth/login" class="px-8 py-3 border border-border rounded-lg hover:bg-accent font-medium text-lg transition-colors">
            Sign In
          </a>
        </div>

        <!-- Features -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div class="bg-card p-6 rounded-lg border border-border">
            <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Smart Tracking</h3>
            <p class="text-muted-foreground">Automatically categorize transactions and visualize spending patterns with interactive charts.</p>
          </div>
          
          <div class="bg-card p-6 rounded-lg border border-border">
            <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Works Offline</h3>
            <p class="text-muted-foreground">Add transactions anywhere, anytime. Automatically syncs when you're back online.</p>
          </div>
          
          <div class="bg-card p-6 rounded-lg border border-border">
            <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">AI Insights</h3>
            <p class="text-muted-foreground">Get personalized financial advice and spending insights powered by AI.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
{:else}
  <!-- Dashboard for authenticated users -->
  <div class="space-y-8">
    <h1 class="text-4xl font-bold">Dashboard</h1>
    
    <!-- Balance Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-card p-6 rounded-lg border border-border">
        <h3 class="text-sm font-medium text-muted-foreground mb-2">Total Income</h3>
        <p class="text-3xl font-bold text-green-400">{formatCurrency(balance.income)}</p>
      </div>
      
      <div class="bg-card p-6 rounded-lg border border-border">
        <h3 class="text-sm font-medium text-muted-foreground mb-2">Total Expense</h3>
        <p class="text-3xl font-bold text-red-400">{formatCurrency(balance.expense)}</p>
      </div>
      
      <div class="bg-card p-6 rounded-lg border border-border">
        <h3 class="text-sm font-medium text-muted-foreground mb-2">Balance</h3>
        <p class="text-3xl font-bold {balance.total >= 0 ? 'text-green-400' : 'text-red-400'}">
          {formatCurrency(balance.total)}
        </p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="flex gap-4">
      <button 
        on:click={() => goto('/transactions')}
        class="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
      >
        Add Transaction
      </button>
      <button 
        on:click={() => goto('/reports')}
        class="px-6 py-3 border border-border rounded-lg hover:bg-accent font-medium"
      >
        View Reports
      </button>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="bg-card p-6 rounded-lg border border-border">
        <h2 class="text-xl font-semibold mb-4">Income vs Expense</h2>
        <BalanceChart income={balance.income} expense={balance.expense} />
      </div>
      
      <div class="bg-card p-6 rounded-lg border border-border">
        <h2 class="text-xl font-semibold mb-4">Expense Categories</h2>
        <CategoryChart categories={categoryData} />
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="bg-card p-6 rounded-lg border border-border">
      <h2 class="text-xl font-semibold mb-6">Recent Transactions</h2>
      
      {#if recentTransactions.length === 0}
        <p class="text-muted-foreground text-center py-8">
          No transactions yet. 
          <a href="/transactions" class="text-primary hover:underline">Add your first transaction</a>
        </p>
      {:else}
        <div class="space-y-4">
          {#each recentTransactions as transaction}
            <div class="flex justify-between items-center py-3 border-b border-border last:border-b-0">
              <div>
                <p class="font-medium">{transaction.description || 'No description'}</p>
                <p class="text-sm text-muted-foreground">{new Date(transaction.txn_date).toLocaleDateString()}</p>
              </div>
              <div class="text-right">
                <p class="font-semibold {transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}">
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
