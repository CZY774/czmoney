<script>
  export let type = "button";
  export let disabled = false;
  export let className = "";
</script>

<button
  {type}
  {disabled}
  class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 {className}"
  on:click
>
  <slot />
</button>
