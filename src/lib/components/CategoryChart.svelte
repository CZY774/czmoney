<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  export let categories: Array<{ name: string; amount: number }> = [];

  let chartContainer: HTMLElement;
  let loading = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chart: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ApexCharts: any = null;

  onMount(() => {
    if (!browser) return;

    (async () => {
      try {
        const module = await import("apexcharts");
        ApexCharts = module.default;
        loading = false;
      } catch (error) {
        console.warn("Failed to load ApexCharts:", error);
        loading = false;
      }
    })();

    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  });

  $: if (browser && ApexCharts && chartContainer && !loading && categories.length > 0) {
    renderChart();
  }

  function renderChart() {
    if (!chartContainer || !ApexCharts || !browser || categories.length === 0)
      return;

    try {
      const options = {
        series: categories.map((d) => d.amount),
        chart: {
          type: "donut",
          height: 320,
          width: "100%",
          background: "transparent",
          toolbar: { show: false },
        },
        labels: categories.map((d) => d.name),
        theme: { mode: "dark" },
        legend: {
          position: "bottom",
          fontSize: "12px",
        },
        dataLabels: {
          enabled: true,
          style: {
            fontSize: "11px",
          },
        },
        plotOptions: {
          pie: {
            donut: {
              size: "65%",
            },
          },
        },
        responsive: [
          {
            breakpoint: 640,
            options: {
              chart: { height: 300 },
              legend: {
                fontSize: "11px",
                itemMargin: {
                  horizontal: 5,
                  vertical: 3,
                },
              },
              dataLabels: {
                style: {
                  fontSize: "10px",
                },
              },
            },
          },
        ],
      };

      if (chart) {
        chart.destroy();
        chart = null;
      }

      chart = new ApexCharts(chartContainer, options);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart.render().catch((err: any) => console.warn("Chart render failed:", err));
    } catch (error) {
      console.warn("Chart render error:", error);
    }
  }
</script>

{#if loading}
  <div class="w-full min-h-[300px] sm:min-h-[320px] bg-card/50 rounded-lg animate-pulse flex items-center justify-center">
    <div class="text-muted-foreground text-sm">Loading chart...</div>
  </div>
{:else if categories.length > 0}
  <div
    bind:this={chartContainer}
    class="w-full min-h-[300px] sm:min-h-[320px]"
  ></div>
{:else}
  <div
    class="min-h-[300px] flex items-center justify-center text-muted-foreground"
  >
    No data
  </div>
{/if}
