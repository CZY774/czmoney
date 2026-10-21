<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";

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
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-6"
    transition:fade={{ duration: 150 }}
    on:keydown={(e) => e.key === "Escape" && handleCancel()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-title"
    tabindex="-1"
  >
    <div class="w-full max-w-md rounded-t-2xl border border-border bg-background p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] sm:rounded-2xl sm:p-6">
      <h2 id="confirm-title" class="text-lg font-semibold tracking-tight">{title}</h2>
      <p class="mt-2 text-sm text-ink-2">{message}</p>

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          on:click={handleCancel}
          class="min-h-11 rounded-lg border border-rule-strong px-5 text-sm hover:bg-accent"
        >
          {cancelText}
        </button>
        <button
          on:click={handleConfirm}
          class="min-h-11 rounded-lg px-5 text-sm font-semibold active:scale-[0.98] {danger
            ? 'bg-critical text-white hover:bg-critical/85'
            : 'bg-primary text-primary-foreground hover:bg-primary/85'}"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}
