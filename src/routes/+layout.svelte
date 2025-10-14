<script>
  import "../app.css";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { supabase, getSession } from "$lib/services/supabase";
  import { setupSyncListeners, processPendingQueue } from "$lib/services/sync";

  let user = null;
  let loading = true;
  let isOnline = true;

  onMount(async () => {
    // Check initial session
    const { session } = await getSession();
    user = session?.user || null;
    loading = false;

    // Setup auth state listener
    supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user || null;

      if (!user && !$page.url.pathname.startsWith("/auth")) {
        goto("/auth/login");
      }
    });

    // Setup sync listeners if logged in
    if (user) {
      setupSyncListeners(user.id);
      processPendingQueue(user.id);
    }

    // Track online status
    isOnline = navigator.onLine;
    window.addEventListener("online", () => (isOnline = true));
    window.addEventListener("offline", () => (isOnline = false));
  });

  const publicRoutes = ["/auth/login", "/auth/register"];
  $: isPublicRoute = publicRoutes.includes($page.url.pathname);
</script>

<svelte:head>
  <title>CZmoneY - Personal Finance Manager</title>
  <meta name="description" content="Track your finances effortlessly" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center min-h-screen">
    <div class="spinner"></div>
  </div>
{:else if !user && !isPublicRoute}
  <div class="flex items-center justify-center min-h-screen">
    <div class="spinner"></div>
  </div>
{:else}
  <div class="min-h-screen">
    {#if user && !isPublicRoute}
      <!-- Navigation -->
      <nav class="bg-card border-b border-card/50 sticky top-0 z-50">
        <div class="container">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center space-x-8">
              <a href="/" class="text-xl font-bold text-accent">CZmoneY</a>
              <div class="hidden md:flex space-x-4">
                <a
                  href="/"
                  class="text-muted hover:text-white transition-colors"
                  >Dashboard</a
                >
                <a
                  href="/transactions"
                  class="text-muted hover:text-white transition-colors"
                  >Transactions</a
                >
                <a
                  href="/reports"
                  class="text-muted hover:text-white transition-colors"
                  >Reports</a
                >
                <a
                  href="/settings"
                  class="text-muted hover:text-white transition-colors"
                  >Settings</a
                >
              </div>
            </div>

            <div class="flex items-center space-x-4">
              {#if !isOnline}
                <span class="text-xs bg-danger/20 text-danger px-2 py-1 rounded"
                  >Offline</span
                >
              {/if}
              <span class="text-sm text-muted">{user.email}</span>
            </div>
          </div>
        </div>
      </nav>

      <!-- Mobile Bottom Nav -->
      <div
        class="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-card/50 z-50"
      >
        <div class="flex justify-around py-2">
          <a
            href="/"
            class="flex flex-col items-center p-2 text-muted hover:text-accent transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span class="text-xs mt-1">Home</span>
          </a>
          <a
            href="/transactions"
            class="flex flex-col items-center p-2 text-muted hover:text-accent transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span class="text-xs mt-1">Transactions</span>
          </a>
          <a
            href="/reports"
            class="flex flex-col items-center p-2 text-muted hover:text-accent transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span class="text-xs mt-1">Reports</span>
          </a>
          <a
            href="/settings"
            class="flex flex-col items-center p-2 text-muted hover:text-accent transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span class="text-xs mt-1">Settings</span>
          </a>
        </div>
      </div>
    {/if}

    <main class="pb-20 md:pb-8">
      <slot />
    </main>
  </div>
{/if}
