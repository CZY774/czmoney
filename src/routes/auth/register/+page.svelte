<script>
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/services/supabase";
  
  let email = "";
  let password = "";
  let confirmPassword = "";
  let loading = false;
  let error = "";

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
      password
    });
    
    if (authError) {
      error = authError.message;
    } else {
      alert("Registration successful! Please check your email to verify your account.");
      goto("/auth/login");
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
        <label for="password" class="block text-sm font-medium mb-2">Password</label>
        <input 
          id="password" 
          type="password" 
          bind:value={password} 
          required 
          minlength="6"
          class="w-full p-2 border border-border rounded bg-background"
          placeholder="Enter your password"
        />
      </div>

      <div>
        <label for="confirmPassword" class="block text-sm font-medium mb-2">Confirm Password</label>
        <input 
          id="confirmPassword" 
          type="password" 
          bind:value={confirmPassword} 
          required 
          minlength="6"
          class="w-full p-2 border border-border rounded bg-background"
          placeholder="Confirm your password"
        />
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
      <a href="/auth/login" class="text-primary hover:underline">Login</a>
    </p>
  </div>
</div>
