<script>
  import { goto } from "$app/navigation";
  import { signIn } from "$lib/services/supabase";
  import { isValidEmail } from "$lib/utils";

  let email = "";
  let password = "";
  let loading = false;
  let error = "";

  async function handleLogin() {
    error = "";

    if (!isValidEmail(email)) {
      error = "Please enter a valid email address";
      return;
    }

    if (password.length < 6) {
      error = "Password must be at least 6 characters";
      return;
    }

    loading = true;

    const { data, error: signInError } = await signIn(email, password);

    if (signInError) {
      error = signInError.message;
      loading = false;
    } else {
      goto("/");
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center px-4">
  <div class="w-full max-w-md fade-in">
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-accent mb-2">CZmoneY</h1>
      <p class="text-muted">Manage your finances effortlessly</p>
    </div>

    <div class="card p-8">
      <h2 class="text-2xl font-semibold text-white mb-6">Welcome Back</h2>

      {#if error}
        <div
          class="bg-danger/10 border border-danger/50 text-danger px-4 py-3 rounded-lg mb-4"
        >
          {error}
        </div>
      {/if}

      <form on:submit|preventDefault={handleLogin}>
        <div class="mb-4">
          <label for="email" class="label">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            class="input"
            placeholder="you@example.com"
            required
          />
        </div>

        <div class="mb-6">
          <label for="password" class="label">Password</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            class="input"
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" class="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-muted">
          Don't have an account?
          <a href="/auth/register" class="text-accent hover:underline"
            >Sign up</a
          >
        </p>
      </div>
    </div>
  </div>
</div>
