<script lang="ts">
  export let type: 'card' | 'list' | 'chart' = 'card';
  export let count = 3;
</script>

<!-- Same shape as the loaded content, with no ink. Keeps the layout still while data arrives. -->
<div class="animate-pulse" aria-hidden="true">
  {#if type === 'card'}
    <div class="space-y-6">
      {#each Array(count) as _, i (i)}
        <div class="h-16 rounded bg-muted"></div>
      {/each}
    </div>
  {:else if type === 'list'}
    <ul>
      {#each Array(count) as _, i (i)}
        <li class="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-border py-4">
          <div class="space-y-2">
            <div class="h-4 w-2/3 rounded bg-muted"></div>
            <div class="h-3 w-1/3 rounded bg-muted"></div>
          </div>
          <div class="h-4 w-24 rounded bg-muted"></div>
        </li>
      {/each}
    </ul>
  {:else if type === 'chart'}
    <div class="h-64 rounded bg-muted"></div>
  {/if}
</div>
