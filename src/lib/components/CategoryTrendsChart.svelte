<script lang="ts">
  import { onMount } from "svelte";
  import { CHART_OTHER_COLOR } from "$lib/config/chartPalette";

  export let data: {
    months: string[];
    categories: Array<{
      name: string;
      amounts: number[];
    }>;
  };
  // Series name -> hex, built once by the Reports page for both charts
  export let colors: Map<string, string> = new Map();

  let chartContainer: HTMLElement;
  let chart: ApexCharts | null = null;

  function buildSeries(d: typeof data, c: Map<string, string>) {
    return d.categories.map((cat) => ({
      name: cat.name,
      data: cat.amounts,
      color: c.get(cat.name) ?? CHART_OTHER_COLOR,
    }));
  }

  onMount(() => {
    let destroyed = false;

    (async () => {
      const ApexCharts = (await import("apexcharts")).default;

    const options = {
      chart: {
        type: "line",
        height: 400,
        background: "transparent",
        toolbar: { show: false },
        animations: { enabled: true },
      },
      stroke: {
        curve: "smooth",
        width: 3,
      },
      markers: {
        size: 5,
        hover: {
          size: 7,
        },
      },
      dataLabels: { enabled: false },
      series: buildSeries(data, colors),
      xaxis: {
        categories: data.months,
        labels: {
          style: { colors: "#a5a9b3" },
        },
      },
      yaxis: {
        labels: {
          style: { colors: "#a5a9b3" },
          formatter: (val: number) => {
            return new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(val);
          },
        },
      },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (val: number) => {
            return new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(val);
          },
        },
      },
      legend: {
        position: "bottom",
        labels: { colors: "#a5a9b3" },
        onItemClick: {
          toggleDataSeries: true,
        },
        onItemHover: {
          highlightDataSeries: true,
        },
      },
      grid: {
        borderColor: "#17191d",
        strokeDashArray: 4,
      },
    };

      const instance = new ApexCharts(chartContainer, options);
      await instance.render();
      if (destroyed) {
        instance.destroy();
        return;
      }
      chart = instance;
    })();

    return () => {
      destroyed = true;
      if (chart) chart.destroy();
    };
  });

  // Period toggles and background refreshes pass new data to the same chart
  $: if (chart) {
    chart.updateOptions({
      series: buildSeries(data, colors),
      xaxis: { categories: data.months },
    });
  }
</script>

<div bind:this={chartContainer} class="chart-container"></div>

<style>
  .chart-container {
    width: 100%;
    min-height: 400px;
  }
</style>
