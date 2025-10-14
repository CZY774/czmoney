<script lang="ts">
  import { onMount } from "svelte";
  import { supabase, getSession } from "$lib/services/supabase";
  import { formatCurrency } from "$lib/utils";
  import { getSyncStatus, syncPendingTransactions } from "$lib/services/sync";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  import Input from "$lib/components/ui/input.svelte";
  import Select from "$lib/components/ui/select.svelte";
  
  let user = null;
  let profile = null;
  let loading = true;
  let saving = false;
  let syncing = false;
  let syncStatus = { pending: 0, lastSync: null };
  
  let formData = {
    full_name: '',
    monthly_income: '',
    savings_target: '',
    preferred_currency: 'IDR'
  };

  onMount(async () => {
    const { data } = await getSession();
    user = data.session?.user;
    
    if (user) {
      await loadProfile();
      await loadSyncStatus();
    }
    loading = false;
  });

  async function loadProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      profile = data;
      formData = {
        full_name: data.full_name || '',
        monthly_income: data.monthly_income?.toString() || '',
        savings_target: data.savings_target?.toString() || '',
        preferred_currency: data.preferred_currency || 'IDR'
      };
    }
  }

  async function loadSyncStatus() {
    syncStatus = await getSyncStatus();
  }

  async function saveProfile() {
    saving = true;
    
    const profileData = {
      id: user.id,
      full_name: formData.full_name,
      monthly_income: formData.monthly_income ? parseInt(formData.monthly_income) : null,
      savings_target: formData.savings_target ? parseInt(formData.savings_target) : null,
      preferred_currency: formData.preferred_currency
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(profileData);
    
    if (!error) {
      await loadProfile();
    }
    
    saving = false;
  }

  async function manualSync() {
    syncing = true;
    await syncPendingTransactions();
    await loadSyncStatus();
    syncing = false;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // Calculate savings progress
  $: savingsProgress = profile?.monthly_income && profile?.savings_target 
    ? Math.min((profile.savings_target / profile.monthly_income) * 100, 100)
    : 0;
</script>

{#if loading}
  <div class="flex items-center justify-center min-h-64">
    <div class="text-lg">Loading...</div>
  </div>
{:else}
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">Settings</h1>

    <!-- Profile Settings -->
    <Card className="p-6">
      <h2 class="text-xl font-semibold mb-4">Profile Information</h2>
      
      <form on:submit|preventDefault={saveProfile} class="space-y-4">
        <div>
          <label for="full-name" class="block text-sm font-medium mb-2">Full Name</label>
          <Input id="full-name" bind:value={formData.full_name} placeholder="Your full name" />
        </div>
        
        <div>
          <label for="email" class="block text-sm font-medium mb-2">Email</label>
          <Input id="email" value={user?.email || ''} disabled />
        </div>
        
        <div>
          <label for="monthly-income" class="block text-sm font-medium mb-2">Monthly Income (IDR)</label>
          <Input id="monthly-income" type="number" bind:value={formData.monthly_income} placeholder="0" />
        </div>
        
        <div>
          <label for="savings-target" class="block text-sm font-medium mb-2">Monthly Savings Target (IDR)</label>
          <Input id="savings-target" type="number" bind:value={formData.savings_target} placeholder="0" />
        </div>
        
        <div>
          <label for="currency" class="block text-sm font-medium mb-2">Preferred Currency</label>
          <Select id="currency" bind:value={formData.preferred_currency}>
            <option value="IDR">IDR (Indonesian Rupiah)</option>
            <option value="USD">USD (US Dollar)</option>
            <option value="EUR">EUR (Euro)</option>
          </Select>
        </div>
        
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Card>

    <!-- Offline Sync Status -->
    <Card className="p-6">
      <h2 class="text-xl font-semibold mb-4">Offline Sync</h2>
      
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <div>
            <p class="font-medium">Sync Status</p>
            <p class="text-sm text-muted-foreground">
              {syncStatus.pending} pending transactions
            </p>
            {#if syncStatus.lastSync}
              <p class="text-xs text-muted-foreground">
                Last sync: {new Date(syncStatus.lastSync).toLocaleString()}
              </p>
            {/if}
          </div>
          
          <Button on:click={manualSync} disabled={syncing || syncStatus.pending === 0}>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>

        {#if syncStatus.pending > 0}
          <div class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p class="text-sm text-yellow-600">
              You have {syncStatus.pending} transactions waiting to sync. 
              Connect to the internet to sync automatically.
            </p>
          </div>
        {/if}
      </div>
    </Card>

    <!-- Savings Progress -->
    {#if profile?.monthly_income && profile?.savings_target}
      <Card className="p-6">
        <h2 class="text-xl font-semibold mb-4">Savings Goal</h2>
        
        <div class="space-y-4">
          <div class="flex justify-between text-sm">
            <span>Monthly Target: {formatCurrency(profile.savings_target)}</span>
            <span>Income: {formatCurrency(profile.monthly_income)}</span>
          </div>
          
          <div class="w-full bg-muted rounded-full h-2">
            <div 
              class="bg-primary h-2 rounded-full transition-all duration-300"
              style="width: {savingsProgress}%"
            ></div>
          </div>
          
          <p class="text-sm text-muted-foreground">
            {savingsProgress.toFixed(1)}% of income allocated to savings
          </p>
        </div>
      </Card>
    {/if}

    <!-- App Information -->
    <Card className="p-6">
      <h2 class="text-xl font-semibold mb-4">App Information</h2>
      
      <div class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span>Version</span>
          <span>1.0.0</span>
        </div>
        
        <div class="flex justify-between">
          <span>User ID</span>
          <span class="font-mono text-xs">{user?.id?.slice(0, 8)}...</span>
        </div>
        
        <div class="flex justify-between">
          <span>Account Created</span>
          <span>{new Date(user?.created_at).toLocaleDateString()}</span>
        </div>

        <div class="flex justify-between">
          <span>Online Status</span>
          <span class:text-green-500={navigator.onLine} class:text-red-500={!navigator.onLine}>
            {navigator.onLine ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </Card>

    <!-- Danger Zone -->
    <Card className="p-6 border-destructive">
      <h2 class="text-xl font-semibold mb-4 text-destructive">Account Actions</h2>
      
      <div class="space-y-4">
        <div>
          <h3 class="font-medium mb-2">Sign Out</h3>
          <p class="text-sm text-muted-foreground mb-3">
            Sign out of your account on this device.
          </p>
          <Button variant="outline" on:click={signOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </Card>
  </div>
{/if}
