<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { supabase, getUser, signOut } from "$lib/services/supabase";
  import { parseAmount } from "$lib/utils";
  import { processPendingQueue, getPendingCount } from "$lib/services/sync";

  let user = null;
  let profile = null;
  let loading = true;
  let saving = false;
  let syncing = false;
  let pendingCount = 0;
  let error = "";
  let success = "";

  // Profile form
  let profileForm = {
    full_name: "",
    monthly_income: "",
    savings_target: "",
    preferred_currency: "IDR",
  };

  // Reminder form
  let reminderForm = {
    enabled: false,
    frequency: "weekly",
    time: "09:00",
  };

  onMount(async () => {
    const { user: currentUser } = await getUser();
    user = currentUser;

    if (user) {
      await loadProfile();
      pendingCount = await getPendingCount();

      // Check notification permission
      if ("Notification" in window && Notification.permission === "default") {
        // Notification permission not yet asked
      }
    }
  });

  async function loadProfile() {
    loading = true;

    try {
      const { data, error: loadError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (loadError) throw loadError;

      profile = data;
      profileForm = {
        full_name: data.full_name || "",
        monthly_income: data.monthly_income || "",
        savings_target: data.savings_target || "",
        preferred_currency: data.preferred_currency || "IDR",
      };
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      loading = false;
    }
  }

  async function saveProfile() {
    error = "";
    success = "";
    saving = true;

    try {
      const updateData = {
        full_name: profileForm.full_name.trim(),
        monthly_income: parseAmount(profileForm.monthly_income),
        savings_target: parseAmount(profileForm.savings_target),
        preferred_currency: profileForm.preferred_currency,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (updateError) throw updateError;

      profile = { ...profile, ...updateData };
      success = "Profile updated successfully!";

      setTimeout(() => {
        success = "";
      }, 3000);
    } catch (err) {
      error = err.message || "Failed to update profile";
    } finally {
      saving = false;
    }
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) {
      alert("Notifications are not supported in this browser");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      success = "Notifications enabled!";
      reminderForm.enabled = true;
    } else {
      error = "Notification permission denied";
    }
  }

  async function syncNow() {
    syncing = true;

    try {
      const result = await processPendingQueue(user.id);

      if (result.success) {
        if (result.synced > 0) {
          success = `Synced ${result.synced} transaction(s) successfully!`;
          pendingCount = result.remaining || 0;
        } else {
          success = "Already up to date!";
        }
      } else {
        throw new Error(result.error || "Sync failed");
      }
    } catch (err) {
      error = err.message || "Failed to sync";
    } finally {
      syncing = false;
      setTimeout(() => {
        success = "";
        error = "";
      }, 3000);
    }
  }

  async function handleSignOut() {
    if (!confirm("Are you sure you want to sign out?")) return;

    await signOut();
    goto("/auth/login");
  }
</script>

<div class="container py-6 fade-in max-w-3xl">
  <h1 class="text-2xl font-bold text-white mb-6">Settings</h1>

  {#if loading}
    <div class="flex justify-center py-12">
      <div class="spinner"></div>
    </div>
  {:else}
    <!-- Success/Error Messages -->
    {#if error}
      <div
        class="bg-danger/10 border border-danger/50 text-danger px-4 py-3 rounded-lg mb-4"
      >
        {error}
      </div>
    {/if}

    {#if success}
      <div
        class="bg-success/10 border border-success/50 text-success px-4 py-3 rounded-lg mb-4"
      >
        {success}
      </div>
    {/if}

    <!-- Profile Section -->
    <div class="card p-6 mb-6">
      <h2 class="text-xl font-semibold text-white mb-4">Profile</h2>

      <form on:submit|preventDefault={saveProfile}>
        <div class="mb-4">
          <label for="full-name" class="label">Full Name</label>
          <input
            id="full-name"
            bind:value={profileForm.full_name}
            class="input"
            placeholder="Your name"
          />
        </div>

        <div class="mb-4">
          <label for="email" class="label">Email</label>
          <input
            id="email"
            value={user.email}
            class="input"
            disabled
            title="Email cannot be changed"
          />
        </div>

        <div class="mb-4">
          <label for="monthly-income" class="label">Monthly Income</label>
          <input
            id="monthly-income"            type="number"
            bind:value={profileForm.monthly_income}
            class="input"
            placeholder="0"
            step="1000"
          />
          <p class="text-xs text-muted mt-1">
            This helps calculate your savings progress
          </p>
        </div>

        <div class="mb-4">
          <label for="savings-target" class="label">Monthly Savings Target</label>
          <input
            type="number"
            id="savings-target"            bind:value={profileForm.savings_target}
            class="input"
            placeholder="0"
            step="1000"
          />
          <p class="text-xs text-muted mt-1">
            Set a goal to track your monthly savings
          </p>
        </div>

        <div class="mb-6">
          <label for="currency" class="label">Preferred Currency</label>
          <select id="currency" bind:value={profileForm.preferred_currency} class="input">
            <option value="IDR">IDR (Indonesian Rupiah)</option>
            <option value="USD">USD (US Dollar)</option>
            <option value="EUR">EUR (Euro)</option>
          </select>
        </div>

        <button type="submit" class="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>

    <!-- Sync Section -->
    <div class="card p-6 mb-6">
      <h2 class="text-xl font-semibold text-white mb-4">Offline Sync</h2>

      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-white mb-1">Pending Transactions</p>
          <p class="text-sm text-muted">
            {pendingCount} transaction(s) waiting to sync
          </p>
        </div>

        <button
          on:click={syncNow}
          class="btn-primary"
          disabled={syncing || pendingCount === 0}
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      <div class="bg-background rounded-lg p-4">
        <p class="text-muted text-sm">
          CZmoneY automatically syncs your data when you're online. Transactions
          created offline will be synced when connection is restored.
        </p>
      </div>
    </div>

    <!-- Reminders Section -->
    <div class="card p-6 mb-6">
      <h2 class="text-xl font-semibold text-white mb-4">Reminders</h2>

      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <label class="text-white">Enable Reminders</label>
          <button
            on:click={requestNotificationPermission}
            class="btn-secondary text-sm"
            disabled={reminderForm.enabled}
          >
            {reminderForm.enabled ? "Enabled" : "Enable"}
          </button>
        </div>
        <p class="text-xs text-muted">
          Get reminders to record your daily expenses and stay on track
        </p>
      </div>

      {#if reminderForm.enabled}
        <div class="mb-4">
          <label for="frequency" class="label">Frequency</label>
          <select id="frequency" bind:value={reminderForm.frequency} class="input">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div class="mb-4">
          <label for="reminder-time" class="label">Time</label>
          <input id="reminder-time" type="time" bind:value={reminderForm.time} class="input" />
        </div>
      {/if}
    </div>

    <!-- Account Section -->
    <div class="card p-6 mb-6">
      <h2 class="text-xl font-semibold text-white mb-4">Account</h2>

      <div class="space-y-4">
        <div>
          <p class="text-muted text-sm mb-2">Account created</p>
          <p class="text-white">
            {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>

        <div class="pt-4 border-t border-muted/20">
          <button on:click={handleSignOut} class="btn-danger">
            Sign Out
          </button>
        </div>
      </div>
    </div>

    <!-- App Info -->
    <div class="card p-6">
      <h2 class="text-xl font-semibold text-white mb-4">About</h2>

      <div class="space-y-2 text-sm">
        <p class="text-muted">
          <strong class="text-white">CZmoneY</strong> v0.1.0
        </p>
        <p class="text-muted">
          A personal finance manager built with SvelteKit, Supabase, and AI
        </p>
        <p class="text-muted">Made with ❤️ for better financial management</p>
      </div>
    </div>
  {/if}
</div>
