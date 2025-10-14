<script lang="ts">
  import { goto } from "$app/navigation";
  import { supabase, getSession } from "$lib/services/supabase";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  import Input from "$lib/components/ui/input.svelte";
  
  let email = "";
  let password = "";
  let loading = false;
  let error = "";

  async function handleLogin() {
    loading = true;
    error = "";
    
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) {
      error = authError.message;
    } else {
      goto("/");
    }
    
    loading = false;
  }
</script>

<div class="flex items-center justify-center min-h-screen">
  <Card className="w-full max-w-md p-6">
    <h1 class="text-2xl font-bold text-center mb-6">Sign In</h1>
    
    {#if error}
      <div class="bg-destructive/10 text-destructive p-3 rounded mb-4">
        {error}
      </div>
    {/if}
    
    <form on:submit|preventDefault={handleLogin} class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium mb-2">Email</label>
        <Input id="email" type="email" bind:value={email} required />
      </div>
      
      <div>
        <label for="password" class="block text-sm font-medium mb-2">Password</label>
        <Input id="password" type="password" bind:value={password} required />
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
    
    <p class="text-center mt-4 text-sm">
      Don't have an account? 
      <a href="/auth/register" class="text-primary hover:underline">Sign up</a>
    </p>
  </Card>
</div>
