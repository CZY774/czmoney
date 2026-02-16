<script lang="ts">
  import { onMount } from "svelte";

  export let data: {
    months: string[];
    categories: Array<{
      name: string;
      color: string;
      amounts: number[];
    }>;
  };

  let chartContainer: HTMLElement;

  onMount(() => {
    let chart: ApexCharts | null = null;

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
      series: data.categories.map((cat) => ({
        name: cat.name,
        data: cat.amounts,
        color: cat.color,
      })),
      xaxis: {
        categories: data.months,
        labels: {
          style: { colors: "#94a3b8" },
        },
      },
      yaxis: {
        labels: {
          style: { colors: "#94a3b8" },
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
        labels: { colors: "#94a3b8" },
        onItemClick: {
          toggleDataSeries: true,
        },
        onItemHover: {
          highlightDataSeries: true,
        },
      },
      grid: {
        borderColor: "#1e293b",
        strokeDashArray: 4,
      },
    };

      chart = new ApexCharts(chartContainer, options);
      chart.render();
    })();

    return () => {
      if (chart) chart.destroy();
    };
  });
</script>

<div bind:this={chartContainer} class="chart-container"></div>

<style>
  .chart-container {
    width: 100%;
    min-height: 400px;
  }
</style>
