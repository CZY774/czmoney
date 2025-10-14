<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { supabase, getSession } from "$lib/services/supabase";
  import { formatCurrency } from "$lib/utils";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  
  let user = null;
  let balance = 0;
  let income = 0;
  let expenses = 0;
  let transactions = [];
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
    const { data: txns } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('txn_date', { ascending: false })
      .limit(5);
    
    transactions = txns || [];
    
    income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    balance = income - expenses;
  }
</script>

{#if loading}
  <div class="flex items-center justify-center min-h-64">
    <div class="text-lg">Loading...</div>
  </div>
{:else}
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">Dashboard</h1>
      <Button on:click={() => goto('/transactions')}>Add Transaction</Button>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-6">
        <h3 class="font-semibold text-muted-foreground">Balance</h3>
        <p class="text-2xl font-bold" class:text-green-500={balance >= 0} class:text-red-500={balance < 0}>
          {formatCurrency(balance)}
        </p>
      </Card>
      
      <Card className="p-6">
        <h3 class="font-semibold text-muted-foreground">Income</h3>
        <p class="text-2xl font-bold text-green-500">
          {formatCurrency(income)}
        </p>
      </Card>
      
      <Card className="p-6">
        <h3 class="font-semibold text-muted-foreground">Expenses</h3>
        <p class="text-2xl font-bold text-red-500">
          {formatCurrency(expenses)}
        </p>
      </Card>
    </div>
    
    <Card className="p-6">
      <h2 class="text-xl font-semibold mb-4">Recent Transactions</h2>
      {#if transactions.length === 0}
        <p class="text-muted-foreground">No transactions yet. <a href="/transactions" class="text-primary hover:underline">Add your first transaction</a></p>
      {:else}
        <div class="space-y-2">
          {#each transactions as txn}
            <div class="flex justify-between items-center p-3 border rounded">
              <div>
                <p class="font-medium">{txn.description || 'No description'}</p>
                <p class="text-sm text-muted-foreground">{new Date(txn.txn_date).toLocaleDateString()}</p>
              </div>
              <p class="font-semibold" class:text-green-500={txn.type === 'income'} class:text-red-500={txn.type === 'expense'}>
                {txn.type === 'expense' ? '-' : '+'}{formatCurrency(txn.amount)}
              </p>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  </div>
{/if}
