<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { toast } from "$lib/stores/toast";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";

  let user: { id: string } | null = null;
  let categories: Array<{ id: string; name: string; type: string }> = [];
  let budgets: Array<{ id: string; category_id: string; monthly_limit: number; alert_threshold: number; categories: { name: string } }> = [];
  let loading = true;
  let saving = false;
  let showDeleteConfirm = false;
  let budgetToDelete: string | null = null;

  let newBudget = {
    category_id: "",
    monthly_limit: "",
    alert_threshold: 80
  };

  onMount(() => {
    async function initializeBudgets() {
      const { data } = await supabase.auth.getSession();
      user = data.session?.user || null;

      if (!user) {
        goto(resolve("/auth/login"));
        return;
      }

      await loadData();
      loading = false;
    }

    void initializeBudgets();
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
    budgetToDelete = id;
    showDeleteConfirm = true;
  }

  async function confirmDelete() {
    if (!budgetToDelete) return;
    
    const { error } = await supabase.from("budgets").delete().eq("id", budgetToDelete);
    
    if (error) {
      toast.error("Failed to delete budget");
    } else {
      toast.success("Budget deleted");
      await loadData();
    }
    
    budgetToDelete = null;
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

<div class="max-w-[1040px] space-y-10">
  <header class="space-y-1">
    <h1 class="text-xl font-semibold tracking-tight">Budgets</h1>
    <p class="text-sm text-ink-2">One monthly limit per expense category. You are alerted at the percentage you set.</p>
  </header>

  {#if loading}
    <p class="py-16 text-center text-sm text-ink-2">Loading</p>
  {:else}
    <!-- Add a budget -->
    <section aria-labelledby="h-new" class="border-t border-border pt-5">
      <h2 id="h-new" class="pb-4 text-[15px] font-semibold">Set a category budget</h2>
      <form
        class="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.7fr)_auto] md:items-end"
        on:submit|preventDefault={saveBudget}
      >
        <div class="min-w-0">
          <label for="budget-category" class="mb-1.5 block text-xs text-ink-2">Category</label>
          <select id="budget-category" bind:value={newBudget.category_id} class="h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground">
            <option value="">Select a category</option>
            {#each categories as category (category.id)}
              <option value={category.id}>{category.name}</option>
            {/each}
          </select>
        </div>

        <div class="min-w-0">
          <label for="budget-limit" class="mb-1.5 block text-xs text-ink-2">Monthly limit (IDR)</label>
          <input
            id="budget-limit"
            type="number"
            inputmode="numeric"
            min="0"
            bind:value={newBudget.monthly_limit}
            placeholder="1000000"
            class="amt h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground placeholder:text-ink-3"
          />
        </div>

        <div class="min-w-0">
          <label for="budget-threshold" class="mb-1.5 block text-xs text-ink-2">Alert at (%)</label>
          <input
            id="budget-threshold"
            type="number"
            inputmode="numeric"
            min="1"
            max="100"
            bind:value={newBudget.alert_threshold}
            class="amt h-11 w-full rounded-lg border border-rule-strong bg-background px-3 text-[15px] text-foreground"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !newBudget.category_id || !newBudget.monthly_limit}
          class="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/85 disabled:opacity-40 active:scale-[0.98]"
        >
          {saving ? "Saving" : "Add budget"}
        </button>
      </form>
    </section>

    <!-- Existing budgets -->
    <section aria-labelledby="h-current" class="border-t border-border pt-5">
      <div class="flex items-baseline justify-between pb-2">
        <h2 id="h-current" class="text-[15px] font-semibold">Current budgets</h2>
        <p class="font-mono text-xs text-ink-3">{budgets.length}</p>
      </div>

      {#if budgets.length === 0}
        <p class="py-10 text-center text-sm text-ink-2">No budgets yet. Add one above to start tracking a category.</p>
      {:else}
        <ul>
          {#each budgets as budget (budget.id)}
            <li class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-border py-4">
              <div class="min-w-0">
                <p class="truncate text-[15px]">{budget.categories.name}</p>
                <p class="mt-0.5 font-mono text-xs text-ink-3">
                  {formatCurrency(budget.monthly_limit)} a month, alert at {budget.alert_threshold}%
                </p>
              </div>
              <button
                type="button"
                on:click={() => deleteBudget(budget.id)}
                class="min-h-10 text-[13px] text-critical underline-offset-4 hover:underline"
              >
                Delete
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</div>

<ConfirmDialog
  bind:open={showDeleteConfirm}
  title="Delete Budget"
  message="Are you sure you want to delete this budget? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  danger={true}
  on:confirm={confirmDelete}
/>
