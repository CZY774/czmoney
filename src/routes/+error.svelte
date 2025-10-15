<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  $: status = $page.status;
  $: message = $page.error?.message;
</script>

<svelte:head>
  <title>Error {status} - CZmoneY</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-background">
  <div class="text-center space-y-6 p-8">
    <div class="space-y-2">
      <h1 class="text-6xl font-bold text-primary">{status}</h1>
      <h2 class="text-2xl font-semibold text-foreground">
        {#if status === 404}
          Page Not Found
        {:else if status === 500}
          Internal Server Error
        {:else if status === 403}
          Access Forbidden
        {:else}
          Something Went Wrong
        {/if}
      </h2>
    </div>

    <div class="space-y-4">
      <p class="text-muted-foreground max-w-md mx-auto">
        {#if status === 404}
          The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
        {:else if status === 500}
          We're experiencing some technical difficulties. Please try again in a few moments.
        {:else if status === 403}
          You don't have permission to access this resource. Please check your credentials.
        {:else}
          An unexpected error occurred. We're working to fix this issue.
        {/if}
      </p>

      {#if message}
        <details class="text-sm text-muted-foreground">
          <summary class="cursor-pointer hover:text-foreground">Technical Details</summary>
          <p class="mt-2 font-mono bg-card p-2 rounded border">{message}</p>
        </details>
      {/if}
    </div>

    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <button 
        on:click={() => history.back()}
        class="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
      >
        Go Back
      </button>
      
      <button 
        on:click={() => goto('/')}
        class="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        Go Home
      </button>
    </div>

    <div class="pt-8 border-t border-border">
      <p class="text-sm text-muted-foreground">
        Need help? Contact support or try refreshing the page.
      </p>
    </div>
  </div>
</div>

<style>
  details[open] summary {
    margin-bottom: 0.5rem;
  }
</style>
