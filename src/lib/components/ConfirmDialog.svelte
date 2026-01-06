<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fade, scale } from "svelte/transition";

  export let open = false;
  export let title = "Confirm Action";
  export let message = "Are you sure you want to continue?";
  export let confirmText = "Confirm";
  export let cancelText = "Cancel";
  export let danger = false;

  const dispatch = createEventDispatcher();

  function handleConfirm() {
    dispatch("confirm");
    open = false;
  }

  function handleCancel() {
    dispatch("cancel");
    open = false;
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    transition:fade={{ duration: 200 }}
    on:keydown={(e) => e.key === "Escape" && handleCancel()}
    role="dialog"
    aria-modal="true"
  >
    <div
      class="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md"
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-border">
        <h2 class="text-lg font-semibold text-foreground">{title}</h2>
      </div>

      <!-- Content -->
      <div class="px-6 py-4">
        <p class="text-sm text-muted-foreground">{message}</p>
      </div>

      <!-- Actions -->
      <div class="px-6 py-4 border-t border-border flex gap-3 justify-end">
        <button
          on:click={handleCancel}
          class="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
        >
          {cancelText}
        </button>
        <button
          on:click={handleConfirm}
          class="px-4 py-2 text-sm rounded-lg transition-colors {danger
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'}"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}
