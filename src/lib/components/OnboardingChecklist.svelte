<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let tasks: Array<{ id: string; label: string; completed: boolean }> = [];

  const dispatch = createEventDispatcher();

  $: completedCount = tasks.filter((t) => t.completed).length;
  $: progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  $: allCompleted = completedCount === tasks.length && tasks.length > 0;

  function toggleTask(id: string) {
    dispatch("toggle", id);
  }

  function dismiss() {
    dispatch("dismiss");
  }
</script>

{#if !allCompleted}
  <section aria-labelledby="h-start" class="border-t border-border pt-5">
    <div class="flex items-baseline justify-between gap-4 pb-3">
      <h2 id="h-start" class="text-[15px] font-semibold">Get started</h2>
      <div class="flex items-baseline gap-4">
        <p class="font-mono text-xs text-ink-3">{completedCount} of {tasks.length}</p>
        <button
          type="button"
          on:click={dismiss}
          class="min-h-8 text-xs text-ink-3 underline-offset-4 hover:text-foreground hover:underline"
        >
          Hide
        </button>
      </div>
    </div>

    <div class="mb-3 h-1 rounded-sm bg-blue-track" role="img" aria-label="{Math.round(progress)} percent complete">
      <div class="h-full rounded-sm bg-primary transition-[width] duration-300" style="width: {progress}%"></div>
    </div>

    <ul>
      {#each tasks as task (task.id)}
        <li>
          <button
            type="button"
            on:click={() => toggleTask(task.id)}
            class="flex min-h-11 w-full items-center gap-3 text-left text-sm hover:text-foreground {task.completed ? 'text-ink-3' : 'text-ink-2'}"
          >
            <span class="grid size-4 flex-none place-items-center rounded-full border {task.completed ? 'border-primary bg-primary' : 'border-rule-strong'}" aria-hidden="true">
              {#if task.completed}
                <svg class="size-2.5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              {/if}
            </span>
            <span class={task.completed ? "line-through" : ""}>{task.label}</span>
          </button>
        </li>
      {/each}
    </ul>
  </section>
{/if}
