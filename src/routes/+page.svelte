<script lang="ts">
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
</script>

<div class="container mx-auto p-4">
  <h1 class="text-3xl font-bold mb-6">CZmoneY</h1>
  
  <Card className="p-6 mb-4">
    <h2 class="text-xl font-semibold mb-4">Personal Finance Manager</h2>
    <p class="text-muted-foreground mb-4">
      Track your expenses, manage budgets, and get AI-powered insights.
    </p>
    <Button>Get Started</Button>
  </Card>
  
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card className="p-4">
      <h3 class="font-semibold">Balance</h3>
      <p class="text-2xl font-bold text-primary">Rp 0</p>
    </Card>
    
    <Card className="p-4">
      <h3 class="font-semibold">Income</h3>
      <p class="text-2xl font-bold text-green-500">Rp 0</p>
    </Card>
    
    <Card className="p-4">
      <h3 class="font-semibold">Expenses</h3>
      <p class="text-2xl font-bold text-red-500">Rp 0</p>
    </Card>
  </div>
</div>
