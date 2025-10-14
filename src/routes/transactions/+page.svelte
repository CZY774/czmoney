<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { supabase, getUser } from "$lib/services/supabase";
  import {
    formatCurrency,
    formatDate,
    getCurrentMonth,
    parseAmount,
  } from "$lib/utils";
  import {
    enqueuePendingTransaction,
    processPendingQueue,
  } from "$lib/services/sync";

  let user = null;
  let transactions = [];
  let categories = [];
  let loading = true;
  let showModal = false;
  let saving = false;
  let error = "";

  // Filters
  let selectedMonth = getCurrentMonth();
  let selectedCategory = "";
  let selectedType = "";

  // Form data
  let formData = {
    id: null,
    txn_date: new Date().toISOString().split("T")[0],
    category_id: "",
    type: "expense",
    amount: "",
    description: "",
  };

  $: filteredTransactions = transactions.filter((txn) => {
    let match = true;
    if (selectedMonth) match = match && txn.txn_date.startsWith(selectedMonth);
    if (selectedCategory) match = match && txn.category_id === selectedCategory;
    if (selectedType) match = match && txn.type === selectedType;
    return match;
  });

  onMount(async () => {
    const { user: currentUser } = await getUser();
    user = currentUser;

    if (user) {
      await loadData();

      // Check if we should open add modal from URL
      if ($page.url.searchParams.get("add") === "true") {
        openAddModal();
      }
    }
  });

  async function loadData() {
    loading = true;

    try {
      // Load categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      categories = categoriesData || [];

      // Load transactions
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);

      const { data: txnData } = await supabase
        .from("transactions")
        .select("*, categories(*)")
        .eq("user_id", user.id)
        .gte("txn_date", startDate.toISOString().split("T")[0])
        .order("txn_date", { ascending: false });

      transactions = txnData || [];
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      loading = false;
    }
  }

  function openAddModal() {
    formData = {
      id: null,
      txn_date: new Date().toISOString().split("T")[0],
      category_id: "",
      type: "expense",
      amount: "",
      description: "",
    };
    error = "";
    showModal = true;
    goto("/transactions", { replaceState: true });
  }

  function openEditModal(txn) {
    formData = {
      id: txn.id,
      txn_date: txn.txn_date,
      category_id: txn.category_id,
      type: txn.type,
      amount: txn.amount.toString(),
      description: txn.description || "",
    };
    error = "";
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    formData = {
      id: null,
      txn_date: new Date().toISOString().split("T")[0],
      category_id: "",
      type: "expense",
      amount: "",
      description: "",
    };
    error = "";
  }

  async function handleSubmit() {
    error = "";

    // Validation
    if (!formData.category_id) {
      error = "Please select a category";
      return;
    }

    const amount = parseAmount(formData.amount);
    if (amount <= 0) {
      error = "Please enter a valid amount";
      return;
    }

    saving = true;

    try {
      const txnData = {
        txn_date: formData.txn_date,
        category_id: formData.category_id,
        type: formData.type,
        amount: amount,
        description: formData.description.trim() || null,
        user_id: user.id,
      };

      if (formData.id) {
        // Update existing
        const { error: updateError } = await supabase
          .from("transactions")
          .update(txnData)
          .eq("id", formData.id);

        if (updateError) throw updateError;
      } else {
        // Create new
        if (!navigator.onLine) {
          // Offline: queue for later sync
          await enqueuePendingTransaction(txnData);
          // Add to local list with temp ID
          transactions = [
            {
              ...txnData,
              id: "temp_" + Date.now(),
              categories: categories.find((c) => c.id === txnData.category_id),
              synced: false,
            },
            ...transactions,
          ];
        } else {
          // Online: save to server
          const { data, error: insertError } = await supabase
            .from("transactions")
            .insert([txnData])
            .select("*, categories(*)")
            .single();

          if (insertError) throw insertError;
          transactions = [data, ...transactions];
        }
      }

      closeModal();

      // Trigger sync if online
      if (navigator.onLine) {
        processPendingQueue(user.id);
      }
    } catch (err) {
      error = err.message || "Failed to save transaction";
    } finally {
      saving = false;
    }
  }

  async function deleteTransaction(id) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      transactions = transactions.filter((t) => t.id !== id);
    } catch (err) {
      alert("Failed to delete transaction: " + err.message);
    }
  }

  // Generate month options for filter
  function getMonthOptions() {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = date.toISOString().substring(0, 7);
      const label = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      options.push({ value, label });
    }
    return options;
  }
</script>

<div class="container py-6 fade-in">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-white">Transactions</h1>
    <button on:click={openAddModal} class="btn-primary">
      <svg
        class="w-5 h-5 inline-block mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m8-8H4"
        />
      </svg>
      Add Transaction
    </button>
  </div>

  <!-- Filters -->
  <div class="card p-4 mb-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label for="month-filter" class="label">Month</label>
        <select id="month-filter" bind:value={selectedMonth} class="input">
          <option value="">All months</option>
          {#each getMonthOptions() as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="category-filter" class="label">Category</label>
        <select id="category-filter" bind:value={selectedCategory} class="input">
          <option value="">All categories</option>
          {#each categories as cat}
            <option value={cat.id}>{cat.name}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="type-filter" class="label">Type</label>
        <select id="type-filter" bind:value={selectedType} class="input">
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Transactions List -->
  {#if loading}
    <div class="flex justify-center py-12">
      <div class="spinner"></div>
    </div>
  {:else if filteredTransactions.length > 0}
    <div class="space-y-3">
      {#each filteredTransactions as txn}
        <div class="card p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4 flex-1">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style="background-color: {txn.categories?.color || '#64748b'}20"
              >
                <span
                  class="text-lg font-semibold"
                  style="color: {txn.categories?.color || '#64748b'}"
                >
                  {txn.categories?.name?.charAt(0) || "?"}
                </span>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2">
                  <p class="text-white font-medium">
                    {txn.categories?.name || "Uncategorized"}
                  </p>
                  {#if !txn.synced}
                    <span
                      class="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded"
                      >Pending</span
                    >
                  {/if}
                </div>
                <p class="text-sm text-muted">{formatDate(txn.txn_date)}</p>
                {#if txn.description}
                  <p class="text-sm text-muted truncate">{txn.description}</p>
                {/if}
              </div>
            </div>

            <div class="flex items-center space-x-4">
              <p
                class="text-lg font-bold {txn.type === 'income'
                  ? 'text-success'
                  : 'text-danger'}"
              >
                {txn.type === "income" ? "+" : "-"}{formatCurrency(txn.amount)}
              </p>

              <div class="flex space-x-2">
                <button
                  on:click={() => openEditModal(txn)}
                  class="text-muted hover:text-accent transition-colors"
                  title="Edit"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>

                <button
                  on:click={() => deleteTransaction(txn.id)}
                  class="text-muted hover:text-danger transition-colors"
                  title="Delete"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="card p-12 text-center">
      <svg
        class="w-16 h-16 mx-auto text-muted/50 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <p class="text-muted mb-4">No transactions found</p>
      <button on:click={openAddModal} class="btn-primary">
        Add Your First Transaction
      </button>
    </div>
  {/if}
</div>

<!-- Add/Edit Modal -->
{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    on:click={closeModal} on:keydown={(e) => e.key === "Escape" && closeModal()} role="dialog" aria-modal="true"
  >
    <div class="card p-6 max-w-md w-full" on:click|stopPropagation role="document">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->      <h2 class="text-xl font-semibold text-white mb-4">
        {formData.id ? "Edit Transaction" : "Add Transaction"}
      </h2>

      {#if error}
        <div
          class="bg-danger/10 border border-danger/50 text-danger px-4 py-3 rounded-lg mb-4"
        >
          {error}
        </div>
      {/if}

      <form on:submit|preventDefault={handleSubmit}>
        <div class="mb-4">
          <label for="form-date" class="label">Date</label>
          <input
            type="date" id="form-date"
            bind:value={formData.txn_date}
            class="input"
            required
          />
        </div>

        <div class="mb-4">
          <label for="form-type" class="label">Type</label>
          <div class="flex space-x-4">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                bind:group={formData.type}
                value="expense"
                class="text-accent"
              />
              <span class="text-muted">Expense</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                bind:group={formData.type}
                value="income"
                class="text-accent"
              />
              <span class="text-muted">Income</span>
            </label>
          </div>
        </div>

        <div class="mb-4">
          <label for="form-category" class="label">Category</label>
          <select id="form-category" bind:value={formData.category_id} class="input" required>
            <option value="">Select category</option>
            {#each categories.filter((c) => c.type === formData.type) as cat}
              <option value={cat.id}>{cat.name}</option>
            {/each}
          </select>
        </div>

        <div class="mb-4">
          <label for="form-amount" class="label">Amount</label>
          <input
            type="number" id="form-amount"
            bind:value={formData.amount}
            class="input"
            placeholder="0"
            step="1"
            min="1"
            required
          />
        </div>

        <div class="mb-6">
          <label for="form-description" class="label">Description (optional)</label>
          <textarea
            id="form-description" bind:value={formData.description}
            class="input"
            rows="3"
            placeholder="Add a note..."
          ></textarea>
        </div>

        <div class="flex space-x-3">
          <button type="submit" class="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            on:click={closeModal}
            class="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
