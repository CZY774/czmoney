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

  onMount(() => {
    async function initializeResetPassword() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        validToken = true;
      } else {
        toast.error("Invalid or expired reset link");
        setTimeout(() => goto(resolve("/auth/forgot-password")), 2000);
      }
    }

    void initializeResetPassword();
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

<svelte:head>
  <title>New password - CZmoneY</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-6 py-12">
  <div class="w-full max-w-sm">
    {#if validToken}
      <p class="text-sm font-semibold text-blue-text">CZmoneY</p>
      <h1 class="mt-6 text-2xl font-semibold tracking-tight">Choose a new password</h1>

      <form on:submit|preventDefault={handleSubmit} class="mt-8 grid gap-5">
        <div>
          <label for="password" class="mb-1.5 block text-sm text-ink-2">New password</label>
          <input id="password" type="password" bind:value={password} placeholder="At least 6 characters" required minlength="6" disabled={loading} autocomplete="new-password" class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground placeholder:text-ink-3" />
        </div>
        <div>
          <label for="confirmPassword" class="mb-1.5 block text-sm text-ink-2">Confirm password</label>
          <input id="confirmPassword" type="password" bind:value={confirmPassword} placeholder="Type it again" required minlength="6" disabled={loading} autocomplete="new-password" class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground placeholder:text-ink-3" />
        </div>
        <button type="submit" disabled={loading} class="min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/85 disabled:opacity-40 active:scale-[0.98]">
          {loading ? "Updating" : "Update password"}
        </button>
      </form>
    {:else}
      <p class="text-sm font-semibold text-blue-text">CZmoneY</p>
      <p class="mt-6 text-[15px] text-ink-2" role="status">Checking your reset link</p>
    {/if}
  </div>
</div>
