<script>
  import { goto } from "$app/navigation";
  import { signUp } from "$lib/services/supabase";
  import { isValidEmail } from "$lib/utils";

  let fullName = "";
  let email = "";
  let password = "";
  let confirmPassword = "";
  let loading = false;
  let error = "";
  let success = false;

  async function handleRegister() {
    error = "";

    if (!fullName.trim()) {
      error = "Please enter your full name";
      return;
    }

    if (!isValidEmail(email)) {
      error = "Please enter a valid email address";
      return;
    }

    if (password.length < 6) {
      error = "Password must be at least 6 characters";
      return;
    }

    if (password !== confirmPassword) {
      error = "Passwords do not match";
      return;
    }

    loading = true;

    const { data, error: signUpError } = await signUp(
      email,
      password,
      fullName
    );

    if (signUpError) {
      error = signUpError.message;
      loading = false;
    } else {
      success = true;
      setTimeout(() => goto("/"), 2000);
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center px-4">
  <div class="w-full max-w-md fade-in">
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-accent mb-2">CZmoneY</h1>
      <p class="text-muted">Start managing your finances today</p>
    </div>

    <div class="card p-8">
      <h2 class="text-2xl font-semibold text-white mb-6">Create Account</h2>

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
          Account created successfully! Redirecting...
        </div>
      {/if}

      <form on:submit|preventDefault={handleRegister}>
        <div class="mb-4">
          <label for="fullName" class="label">Full Name</label>
          <input
            id="fullName"
            type="text"
            bind:value={fullName}
            class="input"
            placeholder="John Doe"
            required
          />
        </div>

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

        <div class="mb-4">
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

        <div class="mb-6">
          <label for="confirmPassword" class="label">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            class="input"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          class="btn-primary w-full"
          disabled={loading || success}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-muted">
          Already have an account?
          <a href="/auth/login" class="text-accent hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  </div>
</div>
