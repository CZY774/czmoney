<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { createEventDispatcher } from "svelte";

  export let type: "success" | "error" | "warning" | "info" = "info";
  export let title = "";
  export let message = "";
  export let dismissible = true;
  export let autoDismiss = false;
  export let duration = 5000;

  const dispatch = createEventDispatcher();

  let visible = true;

  const icons = {
    success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
    </svg>`,
    error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
    </svg>`,
    warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
    </svg>`,
    info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>`,
  };

  const styles = {
    success: "bg-green-500/10 border-green-500/30 text-green-400",
    error: "bg-red-500/10 border-red-500/30 text-red-400",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  };

  function dismiss() {
    visible = false;
    dispatch("dismiss");
  }

  if (autoDismiss) {
    setTimeout(dismiss, duration);
  }
</script>

{#if visible}
  <div
    class="border rounded-lg p-4 {styles[type]} shadow-lg"
    transition:fly={{ y: -20, duration: 300 }}
    role="alert"
  >
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 mt-0.5">
        {@html icons[type]}
      </div>
      <div class="flex-1 min-w-0">
        {#if title}
          <h3 class="font-semibold text-sm mb-1">{title}</h3>
        {/if}
        {#if message}
          <p class="text-sm opacity-90">{message}</p>
        {/if}
        <slot />
      </div>
      {#if dismissible}
        <button
          on:click={dismiss}
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
      {/if}
    </div>
  </div>
{/if}
