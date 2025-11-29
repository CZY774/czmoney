<script lang="ts">
  export let type: 'card' | 'list' | 'chart' = 'card';
  export let count = 3;
</script>

<div class="animate-pulse space-y-3">
  {#if type === 'card'}
    {#each Array(count) as _, i (i)}
      <div class="h-24 bg-card/50 rounded-lg border border-border"></div>
    {/each}
  {:else if type === 'list'}
    {#each Array(count) as _, i (i)}
      <div class="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border">
        <div class="w-12 h-12 bg-accent/20 rounded"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-accent/20 rounded w-3/4"></div>
          <div class="h-3 bg-accent/20 rounded w-1/2"></div>
        </div>
      </div>
    {/each}
  {:else if type === 'chart'}
    <div class="h-64 bg-card/50 rounded-lg border border-border flex items-center justify-center">
      <div class="text-muted-foreground">Loading chart...</div>
    </div>
  {/if}
</div>
