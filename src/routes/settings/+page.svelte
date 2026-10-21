<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { syncPendingTransactions, getSyncStatus } from "$lib/services/sync";
  import { toast } from "$lib/stores/toast";

  let user: { id: string; email?: string } | null = null;
  let profile = {
    full_name: "",
    monthly_income: "",
    savings_target: "",
    preferred_currency: "IDR",
  };
  let syncStatus = { pending: 0, lastSync: null };
  let loading = true;
  let saving = false;
  let syncing = false;
  let isOffline = false;

  function handleOnline() {
    isOffline = false;
    loadSyncStatus();
  }

  function handleOffline() {
    isOffline = true;
  }

  onMount(() => {
    let disposed = false;
    async function initializeSettings() {
      const { data } = await supabase.auth.getSession();
      if (disposed) return;
      user = data.session?.user || null;

      if (!user) {
        goto(resolve("/auth/login"));
        return;
      }

      await loadProfile();
      await loadSyncStatus();
      if (disposed) return;
      loading = false;

      // Monitor online status
      isOffline = !navigator.onLine;
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    void initializeSettings();

    return () => {
      disposed = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  });

  async function loadProfile() {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      profile = {
        full_name: data.full_name || "",
        monthly_income: data.monthly_income || "",
        savings_target: data.savings_target || "",
        preferred_currency: data.preferred_currency || "IDR",
      };
    }
  }

  async function loadSyncStatus() {
    syncStatus = await getSyncStatus();
  }

  async function saveProfile() {
    if (!user) return;
    saving = true;

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: profile.full_name,
        monthly_income: profile.monthly_income
          ? parseInt(profile.monthly_income)
          : null,
        savings_target: profile.savings_target
          ? parseInt(profile.savings_target)
          : null,
        preferred_currency: profile.preferred_currency,
      });

      if (error) {
        toast.error("Failed to save profile");
        console.error(error);
      } else {
        toast.success("Profile saved successfully");
      }
    } catch (error) {
      toast.error("Error saving profile");
      console.error(error);
    } finally {
      saving = false;
    }
  }

  async function manualSync() {
    if (isOffline) {
      toast.warning("Cannot sync while offline");
      return;
    }

    syncing = true;

    try {
      const result = await syncPendingTransactions();
      await loadSyncStatus();

      if (result.synced > 0) {
        toast.success(`Successfully synced ${result.synced} transactions`);
      } else if (result.failed > 0) {
        toast.error(`Failed to sync ${result.failed} transactions`);
      } else {
        toast.info("No transactions to sync");
      }
    } catch (error) {
      toast.error("Sync failed");
      console.error(error);
    } finally {
      syncing = false;
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      goto(resolve("/auth/login"));
    } catch (error) {
      console.error("Sign out error:", error);
      goto(resolve("/auth/login"));
    }
  }
</script>

<svelte:head>
  <title>Settings - CZmoneY</title>
</svelte:head>

<div class="max-w-[1040px] space-y-10">
  <h1 class="text-xl font-semibold tracking-tight">Settings</h1>

  {#if loading}
    <p class="py-16 text-center text-sm text-ink-2">Loading</p>
  {:else}
    <div class="grid gap-10 md:grid-cols-2 md:gap-x-16">
      <!-- Profile -->
      <section aria-labelledby="h-profile" class="border-t border-border pt-5">
        <h2 id="h-profile" class="pb-4 text-[15px] font-semibold">Profile</h2>
        <form class="grid gap-5" on:submit|preventDefault={saveProfile}>
          <div>
            <label for="full-name" class="mb-1.5 block text-sm text-ink-2">Full name</label>
            <input id="full-name" type="text" bind:value={profile.full_name} placeholder="Your full name" class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground placeholder:text-ink-3" />
          </div>

          <div>
            <label for="monthly-income" class="mb-1.5 block text-sm text-ink-2">Monthly income (IDR)</label>
            <input id="monthly-income" type="number" inputmode="numeric" min="0" step="100000" bind:value={profile.monthly_income} placeholder="0" class="amt h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground placeholder:text-ink-3" />
          </div>

          <div>
            <label for="savings-target" class="mb-1.5 block text-sm text-ink-2">Monthly savings target (IDR)</label>
            <input id="savings-target" type="number" inputmode="numeric" min="0" step="50000" bind:value={profile.savings_target} placeholder="0" class="amt h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground placeholder:text-ink-3" />
          </div>

          <div>
            <label for="currency" class="mb-1.5 block text-sm text-ink-2">Preferred currency</label>
            <select id="currency" bind:value={profile.preferred_currency} class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground">
              <option value="IDR">IDR, Indonesian rupiah</option>
              <option value="USD">USD, US dollar</option>
              <option value="EUR">EUR, euro</option>
            </select>
          </div>

          <div>
            <button type="submit" disabled={saving} class="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/85 disabled:opacity-40 active:scale-[0.98]">
              {saving ? "Saving" : "Save profile"}
            </button>
          </div>
        </form>
      </section>

      <!-- Sync -->
      <section aria-labelledby="h-sync" class="border-t border-border pt-5">
        <h2 id="h-sync" class="pb-4 text-[15px] font-semibold">Offline sync</h2>
        <dl class="grid gap-4">
          <div class="flex items-baseline justify-between gap-4">
            <dt class="text-sm text-ink-2">Connection</dt>
            <dd class="flex items-center gap-2 text-[15px]">
              <i class="inline-block size-[9px] {isOffline ? 'bg-warning [clip-path:polygon(50%_4%,100%_96%,0_96%)]' : 'rounded-full bg-blue-text'}"></i>
              {isOffline ? "Offline" : "Online"}
            </dd>
          </div>
          <div class="flex items-baseline justify-between gap-4">
            <dt class="text-sm text-ink-2">Waiting to sync</dt>
            <dd class="amt text-[15px]">{syncStatus.pending}</dd>
          </div>
          {#if syncStatus.lastSync}
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-sm text-ink-2">Last sync</dt>
              <dd class="font-mono text-xs text-ink-3">{new Date(syncStatus.lastSync).toLocaleString()}</dd>
            </div>
          {/if}
        </dl>
        <p class="mt-4 text-sm text-ink-3">Transactions you add offline are kept on this device until they can be sent.</p>
        <button
          type="button"
          on:click={manualSync}
          disabled={syncing || isOffline || syncStatus.pending === 0}
          class="mt-5 min-h-11 rounded-lg border border-rule-strong px-5 text-sm hover:bg-accent disabled:opacity-40"
        >
          {syncing ? "Syncing" : "Sync now"}
        </button>
      </section>

      <!-- Account -->
      <section aria-labelledby="h-account" class="border-t border-border pt-5 md:col-span-2">
        <h2 id="h-account" class="pb-4 text-[15px] font-semibold">Account</h2>
        <dl class="grid gap-4 md:grid-cols-2">
          <div>
            <dt class="text-sm text-ink-2">Email</dt>
            <dd class="mt-1 break-all text-[15px]">{user?.email}</dd>
          </div>
          <div>
            <dt class="text-sm text-ink-2">User ID</dt>
            <dd class="amt mt-1 text-xs break-all text-ink-3">{user?.id}</dd>
          </div>
        </dl>
        <button
          type="button"
          on:click={signOut}
          class="mt-6 min-h-11 rounded-lg border border-critical px-5 text-sm text-critical hover:bg-critical hover:text-white"
        >
          Log out
        </button>
      </section>
    </div>
  {/if}
</div>
