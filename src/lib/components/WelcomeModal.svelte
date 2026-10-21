<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Modal from "./Modal.svelte";

  export let open = false;

  const dispatch = createEventDispatcher();
  let currentStep = 0;

  const steps = [
    {
      title: "Welcome to CZmoneY",
      description:
        "Your personal finance manager with AI-powered insights. This takes four short steps.",
    },
    {
      title: "Track every transaction",
      description:
        "Add income and expenses in a few taps. Categorize them to see where the money goes. Works offline too.",
    },
    {
      title: "Set budget limits",
      description:
        "Set a monthly limit for each category. You get an alert when spending gets close to it.",
    },
    {
      title: "Get AI insights",
      description:
        "Read a plain summary of your spending, with suggestions based on your own transactions.",
    },
  ];

  const stepIndices = steps.map((_, i) => i);

  function nextStep() {
    if (currentStep < steps.length - 1) {
      currentStep++;
    } else {
      complete();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
    }
  }

  function complete() {
    dispatch("complete");
    open = false;
  }

  function skip() {
    dispatch("skip");
    open = false;
  }
</script>

<Modal bind:open size="md">
  <p class="font-mono text-xs text-ink-3">Step {currentStep + 1} of {steps.length}</p>
  <h2 class="mt-3 text-xl font-semibold tracking-tight">{steps[currentStep].title}</h2>
  <p class="mt-2 text-[15px] leading-relaxed text-ink-2">{steps[currentStep].description}</p>

  <div class="mt-6 flex gap-1.5" aria-hidden="true">
    {#each stepIndices as i (i)}
      <span class="h-1 rounded-full {i === currentStep ? 'w-8 bg-primary' : 'w-4 bg-rule-strong'}"></span>
    {/each}
  </div>

  <div class="mt-8 flex items-center justify-between gap-3">
    <button
      type="button"
      on:click={skip}
      class="min-h-11 text-sm text-ink-2 hover:text-foreground"
    >
      Skip
    </button>

    <div class="flex gap-2">
      {#if currentStep > 0}
        <button
          type="button"
          on:click={prevStep}
          class="min-h-11 rounded-lg border border-rule-strong px-4 text-sm hover:bg-accent"
        >
          Back
        </button>
      {/if}
      <button
        type="button"
        on:click={nextStep}
        class="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/85 active:scale-[0.98]"
      >
        {currentStep === steps.length - 1 ? "Get started" : "Next"}
      </button>
    </div>
  </div>
</Modal>
