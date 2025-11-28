<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  export let income = 0;
  export let expense = 0;

  let chartContainer: HTMLElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chart: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ApexCharts: any = null;

  onMount(() => {
    if (!browser) return;

    const loadChart = async () => {
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
    };

    loadChart();

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
          height: 300,
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
          labels: {
            style: {
              fontSize: "12px",
            },
          },
        },
        yaxis: {
          labels: {
            style: {
              fontSize: "11px",
            },
          },
        },
        colors: ["#10b981", "#ef4444"],
        theme: { mode: "dark" },
        plotOptions: {
          bar: {
            borderRadius: 4,
            columnWidth: "60%",
          },
        },
        dataLabels: {
          enabled: false,
        },
        responsive: [
          {
            breakpoint: 640,
            options: {
              chart: { height: 280 },
              plotOptions: {
                bar: {
                  columnWidth: "70%",
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

<div
  bind:this={chartContainer}
  class="w-full min-h-[280px] sm:min-h-[300px]"
></div>
