<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Modal from "./Modal.svelte";

  export let open = false;

  const dispatch = createEventDispatcher();
  let currentStep = 0;

  const steps = [
    {
      title: "Welcome to CZmoneY! 💰",
      description:
        "Your personal finance manager with AI-powered insights. Track expenses, manage budgets, and achieve your financial goals.",
      icon: "💰",
    },
    {
      title: "Track Your Finances 📊",
      description:
        "Add transactions easily, categorize expenses, and see your spending patterns with beautiful charts and reports.",
      icon: "📊",
    },
    {
      title: "Smart Budget Alerts 🎯",
      description:
        "Set category budgets and get intelligent alerts when you're approaching limits or overspending.",
      icon: "🎯",
    },
    {
      title: "AI-Powered Insights 🤖",
      description:
        "Get personalized financial advice and spending analysis powered by Google Gemini AI.",
      icon: "🤖",
    },
    {
      title: "Works Offline 📱",
      description:
        "Add transactions offline and they'll sync automatically when you're back online. Install as a PWA for the best experience!",
      icon: "📱",
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

<Modal bind:open size="lg">
  <div class="p-6">
    <div class="text-center mb-6">
      <div class="text-6xl mb-4">{steps[currentStep].icon}</div>
      <h2 class="text-2xl font-bold mb-2">{steps[currentStep].title}</h2>
      <p class="text-muted-foreground">{steps[currentStep].description}</p>
    </div>

    <div class="flex justify-center gap-2 mb-6">
      {#each stepIndices as i (i)}
        <div
          class="h-2 rounded-full transition-all {i === currentStep
            ? 'w-8 bg-primary'
            : 'w-2 bg-muted'}"
        ></div>
      {/each}
    </div>

    <div class="flex justify-between items-center">
      <button
        type="button"
        on:click={skip}
        class="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip
      </button>

      <div class="flex gap-2">
        {#if currentStep > 0}
          <button
            type="button"
            on:click={prevStep}
            class="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
          >
            Back
          </button>
        {/if}
        <button
          type="button"
          on:click={nextStep}
          class="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          {currentStep === steps.length - 1 ? "Get Started" : "Next"}
        </button>
      </div>
    </div>
  </div>
</Modal>
