<script>
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { supabase } from "$lib/services/supabase";
  import { Eye, EyeOff } from "lucide-svelte";

  let email = "";
  let password = "";
  let loading = false;
  let error = "";
  let showPassword = false;

  async function handleLogin() {
    loading = true;
    error = "";

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      error = authError.message;
    } else {
      goto(resolve("/"));
    }

    loading = false;
  }
</script>

<svelte:head>
  <title>Sign in - CZmoneY</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-6 py-12">
  <div class="w-full max-w-sm">
    <p class="text-sm font-semibold text-blue-text">CZmoneY</p>
    <h1 class="mt-6 text-2xl font-semibold tracking-tight">Sign in</h1>

    {#if error}
      <p class="mt-4 flex items-start gap-2 text-sm text-critical" role="alert">
        <i class="mt-1.5 inline-block size-[9px] flex-none bg-critical [clip-path:polygon(50%_4%,100%_96%,0_96%)]"></i>
        {error}
      </p>
    {/if}

    <form on:submit|preventDefault={handleLogin} class="mt-8 grid gap-5">
      <div>
        <label for="email" class="mb-1.5 block text-sm text-ink-2">Email</label>
        <input id="email" type="email" bind:value={email} required autocomplete="email" placeholder="you@example.com" class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground placeholder:text-ink-3" />
      </div>

      <div>
        <div class="flex items-baseline justify-between">
          <label for="password" class="mb-1.5 block text-sm text-ink-2">Password</label>
          <a href={resolve("/auth/forgot-password")} class="mb-1.5 text-sm text-blue-text hover:underline">Forgot password?</a>
        </div>
        <div class="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            bind:value={password}
            required
            autocomplete="current-password"
            placeholder="Your password"
            class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground placeholder:text-ink-3 pr-12"
          />
          <button
            type="button"
            on:click={() => (showPassword = !showPassword)}
            class="absolute top-0 right-0 grid size-11 place-items-center text-ink-3 hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {#if showPassword}
              <EyeOff size={18} />
            {:else}
              <Eye size={18} />
            {/if}
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading} class="min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/85 disabled:opacity-40 active:scale-[0.98]">
        {loading ? "Signing in" : "Sign in"}
      </button>
    </form>

    <p class="mt-8 text-sm text-ink-2">
      No account yet?
      <a href={resolve("/auth/register")} class="text-blue-text hover:underline">Create one</a>
    </p>
  </div>
</div>
