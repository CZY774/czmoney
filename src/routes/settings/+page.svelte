<script>
  import { onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { syncPendingTransactions, getSyncStatus } from "$lib/services/sync";

  let user: any = null;
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

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user;

    if (!user) {
      goto("/auth/login");
      return;
    }

    await loadProfile();
    await loadSyncStatus();
    loading = false;

    // Monitor online status
    isOffline = !navigator.onLine;
    window.addEventListener("online", () => {
      isOffline = false;
      loadSyncStatus();
    });
    window.addEventListener("offline", () => (isOffline = true));
  });

  async function loadProfile() {
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
        alert("Failed to save profile");
        console.error(error);
      } else {
        alert("Profile saved successfully");
      }
    } catch (error) {
      alert("Error saving profile");
      console.error(error);
    } finally {
      saving = false;
    }
  }

  async function manualSync() {
    if (isOffline) {
      alert("Cannot sync while offline");
      return;
    }

    syncing = true;

    try {
      const result = await syncPendingTransactions();
      await loadSyncStatus();

      if (result.synced > 0) {
        alert(`Successfully synced ${result.synced} transactions`);
      } else if (result.failed > 0) {
        alert(`Failed to sync ${result.failed} transactions`);
      } else {
        alert("No transactions to sync");
      }
    } catch (error) {
      alert("Sync failed");
      console.error(error);
    } finally {
      syncing = false;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    goto("/");
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  }
</script>

<svelte:head>
  <title>Settings - CZmoneY</title>
</svelte:head>

<div class="space-y-6">
  <h1 class="text-3xl font-bold">Settings</h1>

  {#if loading}
    <div class="flex items-center justify-center min-h-64">
      <div class="text-lg">Loading settings...</div>
    </div>
  {:else}
    <!-- Profile Settings -->
    <div class="bg-card p-6 rounded-lg border">
      <h2 class="text-xl font-semibold mb-4">Profile</h2>
      <div class="space-y-4">
        <div>
          <label for="full-name" class="block text-sm font-medium mb-1"
            >Full Name</label
          >
          <input
            id="full-name"
            type="text"
            bind:value={profile.full_name}
            class="w-full p-2 border border-border rounded bg-background"
            placeholder="Your full name"
          />
        </div>

        <div>
          <label for="monthly-income" class="block text-sm font-medium mb-1"
            >Monthly Income (IDR)</label
          >
          <input
            id="monthly-income"
            type="number"
            bind:value={profile.monthly_income}
            class="w-full p-2 border border-border rounded bg-background"
            placeholder="0"
            min="0"
            step="100000"
          />
        </div>

        <div>
          <label for="savings-target" class="block text-sm font-medium mb-1"
            >Monthly Savings Target (IDR)</label
          >
          <input
            id="savings-target"
            type="number"
            bind:value={profile.savings_target}
            class="w-full p-2 border border-border rounded bg-background"
            placeholder="0"
            min="0"
            step="50000"
          />
        </div>

        <div>
          <label for="currency" class="block text-sm font-medium mb-1"
            >Preferred Currency</label
          >
          <select
            id="currency"
            bind:value={profile.preferred_currency}
            class="w-full p-2 border border-border rounded bg-background"
          >
            <option value="IDR">IDR (Indonesian Rupiah)</option>
            <option value="USD">USD (US Dollar)</option>
            <option value="EUR">EUR (Euro)</option>
          </select>
        </div>

        <button
          on:click={saveProfile}
          disabled={saving}
          class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>

    <!-- Sync Status -->
    <div class="bg-card p-6 rounded-lg border">
      <h2 class="text-xl font-semibold mb-4">Offline Sync</h2>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Connection Status</p>
            <p class="text-sm text-muted-foreground">
              {isOffline ? "Offline" : "Online"}
            </p>
          </div>
          <div
            class="w-3 h-3 rounded-full {isOffline
              ? 'bg-red-500'
              : 'bg-green-500'}"
          ></div>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Pending Transactions</p>
            <p class="text-sm text-muted-foreground">
              {syncStatus.pending} transactions waiting to sync
            </p>
          </div>
          <span class="px-2 py-1 text-sm bg-accent rounded">
            {syncStatus.pending}
          </span>
        </div>

        {#if syncStatus.lastSync}
          <div>
            <p class="font-medium">Last Sync</p>
            <p class="text-sm text-muted-foreground">
              {new Date(syncStatus.lastSync).toLocaleString()}
            </p>
          </div>
        {/if}

        <button
          on:click={manualSync}
          disabled={syncing || isOffline || syncStatus.pending === 0}
          class="px-4 py-2 border border-border rounded hover:bg-accent disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>
    </div>

    <!-- Account Info -->
    <div class="bg-card p-6 rounded-lg border">
      <h2 class="text-xl font-semibold mb-4">Account</h2>
      <div class="space-y-4">
        <div>
          <p class="font-medium">Email</p>
          <p class="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <div>
          <p class="font-medium">User ID</p>
          <p class="text-sm text-muted-foreground font-mono">{user?.id}</p>
        </div>

        <button
          on:click={signOut}
          class="px-4 py-2 text-destructive border border-destructive rounded hover:bg-destructive hover:text-destructive-foreground"
        >
          Log Out
        </button>
      </div>
    </div>
  {/if}
</div>
