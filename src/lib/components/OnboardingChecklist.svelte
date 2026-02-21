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
  <div class="bg-card border border-border rounded-lg p-4 sm:p-6">
    <div class="flex items-start justify-between mb-4">
      <div>
        <h3 class="text-base sm:text-lg font-semibold mb-1">Get Started</h3>
        <p class="text-xs sm:text-sm text-muted-foreground">
          {completedCount} of {tasks.length} completed
        </p>
      </div>
      <button
        type="button"
        on:click={dismiss}
        class="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <div class="w-full bg-muted rounded-full h-2 mb-4">
      <div
        class="bg-primary h-2 rounded-full transition-all duration-300"
        style="width: {progress}%"
      ></div>
    </div>

    <div class="space-y-2">
      {#each tasks as task (task.id)}
        <button
          type="button"
          on:click={() => toggleTask(task.id)}
          class="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left"
        >
          <div
            class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 {task.completed
              ? 'bg-primary border-primary'
              : 'border-muted-foreground'}"
          >
            {#if task.completed}
              <svg class="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            {/if}
          </div>
          <span class="text-sm {task.completed ? 'line-through text-muted-foreground' : ''}">
            {task.label}
          </span>
        </button>
      {/each}
    </div>
  </div>
{/if}
