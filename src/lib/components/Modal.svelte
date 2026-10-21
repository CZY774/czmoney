<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";
  import { clickOutside } from "$lib/actions/clickOutside";

  export let open = false;
  export let title = "";
  export let description = "";
  export let size: "sm" | "md" | "lg" = "md";

  const dispatch = createEventDispatcher();

  const sizes = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
  };

  function handleClose() {
    open = false;
    dispatch("close");
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-6"
    transition:fade={{ duration: 150 }}
    on:keydown={(e) => e.key === "Escape" && handleClose()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <div
      use:clickOutside={handleClose}
      class="flex max-h-[90dvh] w-full {sizes[size]} flex-col overflow-hidden rounded-t-2xl border border-border bg-background sm:rounded-2xl"
    >
      {#if title}
        <div class="px-5 pt-5 sm:px-6 sm:pt-6">
          <h2 id="modal-title" class="text-lg font-semibold tracking-tight">{title}</h2>
          {#if description}
            <p class="mt-1 text-sm text-ink-2">{description}</p>
          {/if}
        </div>
      {/if}

      <div class="flex-1 overflow-y-auto px-5 py-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-6">
        <slot />
      </div>

      {#if $$slots.footer}
        <div class="border-t border-border px-5 py-4 sm:px-6">
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}
