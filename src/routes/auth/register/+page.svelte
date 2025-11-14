<script>
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { supabase } from "$lib/services/supabase";
  import { Eye, EyeOff } from "lucide-svelte";

  let email = "";
  let password = "";
  let confirmPassword = "";
  let loading = false;
  let error = "";
  let showPassword = false;
  let showConfirmPassword = false;

  async function handleRegister() {
    if (password !== confirmPassword) {
      error = "Passwords don't match";
      return;
    }

    if (password.length < 6) {
      error = "Password must be at least 6 characters";
      return;
    }

    loading = true;
    error = "";

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      error = authError.message;
    } else {
      alert(
        "Registration successful! Please check your email to verify your account."
      );
      goto(resolve("/auth/login"));
    }

    loading = false;
  }
</script>

<svelte:head>
  <title>Register - CZmoneY</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
  <div class="bg-card border border-border rounded-lg w-full max-w-md p-6">
    <h1 class="text-2xl font-bold text-center mb-6">Register</h1>

    {#if error}
      <div class="bg-destructive/10 text-destructive p-3 rounded mb-4">
        {error}
      </div>
    {/if}

    <form on:submit|preventDefault={handleRegister} class="space-y-4">
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
            minlength="6"
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

      <div>
        <label for="confirmPassword" class="block text-sm font-medium mb-2"
          >Confirm Password</label
        >
        <div class="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            bind:value={confirmPassword}
            required
            minlength="6"
            class="w-full p-2 pr-10 border border-border rounded bg-background"
            placeholder="Confirm your password"
          />
          <button
            type="button"
            on:click={() => (showConfirmPassword = !showConfirmPassword)}
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {#if showConfirmPassword}
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
        {loading ? "Creating account..." : "Register"}
      </button>
    </form>

    <p class="text-center mt-4 text-sm">
      Already have an account?
      <a href={resolve("/auth/login")} class="text-primary hover:underline">Login</a>
    </p>
  </div>
</div>
