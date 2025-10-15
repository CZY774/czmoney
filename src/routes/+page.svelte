<script>
  import { goto } from "$app/navigation";
</script>

<svelte:head>
  <title>CZmoneY - Your Personal Finance Companion</title>
</svelte:head>

<div class="min-h-screen bg-slate-900 text-white p-8">
  <h1 class="text-4xl font-bold mb-4">CZmoneY</h1>
  <p class="text-xl mb-8">Your Personal Finance Companion</p>
  
  <div class="space-x-4">
    <button 
      on:click={() => goto('/auth/register')}
      class="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Get Started
    </button>
    <button 
      on:click={() => goto('/auth/login')}
      class="px-6 py-3 border border-white text-white rounded hover:bg-white hover:text-black"
    >
      Sign In
    </button>
  </div>
</div>
