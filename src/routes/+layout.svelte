<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { supabase, getSession } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  
  let user = null;
  let loading = true;

  onMount(async () => {
    const { data } = await getSession();
    user = data.session?.user || null;
    loading = false;

    supabase.auth.onAuthStateChange((event, session) => {
      user = session?.user || null;
    });
  });

  async function signOut() {
    await supabase.auth.signOut();
    goto('/auth/login');
  }
</script>

{#if loading}
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-lg">Loading...</div>
  </div>
{:else}
  <div class="min-h-screen bg-background text-foreground">
    {#if user}
      <nav class="border-b border-border bg-card">
        <div class="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 class="text-xl font-bold">CZmoneY</h1>
          <div class="flex gap-4">
            <a href="/" class="hover:text-primary">Dashboard</a>
            <a href="/transactions" class="hover:text-primary">Transactions</a>
            <a href="/reports" class="hover:text-primary">Reports</a>
            <a href="/settings" class="hover:text-primary">Settings</a>
            <button on:click={signOut} class="hover:text-destructive">Sign Out</button>
          </div>
        </div>
      </nav>
    {/if}
    
    <main class="container mx-auto p-4">
      <slot />
    </main>
  </div>
{/if}
