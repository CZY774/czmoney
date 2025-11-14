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
  <title>Login - CZmoneY</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
  <div class="bg-card border border-border rounded-lg w-full max-w-md p-6">
    <h1 class="text-2xl font-bold text-center mb-6">Login</h1>

    {#if error}
      <div class="bg-destructive/10 text-destructive p-3 rounded mb-4">
        {error}
      </div>
    {/if}

    <form on:submit|preventDefault={handleLogin} class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium mb-2">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          class="w-full p-2 border border-border rounded bg-background"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium mb-2"
          >Password</label
        >
        <div class="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            bind:value={password}
            required
            class="w-full p-2 pr-10 border border-border rounded bg-background"
            placeholder="Enter your password"
          />
          <button
            type="button"
            on:click={() => (showPassword = !showPassword)}
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {#if showPassword}
              <EyeOff size={20} />
            {:else}
              <Eye size={20} />
            {/if}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>

    <p class="text-center mt-4 text-sm">
      Don't have an account?
      <a href={resolve("/auth/register")} class="text-primary hover:underline">Register</a>
    </p>
  </div>
</div>
