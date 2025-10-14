<script lang="ts">
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/services/supabase";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  import Input from "$lib/components/ui/input.svelte";
  
  let email = "";
  let password = "";
  let loading = false;
  let error = "";
  let success = "";

  async function handleRegister() {
    loading = true;
    error = "";
    success = "";
    
    const { error: authError } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (authError) {
      error = authError.message;
    } else {
      success = "Check your email for verification link!";
      setTimeout(() => goto("/auth/login"), 2000);
    }
    
    loading = false;
  }
</script>

<div class="flex items-center justify-center min-h-screen">
  <Card className="w-full max-w-md p-6">
    <h1 class="text-2xl font-bold text-center mb-6">Sign Up</h1>
    
    {#if error}
      <div class="bg-destructive/10 text-destructive p-3 rounded mb-4">
        {error}
      </div>
    {/if}
    
    {#if success}
      <div class="bg-green-500/10 text-green-500 p-3 rounded mb-4">
        {success}
      </div>
    {/if}
    
    <form on:submit|preventDefault={handleRegister} class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">Email</label>
        <Input type="email" bind:value={email} required />
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2">Password</label>
        <Input type="password" bind:value={password} required />
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating account..." : "Sign Up"}
      </Button>
    </form>
    
    <p class="text-center mt-4 text-sm">
      Already have an account? 
      <a href="/auth/login" class="text-primary hover:underline">Sign in</a>
    </p>
  </Card>
</div>
