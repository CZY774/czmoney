<script lang="ts">
  import { supabase } from "$lib/services/supabase";
  import { toast } from "$lib/stores/toast";
  import { resolve } from "$app/paths";

  let email = "";
  let loading = false;
  let emailSent = false;

  async function handleSubmit() {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    loading = true;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    loading = false;

    if (error) {
      toast.error(error.message);
    } else {
      emailSent = true;
      toast.success("Password reset link sent! Check your email.");
    }
  }
</script>

<svelte:head>
  <title>Reset password - CZmoneY</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-6 py-12">
  <div class="w-full max-w-sm">
    {#if emailSent}
      <p class="text-sm font-semibold text-blue-text">CZmoneY</p>
      <h1 class="mt-6 text-2xl font-semibold tracking-tight">Check your email</h1>
      <p class="mt-3 text-[15px] text-ink-2">
        A reset link is on its way to <span class="text-foreground">{email}</span>.
      </p>
      <p class="mt-2 text-sm text-ink-3">The link expires in one hour.</p>
      <a href={resolve("/auth/login")} class="mt-8 inline-flex min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/85 disabled:opacity-40 active:scale-[0.98] items-center justify-center">Back to sign in</a>
    {:else}
      <p class="text-sm font-semibold text-blue-text">CZmoneY</p>
      <h1 class="mt-6 text-2xl font-semibold tracking-tight">Forgot your password?</h1>
      <p class="mt-2 text-[15px] text-ink-2">Enter your email and we'll send a link to reset it.</p>

      <form on:submit|preventDefault={handleSubmit} class="mt-8 grid gap-5">
        <div>
          <label for="email" class="mb-1.5 block text-sm text-ink-2">Email</label>
          <input id="email" type="email" bind:value={email} placeholder="you@example.com" required disabled={loading} class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground placeholder:text-ink-3" />
        </div>
        <button type="submit" disabled={loading} class="min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/85 disabled:opacity-40 active:scale-[0.98]">
          {loading ? "Sending" : "Send reset link"}
        </button>
      </form>

      <p class="mt-8 text-sm">
        <a href={resolve("/auth/login")} class="text-blue-text hover:underline">Back to sign in</a>
      </p>
    {/if}
  </div>
</div>
