<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import {
    syncPendingTransactions,
    getSyncStatus,
    listPendingTransactions,
    retryPendingTransaction,
    discardPendingTransaction,
    clearTransactionCache,
    type PendingItem,
  } from "$lib/services/sync";
  import { toast } from "$lib/stores/toast";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { localDateString } from "$lib/utils/localDate";
  import { readPageCache, writePageCache } from "$lib/stores/pageCache";

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

  // Invested assets: dated snapshots for the dashboard 4% rule
  let snapshots: Array<{ id: string; as_of: string; amount: number }> = [];
  let snapshot = { amount: "", as_of: localDateString(new Date()) };
  let snapshotSaving = false;
  let showDeleteSnapshotConfirm = false;
  let snapshotToDelete: string | null = null;

  // Offline queue: items waiting to reach the server
  let pendingItems: PendingItem[] = [];
  let retryingId: string | null = null;
  let showDiscardConfirm = false;
  let discardId: string | null = null;

  // The profile form as last filled from the cache. The background refresh only
  // replaces the form while it still equals this, so typing is never overwritten.
  let profileFromCache: string | null = null;

  function saveSettingsCache() {
    if (!user) return;
    writePageCache(`settings:${user.id}`, { profile: { ...profile }, snapshots: [...snapshots] });
  }

  function handleOnline() {
    isOffline = false;
    loadSyncStatus();
  }

  function handleSyncStatusChanged() {
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

      const cached = readPageCache<{ profile: typeof profile; snapshots: typeof snapshots }>(`settings:${user.id}`);
      if (cached) {
        profile = { ...cached.profile };
        profileFromCache = JSON.stringify(profile);
        snapshots = [...cached.snapshots];
        loading = false;
      }

      await Promise.all([loadProfile(), loadSyncStatus(), loadSnapshots()]);
      if (disposed) return;
      loading = false;

      // Monitor online status
      isOffline = !navigator.onLine;
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    window.addEventListener("syncStatusChanged", handleSyncStatusChanged);
    void initializeSettings();

    return () => {
      disposed = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("syncStatusChanged", handleSyncStatusChanged);
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
      const fresh = {
        full_name: data.full_name || "",
        monthly_income: data.monthly_income || "",
        savings_target: data.savings_target || "",
        preferred_currency: data.preferred_currency || "IDR",
      };
      if (profileFromCache === null || JSON.stringify(profile) === profileFromCache) {
        profile = fresh;
      }
      profileFromCache = null;
      saveSettingsCache();
    }
  }

  async function loadSyncStatus() {
    syncStatus = await getSyncStatus();
    pendingItems = await listPendingTransactions();
  }

  async function retryItem(id: string) {
    retryingId = id;
    try {
      const ok = await retryPendingTransaction(id);
      if (ok) {
        toast.success("Transaction synced");
        await clearTransactionCache();
      } else {
        toast.error("Still could not sync this transaction");
      }
    } catch {
      toast.error("Still could not sync this transaction");
    } finally {
      retryingId = null;
    }
    await loadSyncStatus();
  }

  function askDiscard(id: string) {
    discardId = id;
    showDiscardConfirm = true;
  }

  async function confirmDiscard() {
    if (!discardId) return;
    const id = discardId;
    discardId = null;
    await discardPendingTransaction(id);
    await loadSyncStatus();
  }

  function pendingLabel(item: PendingItem): string {
    const description = String(item.data.description ?? "");
    return item.action === "update" ? `Edit: ${description}` : description;
  }

  function failureText(item: PendingItem): string {
    const times = item.retryCount === 1 ? "time" : "times";
    const reason = item.lastError ? ` (${item.lastError})` : "";
    return `Failed ${item.retryCount} ${times}${reason}`;
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
        saveSettingsCache();
      }
    } catch (error) {
      toast.error("Error saving profile");
      console.error(error);
    } finally {
      saving = false;
    }
  }

  async function loadSnapshots() {
    if (!user) return;
    const { data } = await supabase
      .from("investment_snapshots")
      .select("id, as_of, amount")
      .eq("user_id", user.id)
      .order("as_of", { ascending: false });

    if (data) {
      snapshots = data;
      saveSettingsCache();
    }
  }

  async function saveSnapshot() {
    if (!user) return;
    const amount = parseFloat(snapshot.amount);
    if (!Number.isFinite(amount) || amount < 0) return;

    snapshotSaving = true;
    try {
      const { error } = await supabase.from("investment_snapshots").upsert(
        {
          user_id: user.id,
          as_of: snapshot.as_of,
          amount,
        },
        { onConflict: "user_id,as_of" },
      );

      if (error) {
        toast.error("Failed to save invested assets");
      } else {
        toast.success("Invested assets saved");
        snapshot = { amount: "", as_of: localDateString(new Date()) };
        await loadSnapshots();
      }
    } catch {
      toast.error("Error saving invested assets");
    } finally {
      snapshotSaving = false;
    }
  }

  function deleteSnapshot(id: string) {
    snapshotToDelete = id;
    showDeleteSnapshotConfirm = true;
  }

  async function confirmDeleteSnapshot() {
    if (!snapshotToDelete) return;

    const { error } = await supabase
      .from("investment_snapshots")
      .delete()
      .eq("id", snapshotToDelete);

    if (error) {
      toast.error("Failed to delete invested assets");
    } else {
      toast.success("Snapshot deleted");
      await loadSnapshots();
    }

    snapshotToDelete = null;
  }

  function formatSnapshotDate(isoDate: string) {
    const [year, month, day] = isoDate.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
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

<div class="mx-auto max-w-[1040px] space-y-10">
  <header class="flex items-center justify-between gap-4">
    <h1 class="text-xl font-semibold tracking-tight">Settings</h1>
    <button
      type="button"
      on:click={signOut}
      class="flex-none min-h-11 rounded-lg border border-critical px-5 text-sm text-critical hover:bg-critical hover:text-white"
    >
      Log out
    </button>
  </header>

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

        {#if pendingItems.length > 0}
          <ul class="mt-4">
            {#each pendingItems as item (item.id)}
              {@const isDelete = item.action === "delete"}
              <li class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-border py-3">
                <div class="min-w-0">
                  <div class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    {#if isDelete}
                      <span class="text-[15px]">Delete a transaction</span>
                    {:else}
                      <span class="text-[15px] whitespace-nowrap">{formatSnapshotDate(String(item.data.txn_date))}</span>
                      <span class="amt text-[15px] whitespace-nowrap">{formatCurrency(Number(item.data.amount))}</span>
                    {/if}
                  </div>
                  {#if !isDelete}
                    <p class="mt-0.5 text-sm break-words text-ink-2">{pendingLabel(item)}</p>
                  {/if}
                  {#if item.retryCount > 0}
                    <p class="mt-1 text-xs break-words text-ink-3">{failureText(item)}</p>
                  {/if}
                </div>
                <div class="flex flex-none items-center">
                  <button
                    type="button"
                    on:click={() => retryItem(item.id)}
                    disabled={isOffline || retryingId === item.id}
                    class="min-h-11 px-3 text-[13px] text-blue-text underline-offset-4 hover:underline disabled:opacity-40"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    on:click={() => askDiscard(item.id)}
                    class="min-h-11 px-3 text-[13px] text-critical underline-offset-4 hover:underline"
                  >
                    Discard
                  </button>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
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

      <!-- Invested assets -->
      <section aria-labelledby="h-assets" class="border-t border-border pt-5">
        <h2 id="h-assets" class="pb-4 text-[15px] font-semibold">Invested assets</h2>
        <p class="mb-5 text-sm text-ink-3">Record what your investments are worth on a date. The dashboard compares the latest record with 25 times your yearly expenses (the 4% rule).</p>
        <form class="grid gap-5" on:submit|preventDefault={saveSnapshot}>
          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label for="snapshot-amount" class="mb-1.5 block text-sm text-ink-2">Amount (IDR)</label>
              <input id="snapshot-amount" type="number" inputmode="numeric" min="0" step="1" required bind:value={snapshot.amount} placeholder="0" class="amt h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground placeholder:text-ink-3" />
            </div>
            <div>
              <label for="snapshot-date" class="mb-1.5 block text-sm text-ink-2">As of</label>
              <input id="snapshot-date" type="date" required bind:value={snapshot.as_of} class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground" />
            </div>
          </div>
          <div>
            <button type="submit" disabled={snapshotSaving} class="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/85 disabled:opacity-40 active:scale-[0.98]">
              {snapshotSaving ? "Saving" : "Save snapshot"}
            </button>
          </div>
        </form>

        {#if snapshots.length === 0}
          <p class="mt-6 text-sm text-ink-2">No snapshots yet.</p>
        {:else}
          <ul class="mt-6">
            {#each snapshots as item (item.id)}
              <li class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-border py-3">
                <!-- Wraps the amount under the date when both do not fit (Fold cover screens) -->
                <div class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span class="text-[15px] whitespace-nowrap">{formatSnapshotDate(item.as_of)}</span>
                  <span class="amt text-[15px] whitespace-nowrap">{formatCurrency(item.amount)}</span>
                </div>
                <button
                  type="button"
                  on:click={() => deleteSnapshot(item.id)}
                  class="min-h-10 text-[13px] text-critical underline-offset-4 hover:underline"
                >
                  Delete
                </button>
              </li>
            {/each}
          </ul>
        {/if}
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
      </section>
    </div>
  {/if}
</div>

<ConfirmDialog
  bind:open={showDeleteSnapshotConfirm}
  title="Delete Snapshot"
  message="Are you sure you want to delete this invested assets snapshot? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  danger={true}
  on:confirm={confirmDeleteSnapshot}
/>

<ConfirmDialog
  bind:open={showDiscardConfirm}
  title="Discard this transaction?"
  message="It has not reached the server and will be deleted from this device."
  confirmText="Discard"
  cancelText="Cancel"
  danger={true}
  on:confirm={confirmDiscard}
/>
