<script lang="ts">
  import { fly } from "svelte/transition";
  import { toastStore } from "$lib/stores/toast";

  // Severity is shown by shape and label. The color only reinforces it.
  const icons = {
    success: `<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
    error: `<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
    warning: `<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01"/></svg>`,
    info: `<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01"/></svg>`,
  };

  const accents = {
    success: "text-blue-text",
    error: "text-critical",
    warning: "text-warning",
    info: "text-ink-2",
  };
</script>

<div
  class="pointer-events-none fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:max-w-md sm:px-0"
  role="status"
  aria-live="polite"
>
  {#each $toastStore as toast (toast.id)}
    <div
      class="pointer-events-auto rounded-lg border border-rule-strong bg-background p-4 shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
      transition:fly={{ x: 300, duration: 300 }}
    >
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 {accents[toast.type]}">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html icons[toast.type]}
        </div>
        <div class="min-w-0 flex-1">
          {#if toast.title}
            <h3 class="mb-1 text-sm font-semibold break-words">{toast.title}</h3>
          {/if}
          <p class="text-sm break-words text-ink-2">{toast.message}</p>
          {#if toast.action}
            <button
              on:click={toast.action.callback}
              class="mt-2 min-h-8 text-xs text-blue-text underline-offset-4 hover:underline"
            >
              {toast.action.label}
            </button>
          {/if}
        </div>
        <button
          on:click={() => toastStore.remove(toast.id)}
          class="grid size-8 flex-shrink-0 place-items-center text-ink-3 hover:text-foreground"
          aria-label="Dismiss"
        >
          <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  {/each}
</div>
