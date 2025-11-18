<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fade, scale } from "svelte/transition";

  export let open = false;
  export let title = "Confirm Action";
  export let message = "Are you sure you want to proceed?";
  export let confirmText = "Confirm";
  export let cancelText = "Cancel";
  export let variant: "danger" | "warning" | "info" = "info";
  export let loading = false;

  const dispatch = createEventDispatcher();

  const variants = {
    danger: {
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>`,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      buttonClass: "bg-red-500 hover:bg-red-600 text-white",
    },
    warning: {
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>`,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      buttonClass: "bg-yellow-500 hover:bg-yellow-600 text-white",
    },
    info: {
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>`,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      buttonClass: "bg-primary hover:bg-primary/90 text-primary-foreground",
    },
  };

  function handleConfirm() {
    dispatch("confirm");
  }

  function handleCancel() {
    open = false;
    dispatch("cancel");
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget && !loading) {
      handleCancel();
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    transition:fade={{ duration: 200 }}
    on:click={handleBackdropClick}
    on:keydown={(e) => e.key === "Escape" && !loading && handleCancel()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      class="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <div class="p-6 space-y-4">
        <!-- Icon -->
        <div class="flex items-center justify-center w-12 h-12 rounded-full {variants[variant].bgColor} {variants[variant].color} mx-auto">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html variants[variant].icon}
        </div>

        <!-- Content -->
        <div class="text-center space-y-2">
          <h2 class="text-xl font-semibold text-foreground">{title}</h2>
          <p class="text-muted-foreground">{message}</p>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-2">
          <button
            on:click={handleCancel}
            disabled={loading}
            class="flex-1 px-4 py-2.5 border border-border rounded-lg hover:bg-accent transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            on:click={handleConfirm}
            disabled={loading}
            class="flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed {variants[variant].buttonClass}"
          >
            {#if loading}
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Loading...
              </span>
            {:else}
              {confirmText}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
