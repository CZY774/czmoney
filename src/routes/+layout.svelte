<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { supabase, getSession } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { getSyncStatus } from "$lib/services/sync";
  import Toast from "$lib/components/Toast.svelte";
  import { startIdleTimer, stopIdleTimer } from "$lib/utils/idle-logout";
  import { preloadCriticalData, handleVisibilityChange } from "$lib/utils/pwa-perf";

  let user: { id: string; email?: string } | null = null;
  let loading = true;
  let syncStatus = { pending: 0, lastSync: null };
  let isOffline = false;
  let mobileMenuOpen = false;

  onMount(async () => {
    // Simplified SW registration
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        
        // Handle updates without blocking
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Show update available notification instead of blocking
                console.log('Update available - will apply on next visit');
              }
            });
          }
        });
      } catch (error) {
        console.log('SW registration failed:', error);
      }
    }

    const { data } = await getSession();
    user = data.session?.user || null;
    loading = false;

    supabase.auth.onAuthStateChange((event, session) => {
      user = session?.user || null;
      
      // Start/stop idle timer based on auth state
      if (user) {
        startIdleTimer();
      } else {
        stopIdleTimer();
      }
    });

    if (user) {
      await updateSyncStatus();
      setInterval(updateSyncStatus, 30000);
      startIdleTimer(); // Start idle timer for logged in user
      preloadCriticalData(); // Preload critical routes
    }

    // Handle app visibility changes for better PWA performance
    handleVisibilityChange();

    isOffline = !navigator.onLine;
    window.addEventListener("online", () => {
      isOffline = false;
      if (user) updateSyncStatus();
    });
    window.addEventListener("offline", () => (isOffline = true));
  });

  async function updateSyncStatus() {
    if (user) {
      syncStatus = await getSyncStatus();
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    goto(resolve("/"));
  }

  function isActive(path: string) {
    return $page.url.pathname === path;
  }
</script>

<div class="min-h-screen bg-background text-foreground">
  {#if loading}
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-muted-foreground">Loading...</div>
    </div>
  {:else if user}
    <nav class="border-b border-border bg-card/50 backdrop-blur">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-14 sm:h-16">
          <span class="font-semibold text-base sm:text-lg">CZmoneY</span>

          <!-- Desktop Menu -->
          <div class="hidden md:flex items-center space-x-8">
            <a
              href={resolve("/")}
              class="text-sm font-medium transition-colors {isActive('/')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'}"
            >
              Dashboard
            </a>
            <a
              href={resolve("/transactions")}
              data-sveltekit-preload-data
              class="text-sm font-medium transition-colors {isActive(
                '/transactions'
              )
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'}"
            >
              Transactions
            </a>
            <a
              href={resolve("/budgets")}
              data-sveltekit-preload-data
              class="text-sm font-medium transition-colors {isActive('/budgets')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'}"
            >
              Budgets
            </a>
            <a
              href={resolve("/reports")}
              data-sveltekit-preload-data
              class="text-sm font-medium transition-colors {isActive('/reports')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'}"
            >
              Reports
            </a>
            <a
              href={resolve("/settings")}
              data-sveltekit-preload-data
              class="text-sm font-medium transition-colors {isActive(
                '/settings'
              )
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'}"
            >
              Settings
            </a>

            <div class="flex items-center space-x-3">
              {#if syncStatus.pending > 0}
                <div
                  class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"
                  title="Syncing..."
                ></div>
              {:else if isOffline}
                <div
                  class="w-2 h-2 bg-red-500 rounded-full"
                  title="Offline"
                ></div>
              {:else}
                <div
                  class="w-2 h-2 bg-green-500 rounded-full"
                  title="Online"
                ></div>
              {/if}

              <button
                on:click={signOut}
                class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          <!-- Mobile Menu Button -->
          <button
            type="button"
            class="md:hidden p-1.5 rounded-md hover:bg-accent"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            on:click={() => (mobileMenuOpen = !mobileMenuOpen)}
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-hidden="true"
            >
              <title>Menu</title>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        <!-- Mobile Menu -->
        {#if mobileMenuOpen}
          <div id="mobile-menu" class="md:hidden py-3 border-t border-border">
            <div class="flex flex-col space-y-2">
              <a
                href={resolve("/")}
                on:click={() => (mobileMenuOpen = false)}
                class="py-2 text-sm font-medium {isActive('/')
                  ? 'text-primary'
                  : 'text-muted-foreground'}"
              >
                Dashboard
              </a>
              <a
                href={resolve("/transactions")}
                data-sveltekit-preload-data
                on:click={() => (mobileMenuOpen = false)}
                class="py-2 text-sm font-medium {isActive('/transactions')
                  ? 'text-primary'
                  : 'text-muted-foreground'}"
              >
                Transactions
              </a>
              <a
                href={resolve("/budgets")}
                data-sveltekit-preload-data
                on:click={() => (mobileMenuOpen = false)}
                class="py-2 text-sm font-medium {isActive('/budgets')
                  ? 'text-primary'
                  : 'text-muted-foreground'}"
              >
                Budgets
              </a>
              <a
                href={resolve("/reports")}
                data-sveltekit-preload-data
                on:click={() => (mobileMenuOpen = false)}
                class="py-2 text-sm font-medium {isActive('/reports')
                  ? 'text-primary'
                  : 'text-muted-foreground'}"
              >
                Reports
              </a>
              <a
                href={resolve("/settings")}
                data-sveltekit-preload-data
                on:click={() => (mobileMenuOpen = false)}
                class="py-2 text-sm font-medium {isActive('/settings')
                  ? 'text-primary'
                  : 'text-muted-foreground'}"
              >
                Settings
              </a>
              <div class="flex items-center justify-between py-2 border-t border-border mt-2 pt-3">
                <button
                  on:click={signOut}
                  class="text-sm font-medium text-muted-foreground"
                >
                  Sign Out
                </button>
                {#if syncStatus.pending > 0}
                  <div
                    class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"
                  ></div>
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

    <main class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      <slot />
    </main>
  {:else}
    <slot />
  {/if}
</div>

<Toast />
