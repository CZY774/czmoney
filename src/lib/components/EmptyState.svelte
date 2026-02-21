<script lang="ts">
  export let title: string;
  export let description: string;
  export let actionLabel: string;
  export let icon = "📊";
  export let onAction: () => void;
</script>

<div class="flex flex-col items-center justify-center py-12 px-4 text-center">
  <div class="text-6xl sm:text-7xl mb-4">{icon}</div>
  <h3 class="text-lg sm:text-xl font-semibold mb-2">{title}</h3>
  <p class="text-sm sm:text-base text-muted-foreground mb-6 max-w-md">
    {description}
  </p>
  <button
    type="button"
    on:click={onAction}
    class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm sm:text-base"
  >
    {actionLabel}
  </button>
</div>
