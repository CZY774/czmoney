<script lang="ts">
  import { fly } from "svelte/transition";
  import { toastStore } from "$lib/stores/toast";

  const icons = {
    success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>`,
    error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>`,
    warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
    </svg>`,
    info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>`,
  };

  const styles = {
    success: "bg-green-500/90 text-white border-green-400",
    error: "bg-red-500/90 text-white border-red-400",
    warning: "bg-yellow-500/90 text-white border-yellow-400",
    info: "bg-blue-500/90 text-white border-blue-400",
  };
</script>

<div
  class="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm sm:max-w-md px-4 sm:px-0 pointer-events-none"
>
  {#each $toastStore as toast (toast.id)}
    <div
      class="pointer-events-auto rounded-lg shadow-2xl border backdrop-blur-sm {styles[
        toast.type
      ]} p-4"
      transition:fly={{ x: 300, duration: 300 }}
    >
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html icons[toast.type]}
        </div>
        <div class="flex-1 min-w-0">
          {#if toast.title}
            <h3 class="font-semibold text-sm mb-1 break-words">{toast.title}</h3>
          {/if}
          <p class="text-sm opacity-95 break-words">{toast.message}</p>
          {#if toast.action}
            <button
              on:click={toast.action.callback}
              class="mt-2 text-xs underline hover:no-underline opacity-90 hover:opacity-100"
            >
              {toast.action.label}
            </button>
          {/if}
        </div>
        <button
          on:click={() => toastStore.remove(toast.id)}
          class="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  {/each}
</div>
