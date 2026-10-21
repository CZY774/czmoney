<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";

  $: status = $page.status;
  $: message = $page.error?.message;
</script>

<svelte:head>
  <title>Error {status} - CZmoneY</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-6">
  <div class="w-full max-w-md border-t border-border pt-6">
    <p class="amt text-5xl text-blue-text">{status}</p>

    <h1 class="mt-4 text-xl font-semibold tracking-tight">
      {#if status === 404}
        Page not found
      {:else if status === 401}
        Sign in to continue
      {:else if status === 403}
        You can't open this page
      {:else if status === 500}
        Something broke on our side
      {:else}
        Something went wrong
      {/if}
    </h1>

    <p class="mt-2 text-sm text-ink-2">
      {#if status === 404}
        The address may be wrong, or the page has moved.
      {:else if status === 401}
        Your session has ended. Sign in again and you will be back here.
      {:else if status === 403}
        Your account doesn't have access to this page.
      {:else if status === 500}
        We're looking into it. Try again in a moment.
      {:else}
        An unexpected error happened. Going back usually fixes it.
      {/if}
    </p>

    {#if message}
      <details class="mt-5 text-sm text-ink-3">
        <summary class="cursor-pointer hover:text-foreground">Technical details</summary>
        <code class="mt-2 block break-all font-mono text-xs">{message}</code>
      </details>
    {/if}

    <div class="mt-8 flex gap-3">
      <button
        on:click={() => history.back()}
        class="min-h-11 flex-1 rounded-lg border border-rule-strong px-4 text-sm hover:bg-accent"
      >
        Go back
      </button>
      <button
        on:click={() => goto(resolve("/"))}
        class="min-h-11 flex-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/85"
      >
        Home
      </button>
    </div>

    {#if status === 401}
      <a href={resolve("/auth/login")} class="mt-6 inline-block text-sm text-blue-text hover:underline">
        Sign in
      </a>
    {/if}
  </div>
</div>
