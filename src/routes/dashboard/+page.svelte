<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { supabase, getSession } from "$lib/services/supabase";
  import { formatCurrency } from "$lib/utils";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  
  let user = null;
  let profile = null;
  let balance = 0;
  let income = 0;
  let expenses = 0;
  let transactions = [];
  let savingsProgress = 0;
  let loading = true;

  onMount(async () => {
    const { data } = await getSession();
    user = data.session?.user;
    
    if (!user) {
      goto('/auth/login');
      return;
    }
    
    await loadData();
    loading = false;
  });

  async function loadData() {
    // Get profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    profile = profileData;
    
    // Get recent transactions
    const { data: txns } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('txn_date', { ascending: false })
      .limit(5);
    
    transactions = txns || [];
    
    // Calculate current month totals
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const { data: monthlyTxns } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('txn_date', startOfMonth.toISOString().split('T')[0])
      .lte('txn_date', endOfMonth.toISOString().split('T')[0]);
    
    const monthlyTransactions = monthlyTxns || [];
    
    income = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    expenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    balance = income - expenses;
    
    if (profile?.savings_target && income > 0) {
      savingsProgress = Math.min((balance / profile.savings_target) * 100, 100);
    }
  }
  
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }
</script>

<svelte:head>
  <title>Dashboard - CZmoneY</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center min-h-64">
    <div class="text-lg">Loading your dashboard...</div>
  </div>
{:else}
  <div class="space-y-6">
    <!-- Welcome Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold">{getGreeting()}!</h1>
        <p class="text-muted-foreground">Welcome back to your financial journey</p>
      </div>
      <Button on:click={() => goto('/transactions')} className="bg-gradient-to-r from-blue-600 to-emerald-600">
        <span class="mr-2">+</span>
        Add Transaction
      </Button>
    </div>
    
    <!-- Balance Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-6 bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 border-emerald-700/30">
        <h3 class="font-semibold text-emerald-200">This Month's Balance</h3>
        <p class="text-3xl font-bold mt-2" class:text-emerald-400={balance >= 0} class:text-red-400={balance < 0}>
          {formatCurrency(balance)}
        </p>
        <p class="text-sm text-emerald-300/70 mt-1">
          {balance >= 0 ? "Great job staying positive!" : "Time to review spending"}
        </p>
      </Card>
      
      <Card className="p-6 bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/30">
        <h3 class="font-semibold text-blue-200">Income</h3>
        <p class="text-3xl font-bold text-blue-400 mt-2">
          {formatCurrency(income)}
        </p>
        <p class="text-sm text-blue-300/70 mt-1">This month</p>
      </Card>
      
      <Card className="p-6 bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-700/30">
        <h3 class="font-semibold text-red-200">Expenses</h3>
        <p class="text-3xl font-bold text-red-400 mt-2">
          {formatCurrency(expenses)}
        </p>
        <p class="text-sm text-red-300/70 mt-1">This month</p>
      </Card>
    </div>
    
    <!-- Savings Progress -->
    {#if profile?.savings_target}
    <Card className="p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Monthly Savings Target</h3>
        <span class="text-sm text-muted-foreground">{Math.round(savingsProgress)}%</span>
      </div>
      <div class="w-full bg-muted rounded-full h-3 mb-2">
        <div 
          class="bg-gradient-to-r from-emerald-500 to-blue-500 h-3 rounded-full transition-all duration-500"
          style="width: {savingsProgress}%"
        ></div>
      </div>
      <div class="flex justify-between text-sm text-muted-foreground">
        <span>{formatCurrency(balance)} saved</span>
        <span>Target: {formatCurrency(profile.savings_target)}</span>
      </div>
    </Card>
    {/if}
    
    <!-- Recent Transactions -->
    <Card className="p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Recent Transactions</h2>
        <Button variant="outline" on:click={() => goto('/transactions')}>
          View All
        </Button>
      </div>
      
      {#if transactions.length === 0}
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-2xl">📝</span>
          </div>
          <p class="text-muted-foreground mb-4">No transactions yet</p>
          <Button on:click={() => goto('/transactions')}>Add your first transaction</Button>
        </div>
      {:else}
        <div class="space-y-3">
          {#each transactions as txn}
            <div class="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center {txn.type === 'income' ? 'bg-emerald-500/20' : 'bg-red-500/20'}">
                  <span class="text-sm">
                    {txn.type === 'income' ? '💰' : '💸'}
                  </span>
                </div>
                <div>
                  <p class="font-medium">{txn.description || 'No description'}</p>
                  <p class="text-sm text-muted-foreground">
                    {new Date(txn.txn_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p class="font-semibold" 
                 class:text-emerald-500={txn.type === 'income'} 
                 class:text-red-500={txn.type === 'expense'}>
                {txn.type === 'expense' ? '-' : '+'}{formatCurrency(txn.amount)}
              </p>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
    
    <!-- Quick Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer" on:click={() => goto('/reports')}>
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
            <span class="text-xl">📊</span>
          </div>
          <div>
            <h3 class="font-semibold">View Reports</h3>
            <p class="text-sm text-muted-foreground">Analyze your spending patterns</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer" on:click={() => goto('/settings')}>
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
            <span class="text-xl">⚙️</span>
          </div>
          <div>
            <h3 class="font-semibold">Settings</h3>
            <p class="text-sm text-muted-foreground">Manage your profile and preferences</p>
          </div>
        </div>
      </Card>
    </div>
    
    <!-- Motivational Footer -->
    <Card className="p-6 bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-slate-600/50 text-center">
      <p class="text-slate-300 font-medium">
        💡 Remember: Don't spend too much, always save wisely
      </p>
      <p class="text-slate-400 text-sm mt-2">
        Every smart decision today builds your wealth tomorrow
      </p>
    </Card>
  </div>
{/if}
