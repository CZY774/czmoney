<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";

  $: status = $page.status;
  $: message = $page.error?.message;
</script>

<svelte:head>
  <title>Error {status} - CZmoneY</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
  <div class="bg-card border border-border rounded-lg w-full max-w-md p-8 text-center">
    <div class="text-6xl font-bold text-primary mb-4">{status}</div>
    
    <h1 class="text-xl font-semibold mb-2">
      {#if status === 404}
        Page Not Found
      {:else if status === 401}
        Unauthorized
      {:else if status === 403}
        Access Forbidden
      {:else if status === 500}
        Server Error
      {:else}
        Something Went Wrong
      {/if}
    </h1>

    <p class="text-muted-foreground mb-6">
      {#if status === 404}
        The page you're looking for doesn't exist.
      {:else if status === 401}
        Please sign in to continue.
      {:else if status === 403}
        You don't have permission to access this.
      {:else if status === 500}
        We're experiencing technical difficulties.
      {:else}
        An unexpected error occurred.
      {/if}
    </p>

    {#if message}
      <details class="text-sm text-muted-foreground mb-6 text-left">
        <summary class="cursor-pointer hover:text-foreground mb-2">
          Technical Details
        </summary>
        <div class="p-3 bg-background rounded border border-border">
          <code class="text-xs break-all">{message}</code>
        </div>
      </details>
    {/if}

    <div class="flex gap-3">
      <button
        on:click={() => history.back()}
        class="flex-1 px-4 py-2 border border-border rounded hover:bg-accent"
      >
        Go Back
      </button>
      <button
        on:click={() => goto(resolve("/"))}
        class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Home
      </button>
    </div>

    {#if status === 401}
      <div class="mt-6 pt-6 border-t border-border">
        <a href={resolve("/auth/login")} class="text-primary hover:underline">
          Sign in to continue
        </a>
      </div>
    {/if}
  </div>
</div>
