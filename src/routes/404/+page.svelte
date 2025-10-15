<script>
  import { goto } from '$app/navigation';
</script>

<svelte:head>
  <title>404 - Page Not Found | CZmoneY</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-background">
  <div class="text-center space-y-6 p-8 max-w-md">
    <div class="space-y-2">
      <div class="text-8xl">💸</div>
      <h1 class="text-4xl font-bold text-primary">404</h1>
      <h2 class="text-xl font-semibold text-foreground">Page Not Found</h2>
    </div>

    <p class="text-muted-foreground">
      Looks like this page went on a spending spree and disappeared! 
      Let's get you back to managing your finances.
    </p>

    <div class="flex flex-col sm:flex-row gap-3 justify-center">
      <button 
        on:click={() => history.back()}
        class="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
      >
        ← Go Back
      </button>
      
      <button 
        on:click={() => goto('/dashboard')}
        class="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        🏠 Dashboard
      </button>
    </div>
  </div>
</div>
