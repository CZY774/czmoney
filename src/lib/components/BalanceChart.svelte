<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  export let income = 0;
  export let expense = 0;

  let chartContainer: HTMLElement;
  let chart: any;
  let ApexCharts: any;

  onMount(async () => {
    if (!browser) return;

    try {
      const module = await import("apexcharts");
      ApexCharts = module.default;

      setTimeout(() => {
        if (chartContainer && ApexCharts) {
          renderChart();
        }
      }, 100);
    } catch (error) {
      console.warn("Failed to load ApexCharts:", error);
    }

    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  });

  $: if (
    browser &&
    ApexCharts &&
    chartContainer &&
    (income >= 0 || expense >= 0)
  ) {
    setTimeout(renderChart, 100);
  }

  function renderChart() {
    if (!chartContainer || !ApexCharts || !browser) return;

    try {
      const options = {
        chart: {
          type: "bar",
          height: 250,
          width: "100%",
          background: "transparent",
          toolbar: { show: false },
        },
        series: [
          {
            name: "Amount",
            data: [income || 0, expense || 0],
          },
        ],
        xaxis: {
          categories: ["Income", "Expense"],
        },
        colors: ["#10b981", "#ef4444"],
        theme: { mode: "dark" },
        responsive: [
          {
            breakpoint: 768,
            options: {
              chart: { height: 200 },
            },
          },
        ],
      };

      if (chart) {
        chart.destroy();
        chart = null;
      }

      chart = new ApexCharts(chartContainer, options);
      chart.render().catch((err: any) => console.warn("Chart render failed:", err));
    } catch (error) {
      console.warn("Chart render error:", error);
    }
  }
</script>

<div
  bind:this={chartContainer}
  class="w-full min-h-[250px] md:min-h-[300px]"
></div>
