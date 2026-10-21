<script lang="ts">
  export let title: string;
  export let description: string;
  export let actionLabel: string;
  export let onAction: () => void;
</script>

<section class="border-t border-border py-12">
  <h2 class="text-xl font-semibold tracking-tight">{title}</h2>
  <p class="mt-2 max-w-md text-[15px] leading-relaxed text-ink-2">{description}</p>
  <button
    type="button"
    on:click={onAction}
    class="mt-6 min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/85 active:scale-[0.98]"
  >
    {actionLabel}
  </button>
</section>
