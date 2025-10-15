<script>
  import { goto } from "$app/navigation";
  import Button from "$lib/components/ui/button.svelte";
</script>

<svelte:head>
  <title>CZmoneY</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
  <div class="text-center max-w-md">
    <div class="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-8">
      <span class="text-primary-foreground font-bold text-xl">CZ</span>
    </div>
    
    <h1 class="text-4xl font-bold mb-4">CZmoneY</h1>
    <p class="text-muted-foreground mb-8">Personal finance tracker</p>
    
    <div class="space-y-3">
      <Button 
        className="w-full"
        on:click={() => goto('/auth/register')}
      >
        Get Started
      </Button>
      
      <Button 
        className="w-full bg-transparent border border-border hover:bg-accent"
        on:click={() => goto('/auth/login')}
      >
        Sign In
      </Button>
    </div>
  </div>
</div>
