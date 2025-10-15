<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
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

    // Monitor sync status and online state
    if (user) {
      await updateSyncStatus();
      setInterval(updateSyncStatus, 30000); // Update every 30 seconds
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
</script>

<div class="min-h-screen bg-background text-foreground">
  {#if loading}
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-lg">Loading...</div>
    </div>
  {:else if user && $page.url.pathname !== '/'}
    <nav class="border-b border-border bg-card">
      <div class="container mx-auto px-4 py-3 flex justify-between items-center">
        <h1 class="text-xl font-bold">CZmoneY</h1>
        <div class="flex gap-4 items-center">
          <a href="/dashboard" class="hover:text-primary">Dashboard</a>
          <a href="/transactions" class="hover:text-primary">Transactions</a>
          <a href="/reports" class="hover:text-primary">Reports</a>
          <a href="/settings" class="hover:text-primary">Settings</a>
          
          <!-- Sync Status Indicator -->
          {#if syncStatus.pending > 0}
            <div class="flex items-center gap-1 text-orange-500 text-sm">
              <div class="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              {syncStatus.pending} pending
            </div>
          {:else if isOffline}
            <div class="flex items-center gap-1 text-red-500 text-sm">
              <div class="w-2 h-2 bg-red-500 rounded-full"></div>
              Offline
            </div>
          {:else}
            <div class="flex items-center gap-1 text-green-500 text-sm">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              Online
            </div>
          {/if}
          
          <button on:click={signOut} class="hover:text-destructive">Sign Out</button>
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
