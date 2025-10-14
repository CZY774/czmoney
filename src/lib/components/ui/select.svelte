<script lang="ts">
  import { cn } from "$lib/utils";
  
  export let className: string = "";
  export let value: string = "";
  export let id: string = "";
</script>

<select
  {id}
  bind:value
  class={cn(
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
    className
  )}
  {...$$restProps}
  on:change
>
  <slot />
</select>
