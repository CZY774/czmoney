<script>
  export let type = "text";
  export let value = "";
  export let placeholder = "";
  export let required = false;
  export let id = "";
</script>

{#if type === "email"}
  <input
    type="email"
    {id}
    {placeholder}
    {required}
    bind:value
    class="w-full p-2 border border-border rounded bg-background"
  />
{:else if type === "password"}
  <input
    type="password"
    {id}
    {placeholder}
    {required}
    bind:value
    class="w-full p-2 border border-border rounded bg-background"
  />
{:else if type === "number"}
  <input
    type="number"
    {id}
    {placeholder}
    {required}
    bind:value
    class="w-full p-2 border border-border rounded bg-background"
  />
{:else}
  <input
    type="text"
    {id}
    {placeholder}
    {required}
    bind:value
    class="w-full p-2 border border-border rounded bg-background"
  />
{/if}
