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

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
  {#if loading}
    <div class="min-h-screen flex items-center justify-center">
      <div class="flex flex-col items-center space-y-4">
        <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div class="text-lg font-medium">Loading CZmoneY...</div>
      </div>
    </div>
  {:else if user && $page.url.pathname !== '/'}
    <!-- Enhanced Navigation -->
    <nav class="bg-slate-800/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center h-16">
          <!-- Logo -->
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">CZ</span>
            </div>
            <h1 class="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              CZmoneY
            </h1>
          </div>

          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center space-x-1">
            <a 
              href="/dashboard" 
              class="px-4 py-2 rounded-lg transition-all duration-200 {isActive('/dashboard') ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}"
            >
              <span class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
                </svg>
                <span>Dashboard</span>
              </span>
            </a>
            <a 
              href="/transactions" 
              class="px-4 py-2 rounded-lg transition-all duration-200 {isActive('/transactions') ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}"
            >
              <span class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <span>Transactions</span>
              </span>
            </a>
            <a 
              href="/reports" 
              class="px-4 py-2 rounded-lg transition-all duration-200 {isActive('/reports') ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}"
            >
              <span class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <span>Reports</span>
              </span>
            </a>
            <a 
              href="/settings" 
              class="px-4 py-2 rounded-lg transition-all duration-200 {isActive('/settings') ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}"
            >
              <span class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span>Settings</span>
              </span>
            </a>
          </div>

          <!-- Status & User Menu -->
          <div class="flex items-center space-x-4">
            <!-- Sync Status -->
            {#if syncStatus.pending > 0}
              <div class="flex items-center space-x-2 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
                <div class="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                <span class="hidden sm:inline">{syncStatus.pending} pending</span>
              </div>
            {:else if isOffline}
              <div class="flex items-center space-x-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                <div class="w-2 h-2 bg-red-400 rounded-full"></div>
                <span class="hidden sm:inline">Offline</span>
              </div>
            {:else}
              <div class="flex items-center space-x-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                <span class="hidden sm:inline">Online</span>
              </div>
            {/if}

            <!-- User Menu -->
            <button 
              on:click={signOut} 
              class="flex items-center space-x-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              <span class="hidden sm:inline">Log Out</span>
            </button>

            <!-- Mobile Menu Button -->
            <button 
              class="md:hidden p-2 text-slate-300 hover:text-white"
              on:click={() => mobileMenuOpen = !mobileMenuOpen}
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile Menu -->
        {#if mobileMenuOpen}
          <div class="md:hidden py-4 border-t border-slate-700/50">
            <div class="flex flex-col space-y-2">
              <a href="/dashboard" class="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg">Dashboard</a>
              <a href="/transactions" class="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg">Transactions</a>
              <a href="/reports" class="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg">Reports</a>
              <a href="/settings" class="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg">Settings</a>
            </div>
          </div>
        {/if}
      </div>
    </nav>

    <main class="container mx-auto px-4 py-6">
      <slot />
    </main>
  {:else}
    <slot />
  {/if}
</div>
