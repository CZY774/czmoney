<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  
  let loading = true;

  onMount(() => {
    loading = false;
  });
</script>

{#if loading}
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-lg">Loading...</div>
  </div>
{:else}
  <main class="min-h-screen bg-background text-foreground">
    <slot />
  </main>
{/if}
