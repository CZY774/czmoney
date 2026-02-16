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

<div class="min-h-screen flex items-center justify-center px-4 bg-background">
  <div class="max-w-md w-full">
    <div class="bg-card rounded-lg shadow-xl p-8 border border-border">
      {#if emailSent}
        <div class="text-center">
          <div class="mb-4">
            <svg
              class="w-16 h-16 mx-auto text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 class="text-2xl font-bold mb-2">Check Your Email</h2>
          <p class="text-muted-foreground mb-4">
            We've sent a password reset link to <strong class="text-foreground">{email}</strong>
          </p>
          <p class="text-sm text-muted-foreground mb-6">
            Click the link in the email to reset your password. The link expires in 1 hour.
          </p>
          <a
            href={resolve("/auth/login")}
            class="inline-block w-full py-2.5 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Back to Login
          </a>
        </div>
      {:else}
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold mb-2">Forgot Password?</h2>
          <p class="text-muted-foreground">
            Enter your email to receive a password reset link.
          </p>
        </div>

        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium mb-2">Email Address</label>
            <input
              id="email"
              type="email"
              bind:value={email}
              placeholder="your@email.com"
              required
              disabled={loading}
              class="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            class="w-full py-2.5 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <div class="text-center">
            <a href={resolve("/auth/login")} class="text-sm text-primary hover:underline">
              Back to Login
            </a>
          </div>
        </form>
      {/if}
    </div>
  </div>
</div>
