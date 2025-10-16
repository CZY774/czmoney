<script>
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
  let mobileMenuOpen = false;

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
      <div class="container mx-auto px-4 py-3">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-2">
            <div class="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span class="text-primary-foreground font-bold text-xs">CZ</span>
            </div>
            <span class="font-semibold">CZmoneY</span>
          </div>

          <!-- Desktop Menu -->
          <div class="hidden md:flex items-center space-x-6">
            <a href="/" class="text-sm {isActive('/') ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}">Dashboard</a>
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

          <!-- Mobile Menu Button -->
          <button 
            class="md:hidden p-2"
            aria-label="Toggle mobile menu"
            on:click={() => mobileMenuOpen = !mobileMenuOpen}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>

        <!-- Mobile Menu -->
        {#if mobileMenuOpen}
          <div class="md:hidden mt-3 pt-3 border-t border-border">
            <div class="flex flex-col space-y-2">
              <a href="/" class="py-2 text-sm {isActive('/') ? 'text-foreground' : 'text-muted-foreground'}">Dashboard</a>
              <a href="/transactions" class="py-2 text-sm {isActive('/transactions') ? 'text-foreground' : 'text-muted-foreground'}">Transactions</a>
              <a href="/reports" class="py-2 text-sm {isActive('/reports') ? 'text-foreground' : 'text-muted-foreground'}">Reports</a>
              <a href="/settings" class="py-2 text-sm {isActive('/settings') ? 'text-foreground' : 'text-muted-foreground'}">Settings</a>
              <div class="flex items-center justify-between py-2">
                <button on:click={signOut} class="text-sm text-muted-foreground">Sign Out</button>
                {#if syncStatus.pending > 0}
                  <div class="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                {:else if isOffline}
                  <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                {:else}
                  <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>
    </nav>
    <main class="container mx-auto p-4">
      <slot />
    </main>
  {:else}
    <slot />
  {/if}
</div>
