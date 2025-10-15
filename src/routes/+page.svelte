<script>
  import { goto } from "$app/navigation";
  import Button from "$lib/components/ui/button.svelte";
</script>

<svelte:head>
  <title>CZmoneY</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
  <div class="text-center max-w-md">    
    <h1 class="text-4xl font-bold mb-4">CZmoneY</h1>
    <p class="text-muted-foreground mb-8">Personal finance tracker</p>
    
    <div class="space-y-3">
      <Button 
        className="w-full"
        on:click={() => goto('/auth/login')}
      >
        Get Started
      </Button>
      
      <Button 
        className="w-full bg-gray-800/90 border border-gray-500 hover:bg-gray-900 text-gray-300"
        on:click={() => goto('/auth/register')}
      >
        Register
      </Button>
    </div>
  </div>
</div>
