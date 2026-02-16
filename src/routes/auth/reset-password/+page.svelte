<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { supabase } from "$lib/services/supabase";
  import { toast } from "$lib/stores/toast";

  let password = "";
  let confirmPassword = "";
  let loading = false;
  let validToken = false;

  onMount(async () => {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
      validToken = true;
    } else {
      toast.error("Invalid or expired reset link");
      setTimeout(() => goto(resolve("/auth/forgot-password")), 2000);
    }
  });

  async function handleSubmit() {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    loading = true;

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    loading = false;

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      await supabase.auth.signOut();
      setTimeout(() => goto(resolve("/auth/login")), 1500);
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center px-4 bg-background">
  <div class="max-w-md w-full">
    <div class="bg-card rounded-lg shadow-xl p-8 border border-border">
      {#if validToken}
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold mb-2">Reset Your Password</h2>
          <p class="text-muted-foreground">Enter your new password below.</p>
        </div>

        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
          <div>
            <label for="password" class="block text-sm font-medium mb-2">New Password</label>
            <input
              id="password"
              type="password"
              bind:value={password}
              placeholder="Enter new password"
              required
              minlength="6"
              disabled={loading}
              class="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium mb-2"
              >Confirm Password</label
            >
            <input
              id="confirmPassword"
              type="password"
              bind:value={confirmPassword}
              placeholder="Confirm new password"
              required
              minlength="6"
              disabled={loading}
              class="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            class="w-full py-2.5 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      {:else}
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p class="text-muted-foreground">Verifying reset link...</p>
        </div>
      {/if}
    </div>
  </div>
</div>
