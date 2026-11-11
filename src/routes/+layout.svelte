<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { supabase, getSession } from "$lib/services/supabase";
  import { afterNavigate, goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { getSyncStatus } from "$lib/services/sync";
  import Toast from "$lib/components/Toast.svelte";
  import WelcomeModal from "$lib/components/WelcomeModal.svelte";
  import { startIdleTimer, stopIdleTimer } from "$lib/utils/idle-logout";
  import {
    preloadCriticalData,
    handleVisibilityChange,
  } from "$lib/utils/pwa-perf";
  import { registerServiceWorkerUpdateHandler } from "$lib/services/serviceWorkerUpdate";
  import { checkForUpdates } from "$lib/services/versionCheck";
  import { toast } from "$lib/stores/toast";
  import { requestAddTransaction } from "$lib/stores/addTransaction";
  import { clearPageCache } from "$lib/stores/pageCache";
  import { injectAnalytics } from "@vercel/analytics/sveltekit";

  injectAnalytics();

  let user: { id: string; email?: string } | null = null;
  let loading = true;
  let syncStatus = { pending: 0, lastSync: null };
  let isOffline = false;
  let showWelcomeModal = false;
  let syncStatusInterval: ReturnType<typeof setInterval> | null = null;
  let appVersionInterval: ReturnType<typeof setInterval> | null = null;
  let cleanupVisibilityChange: (() => void) | null = null;
  let cleanupServiceWorkerUpdate: (() => void) | null = null;
  let authSubscription: { unsubscribe: () => void } | null = null;

  function handleOnline() {
    isOffline = false;
    if (user) updateSyncStatus();
  }

  function handleOffline() {
    isOffline = true;
  }

  onMount(() => {
    async function initializeClient() {
      // Register service worker with update detection
      if ("serviceWorker" in navigator) {
        cleanupServiceWorkerUpdate = registerServiceWorkerUpdateHandler();
      }

      const { data } = await getSession();
      user = data.session?.user || null;
      loading = false;

      const { data: authState } = supabase.auth.onAuthStateChange(
        (event, session) => {
          user = session?.user || null;

          // Every sign-out path (layout, Settings, idle timeout, password reset)
          // ends here, so cached pages of the old session are dropped once
          if (event === "SIGNED_OUT") clearPageCache();

          // Redirect to reset password page on PASSWORD_RECOVERY event
          if (event === "PASSWORD_RECOVERY") {
            goto(resolve("/auth/reset-password"));
            return;
          }

          // Start/stop idle timer based on auth state
          if (user) {
            startIdleTimer();
          } else {
            stopIdleTimer();
          }
        },
      );
      authSubscription = authState.subscription;

      if (user) {
        await updateSyncStatus();
        syncStatusInterval = setInterval(updateSyncStatus, 30000);
        startIdleTimer();
        preloadCriticalData();

        // Check onboarding status
        await checkOnboardingStatus();

        // Check for updates every 5 minutes
        checkAppVersion();
        appVersionInterval = setInterval(checkAppVersion, 5 * 60 * 1000);
      }

      cleanupVisibilityChange = handleVisibilityChange();

      isOffline = !navigator.onLine;
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    void initializeClient();

    return () => {
      if (syncStatusInterval) clearInterval(syncStatusInterval);
      if (appVersionInterval) clearInterval(appVersionInterval);
      cleanupVisibilityChange?.();
      cleanupServiceWorkerUpdate?.();
      authSubscription?.unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      stopIdleTimer();
    };
  });

  async function checkOnboardingStatus() {
    if (!user) return;

    // Small delay to ensure profile is created by trigger
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Profile fetch error:", error);
        return;
      }

      // Show modal if profile doesn't exist or onboarding not completed
      if (!profile || profile.onboarding_completed !== true) {
        showWelcomeModal = true;
      }
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
    }
  }

  async function completeOnboarding() {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          { id: user.id, onboarding_completed: true },
          { onConflict: "id" },
        );

      if (error) {
        console.error("Failed to update onboarding:", error);
      }
    } catch (error) {
      console.error("Failed to update onboarding status:", error);
    }
  }

  async function checkAppVersion() {
    const { hasUpdate } = await checkForUpdates();
    if (hasUpdate) {
      toast.info(
        "A new version is available! Refresh to update.",
        "Update Available",
        {
          label: "Refresh",
          callback: () => window.location.reload(),
        },
      );
    }
  }

  async function updateSyncStatus() {
    if (user) {
      syncStatus = await getSyncStatus();
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      user = null;
      goto(resolve("/auth/login"));
    } catch (error) {
      console.error("Sign out error:", error);
      user = null;
      goto(resolve("/auth/login"));
    }
  }

  let cameFromApp = false;

  afterNavigate((navigation) => {
    cameFromApp = !!navigation.from;
  });

  $: currentPath = $page.url.pathname;
  $: isActive = pathMatcher(currentPath);

  function pathMatcher(current: string) {
    return (path: string) => current === path;
  }

  function closeSettings() {
    if (cameFromApp) history.back();
    else goto(resolve("/"));
  }

  $: syncState = isOffline
    ? "offline"
    : syncStatus.pending > 0
      ? "syncing"
      : "synced";
  $: syncLabel = { offline: "Offline", syncing: "Syncing", synced: "Synced" }[
    syncState
  ];
  $: syncShape =
    syncState === "offline"
      ? "bg-warning [clip-path:polygon(50%_4%,100%_96%,0_96%)]"
      : syncState === "syncing"
        ? "rounded-full border-[1.5px] border-ink-3"
        : "rounded-full bg-ink-3";
</script>

<div class="min-h-screen bg-background text-foreground">
  {#if loading}
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-muted-foreground text-sm">Loading</div>
    </div>
  {:else if user}
    <svg class="absolute h-0 w-0 overflow-hidden" aria-hidden="true" focusable="false">
      <symbol id="i-dash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></symbol>
      <symbol id="i-list" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h.01M3 12h.01M3 18h.01M8 6h13M8 12h13M8 18h13"/></symbol>
      <symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></symbol>
      <symbol id="i-target" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></symbol>
      <symbol id="i-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16M18 17V9M13 17V5M8 17v-3"/></symbol>
      <symbol id="i-gear" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></symbol>
      <symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></symbol>
      <symbol id="i-out" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></symbol>
    </svg>

    <div class="min-h-screen md:grid md:grid-cols-[92px_minmax(0,1fr)] wide:grid-cols-[232px_minmax(0,1fr)]">
      <!-- Mobile header: brand, sync state, settings. Navigation sits at the bottom. -->
      <header class="flex items-center justify-between px-4 pt-4 md:hidden">
        <span class="text-base font-semibold tracking-tight">CZmoneY</span>
        <div class="flex items-center gap-2">
          <span class="flex items-center gap-2 text-xs text-ink-3">
            <i class="inline-block size-[9px] {syncShape}"></i>{syncLabel}
          </span>
          {#if isActive("/settings")}
            <button
              type="button"
              aria-label="Close settings"
              on:click={closeSettings}
              class="-mr-3 grid size-11 place-items-center rounded-lg text-ink-2 hover:text-foreground"
            >
              <svg class="size-5" aria-hidden="true"><use href="#i-x" /></svg>
            </button>
          {:else}
            <a
              href={resolve("/settings")}
              aria-label="Settings"
              class="-mr-3 grid size-11 place-items-center rounded-lg text-ink-2 hover:text-foreground"
            >
              <svg class="size-5" aria-hidden="true"><use href="#i-gear" /></svg>
            </a>
          {/if}
        </div>
      </header>

      <nav
        aria-label="Primary"
        class="fixed inset-x-0 bottom-0 z-50 flex items-stretch gap-1 border-t border-border bg-background px-2 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))] md:sticky md:top-0 md:col-start-1 md:row-start-1 md:h-dvh md:flex-col md:self-start md:border-t-0 md:border-r md:px-1.5 md:py-5 wide:px-4 wide:py-6"
      >
        <a
          href={resolve("/")}
          class="hidden items-center justify-center md:order-first md:flex md:h-8 wide:justify-start wide:gap-2.5 wide:px-3"
          aria-label="CZmoneY"
        >
          <span class="font-mono text-sm font-medium tracking-wide text-blue-text wide:hidden">CZ</span>
          <span class="hidden text-[17px] font-semibold tracking-tight wide:inline">CZmoneY</span>
        </a>

        <a
          href={resolve("/")}
          data-sveltekit-preload-data
          aria-current={isActive("/") ? "page" : undefined}
          class="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] leading-none md:flex-none md:min-h-14 wide:min-h-10 wide:flex-row wide:justify-start wide:gap-3 wide:px-3 wide:text-sm {isActive('/') ? 'text-blue-text wide:bg-primary/15 wide:text-foreground' : 'text-ink-3 hover:text-foreground'}"
        >
          <svg class="size-5 flex-none" aria-hidden="true"><use href="#i-dash" /></svg>
          <!-- Under 320px (Galaxy Fold cover) the labels do not fit; icons only, labels stay for screen readers -->
          <span class="max-[20rem]:sr-only">Dashboard</span>
        </a>
        <a
          href={resolve("/transactions")}
          data-sveltekit-preload-data
          aria-current={isActive("/transactions") ? "page" : undefined}
          class="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] leading-none md:flex-none md:min-h-14 wide:min-h-10 wide:flex-row wide:justify-start wide:gap-3 wide:px-3 wide:text-sm {isActive('/transactions') ? 'text-blue-text wide:bg-primary/15 wide:text-foreground' : 'text-ink-3 hover:text-foreground'}"
        >
          <svg class="size-5 flex-none" aria-hidden="true"><use href="#i-list" /></svg>
          <span class="max-[20rem]:sr-only">Transactions</span>
        </a>

        <a
          href={resolve("/transactions")}
          on:click={requestAddTransaction}
          aria-label="Add transaction"
          class="flex h-11 w-14 flex-none items-center justify-center self-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/85 active:scale-95 md:order-first md:mx-2 md:my-4 md:h-12 md:w-auto md:self-stretch wide:mx-0 wide:mb-4 wide:mt-5 wide:gap-2 wide:text-sm wide:font-semibold"
        >
          <svg class="size-5.5" aria-hidden="true"><use href="#i-plus" /></svg>
          <span class="hidden wide:inline">Add transaction</span>
        </a>

        <a
          href={resolve("/budgets")}
          data-sveltekit-preload-data
          aria-current={isActive("/budgets") ? "page" : undefined}
          class="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] leading-none md:flex-none md:min-h-14 wide:min-h-10 wide:flex-row wide:justify-start wide:gap-3 wide:px-3 wide:text-sm {isActive('/budgets') ? 'text-blue-text wide:bg-primary/15 wide:text-foreground' : 'text-ink-3 hover:text-foreground'}"
        >
          <svg class="size-5 flex-none" aria-hidden="true"><use href="#i-target" /></svg>
          <span class="max-[20rem]:sr-only">Budgets</span>
        </a>
        <a
          href={resolve("/reports")}
          data-sveltekit-preload-data
          aria-current={isActive("/reports") ? "page" : undefined}
          class="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] leading-none md:flex-none md:min-h-14 wide:min-h-10 wide:flex-row wide:justify-start wide:gap-3 wide:px-3 wide:text-sm {isActive('/reports') ? 'text-blue-text wide:bg-primary/15 wide:text-foreground' : 'text-ink-3 hover:text-foreground'}"
        >
          <svg class="size-5 flex-none" aria-hidden="true"><use href="#i-chart" /></svg>
          <span class="max-[20rem]:sr-only">Reports</span>
        </a>

        <div class="hidden md:mt-auto md:flex md:flex-col md:gap-1">
          <span class="hidden items-center gap-2 px-3 pb-2 text-xs text-ink-3 md:flex">
            <i class="inline-block size-[9px] {syncShape}"></i>{syncLabel}
          </span>
          <a
            href={resolve("/settings")}
            data-sveltekit-preload-data
            aria-current={isActive("/settings") ? "page" : undefined}
            class="flex min-h-10 items-center justify-start gap-3 rounded-lg px-3 text-sm {isActive('/settings') ? 'text-blue-text wide:bg-primary/15 wide:text-foreground' : 'text-ink-3 hover:text-foreground'}"
          >
            <svg class="size-5 flex-none" aria-hidden="true"><use href="#i-gear" /></svg>
            <span class="hidden wide:inline">Settings</span>
          </a>
          <button
            type="button"
            on:click={signOut}
            class="flex min-h-10 items-center justify-start gap-3 rounded-lg px-3 text-sm text-ink-3 hover:text-foreground"
          >
            <svg class="size-5 flex-none" aria-hidden="true"><use href="#i-out" /></svg>
            <span class="hidden wide:inline">Sign out</span>
          </button>
        </div>
      </nav>

      <main class="min-w-0 px-4 pt-4 pb-28 sm:px-6 md:col-start-2 md:row-start-1 md:px-8 md:pt-8 md:pb-14 wide:px-12 wide:pt-10">
        <slot />
      </main>
    </div>

    <WelcomeModal
      bind:open={showWelcomeModal}
      on:complete={completeOnboarding}
      on:skip={completeOnboarding}
    />
  {:else}
    <slot />
  {/if}
</div>

<Toast />
