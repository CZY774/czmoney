<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { supabase, getSession } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { getSyncStatus } from "$lib/services/sync";
  
  let user = null;
  let loading = true;
  let syncStatus = { pending: 0, lastSync: null };
  let isOffline = false;

  onMount(async () => {
    const { data } = await getSession();
    user = data.session?.user || null;
    loading = false;

    supabase.auth.onAuthStateChange((event, session) => {
      user = session?.user || null;
    });

    if (user) {
      await updateSyncStatus();
      setInterval(updateSyncStatus, 30000);
    }

    isOffline = !navigator.onLine;
    window.addEventListener('online', () => {
      isOffline = false;
      if (user) updateSyncStatus();
    });
    window.addEventListener('offline', () => isOffline = true);
  });

  async function updateSyncStatus() {
    if (user) {
      syncStatus = await getSyncStatus();
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    goto('/');
  }

  function isActive(path) {
    return $page.url.pathname === path;
  }
</script>

<div class="min-h-screen bg-background text-foreground">
  {#if loading}
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-muted-foreground">Loading...</div>
    </div>
  {:else if user && $page.url.pathname !== '/'}
    <nav class="border-b border-border bg-card">
      <div class="container mx-auto px-4 py-3 flex justify-between items-center">
        <div class="flex items-center space-x-2">
          <div class="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <span class="text-primary-foreground font-bold text-xs">CZ</span>
          </div>
          <span class="font-semibold">CZmoneY</span>
        </div>

        <div class="flex items-center space-x-6">
          <a href="/dashboard" class="text-sm {isActive('/dashboard') ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}">Dashboard</a>
          <a href="/transactions" class="text-sm {isActive('/transactions') ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}">Transactions</a>
          <a href="/reports" class="text-sm {isActive('/reports') ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}">Reports</a>
          <a href="/settings" class="text-sm {isActive('/settings') ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}">Settings</a>
          
          {#if syncStatus.pending > 0}
            <div class="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
          {:else if isOffline}
            <div class="w-2 h-2 bg-red-500 rounded-full"></div>
          {:else}
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
          {/if}
          
          <button on:click={signOut} class="text-sm text-muted-foreground hover:text-foreground">Sign Out</button>
        </div>
      </div>
    </nav>
    <main class="container mx-auto p-4">
      <slot />
    </main>
  {:else}
    <slot />
  {/if}
</div>
