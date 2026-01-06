<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { toast } from "$lib/stores/toast";

  let user: { id: string } | null = null;
  let categories: Array<{ id: string; name: string; type: string }> = [];
  let budgets: Array<{ id: string; category_id: string; monthly_limit: number; alert_threshold: number; categories: { name: string } }> = [];
  let loading = true;
  let saving = false;

  let newBudget = {
    category_id: "",
    monthly_limit: "",
    alert_threshold: 80
  };

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user || null;

    if (!user) {
      goto(resolve("/auth/login"));
      return;
    }

    await loadData();
    loading = false;
  });

  async function loadData() {
    if (!user) return;

    // Load categories
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .order("name");

    if (categoriesData) categories = categoriesData;

    // Load budgets
    const { data: budgetsData } = await supabase
      .from("budgets")
      .select("*, categories(name)")
      .eq("user_id", user.id);

    if (budgetsData) budgets = budgetsData;
  }

  async function saveBudget() {
    if (!user || !newBudget.category_id || !newBudget.monthly_limit) return;

    saving = true;
    try {
      const { error } = await supabase.from("budgets").upsert({
        user_id: user.id,
        category_id: newBudget.category_id,
        monthly_limit: parseInt(newBudget.monthly_limit),
        alert_threshold: newBudget.alert_threshold
      });

      if (error) {
        toast.error("Failed to save budget");
      } else {
        newBudget = { category_id: "", monthly_limit: "", alert_threshold: 80 };
        await loadData();
      }
    } catch {
      toast.error("Error saving budget");
    } finally {
      saving = false;
    }
  }

  async function deleteBudget(id: string) {
    if (!confirm("Delete this budget?")) return;

    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (!error) await loadData();
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  }
</script>

<svelte:head>
  <title>Budgets - CZmoneY</title>
</svelte:head>

<div class="space-y-6">
  <h1 class="text-3xl font-bold">Budget Management</h1>

  {#if loading}
    <div class="text-center py-8">Loading...</div>
  {:else}
    <!-- Add New Budget -->
    <div class="bg-card p-6 rounded-lg border">
      <h2 class="text-xl font-semibold mb-4">Set Category Budget</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Category</label>
          <select bind:value={newBudget.category_id} class="w-full p-2 border border-border rounded bg-background">
            <option value="">Select category</option>
            {#each categories as category (category.id)}
              <option value={category.id}>{category.name}</option>
            {/each}
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">Monthly Limit (IDR)</label>
          <input
            type="number"
            bind:value={newBudget.monthly_limit}
            placeholder="1000000"
            class="w-full p-2 border border-border rounded bg-background"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">Alert at (%)</label>
          <input
            type="number"
            bind:value={newBudget.alert_threshold}
            min="1"
            max="100"
            class="w-full p-2 border border-border rounded bg-background"
          />
        </div>
        
        <div class="flex items-end">
          <button
            on:click={saveBudget}
            disabled={saving || !newBudget.category_id || !newBudget.monthly_limit}
            class="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Budget"}
          </button>
        </div>
      </div>
    </div>

    <!-- Existing Budgets -->
    <div class="bg-card rounded-lg border">
      <div class="p-6 border-b">
        <h2 class="text-xl font-semibold">Current Budgets</h2>
      </div>
      
      {#if budgets.length === 0}
        <div class="p-8 text-center text-muted-foreground">
          No budgets set yet. Add your first budget above.
        </div>
      {:else}
        <div class="divide-y divide-border">
          {#each budgets as budget (budget.id)}
            <div class="p-4 flex justify-between items-center">
              <div>
                <h3 class="font-medium">{budget.categories.name}</h3>
                <p class="text-sm text-muted-foreground">
                  {formatCurrency(budget.monthly_limit)} • Alert at {budget.alert_threshold}%
                </p>
              </div>
              <button
                on:click={() => deleteBudget(budget.id)}
                class="px-3 py-1 text-sm text-destructive border border-destructive rounded hover:bg-destructive hover:text-destructive-foreground"
              >
                Delete
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
