<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fade, scale } from "svelte/transition";

  export let open = false;
  export let title = "";
  export let description = "";
  export let size: "sm" | "md" | "lg" = "md";

  const dispatch = createEventDispatcher();

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  function handleClose() {
    open = false;
    dispatch("close");
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    transition:fade={{ duration: 200 }}
    on:click={handleBackdropClick}
    on:keydown={(e) => e.key === "Escape" && handleClose()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div
      class="bg-card border border-border rounded-xl shadow-2xl w-full {sizes[
        size
      ]} max-h-[90vh] overflow-hidden flex flex-col"
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-border flex items-start justify-between">
        <div class="flex-1">
          {#if title}
            <h2 id="modal-title" class="text-xl font-semibold text-foreground">
              {title}
            </h2>
          {/if}
          {#if description}
            <p class="text-sm text-muted-foreground mt-1">{description}</p>
          {/if}
        </div>
        <button
          on:click={handleClose}
          class="ml-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-accent"
          aria-label="Close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-4 overflow-y-auto flex-1">
        <slot />
      </div>

      <!-- Footer (optional) -->
      {#if $$slots.footer}
        <div class="px-6 py-4 border-t border-border bg-accent/20">
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}
