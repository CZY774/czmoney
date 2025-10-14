<script lang="ts">
  import { onMount } from "svelte";
  import { supabase, getSession } from "$lib/services/supabase";
  import { formatCurrency, formatDate } from "$lib/utils";
  import { queueTransaction, getCachedTransactions, cacheTransactions } from "$lib/services/sync";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  import Input from "$lib/components/ui/input.svelte";
  import Select from "$lib/components/ui/select.svelte";
  
  let user = null;
  let transactions = [];
  let categories = [];
  let loading = true;
  let showForm = false;
  let editingId = null;
  let isOffline = false;
  
  // Form data
  let formData = {
    txn_date: new Date().toISOString().split('T')[0],
    category_id: '',
    type: 'expense',
    amount: '',
    description: ''
  };

  onMount(async () => {
    const { data } = await getSession();
    user = data.session?.user;
    
    if (user) {
      await loadData();
    }
    loading = false;

    // Monitor online status
    isOffline = !navigator.onLine;
    window.addEventListener('online', () => isOffline = false);
    window.addEventListener('offline', () => isOffline = true);
  });

  async function loadData() {
    if (!navigator.onLine) {
      // Load from cache when offline
      transactions = await getCachedTransactions();
      return;
    }

    // Load transactions
    const { data: txns } = await supabase
      .from('transactions')
      .select(`
        *,
        categories(name)
      `)
      .eq('user_id', user.id)
      .order('txn_date', { ascending: false });
    
    transactions = txns || [];

    // Cache for offline use
    await cacheTransactions(transactions);

    // Load categories
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    
    categories = cats || [];
  }

  async function saveTransaction() {
    const data = {
      ...formData,
      amount: parseInt(formData.amount),
      user_id: user.id
    };

    if (!navigator.onLine) {
      // Queue for offline sync
      const tempId = `temp_${Date.now()}`;
      const tempTransaction = {
        id: tempId,
        ...data,
        categories: { name: categories.find(c => c.id === data.category_id)?.name || 'Unknown' },
        _pending: true
      };
      
      transactions = [tempTransaction, ...transactions];
      await queueTransaction(editingId ? 'update' : 'create', editingId ? { ...data, id: editingId } : data);
      
      resetForm();
      return;
    }

    // Online - save directly
    if (editingId) {
      await supabase
        .from('transactions')
        .update(data)
        .eq('id', editingId);
    } else {
      await supabase
        .from('transactions')
        .insert([data]);
    }

    resetForm();
    await loadData();
  }

  async function deleteTransaction(id) {
    if (confirm('Delete this transaction?')) {
      if (!navigator.onLine) {
        // Queue for offline sync
        transactions = transactions.filter(t => t.id !== id);
        await queueTransaction('delete', { id });
        return;
      }

      // Online - delete directly
      await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      await loadData();
    }
  }

  function editTransaction(txn) {
    if (txn._pending) return; // Can't edit pending transactions
    
    formData = {
      txn_date: txn.txn_date,
      category_id: txn.category_id,
      type: txn.type,
      amount: txn.amount.toString(),
      description: txn.description || ''
    };
    editingId = txn.id;
    showForm = true;
  }

  function resetForm() {
    formData = {
      txn_date: new Date().toISOString().split('T')[0],
      category_id: '',
      type: 'expense',
      amount: '',
      description: ''
    };
    editingId = null;
    showForm = false;
  }
</script>

{#if loading}
  <div class="flex items-center justify-center min-h-64">
    <div class="text-lg">Loading...</div>
  </div>
{:else}
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold">Transactions</h1>
        {#if isOffline}
          <p class="text-sm text-yellow-600">📱 Offline mode - changes will sync when online</p>
        {/if}
      </div>
      <Button on:click={() => showForm = !showForm}>
        {showForm ? 'Cancel' : 'Add Transaction'}
      </Button>
    </div>

    {#if showForm}
      <Card className="p-6">
        <h2 class="text-xl font-semibold mb-4">
          {editingId ? 'Edit' : 'Add'} Transaction
        </h2>
        
        <form on:submit|preventDefault={saveTransaction} class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="txn-date" class="block text-sm font-medium mb-2">Date</label>
            <Input id="txn-date" type="date" bind:value={formData.txn_date} required />
          </div>
          
          <div>
            <label for="txn-type" class="block text-sm font-medium mb-2">Type</label>
            <Select id="txn-type" bind:value={formData.type}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </Select>
          </div>
          
          <div>
            <label for="txn-category" class="block text-sm font-medium mb-2">Category</label>
            <Select id="txn-category" bind:value={formData.category_id} required>
              <option value="">Select category</option>
              {#each categories.filter(c => c.type === formData.type) as cat}
                <option value={cat.id}>{cat.name}</option>
              {/each}
            </Select>
          </div>
          
          <div>
            <label for="txn-amount" class="block text-sm font-medium mb-2">Amount (IDR)</label>
            <Input id="txn-amount" type="number" bind:value={formData.amount} required />
          </div>
          
          <div class="md:col-span-2">
            <label for="txn-description" class="block text-sm font-medium mb-2">Description</label>
            <Input id="txn-description" bind:value={formData.description} placeholder="Optional" />
          </div>
          
          <div class="md:col-span-2 flex gap-2">
            <Button type="submit">
              {editingId ? 'Update' : 'Add'} Transaction
            </Button>
            <Button type="button" variant="outline" on:click={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    {/if}

    <Card className="p-6">
      <h2 class="text-xl font-semibold mb-4">Transaction History</h2>
      
      {#if transactions.length === 0}
        <p class="text-muted-foreground">No transactions yet.</p>
      {:else}
        <div class="space-y-2">
          {#each transactions as txn}
            <div class="flex justify-between items-center p-4 border rounded hover:bg-muted/50" 
                 class:bg-yellow-50={txn._pending} class:border-yellow-300={txn._pending}>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{txn.description || 'No description'}</span>
                  <span class="text-xs bg-muted px-2 py-1 rounded">
                    {txn.categories?.name || 'No category'}
                  </span>
                  {#if txn._pending}
                    <span class="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                      Pending sync
                    </span>
                  {/if}
                </div>
                <p class="text-sm text-muted-foreground">
                  {formatDate(txn.txn_date)}
                </p>
              </div>
              
              <div class="flex items-center gap-4">
                <p class="font-semibold" 
                   class:text-green-500={txn.type === 'income'} 
                   class:text-red-500={txn.type === 'expense'}>
                  {txn.type === 'expense' ? '-' : '+'}{formatCurrency(txn.amount)}
                </p>
                
                <div class="flex gap-2">
                  <Button size="sm" variant="outline" on:click={() => editTransaction(txn)} disabled={txn._pending}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" on:click={() => deleteTransaction(txn.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  </div>
{/if}
