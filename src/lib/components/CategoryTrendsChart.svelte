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
  let chart: any;

  onMount(async () => {
    const ApexCharts = (await import("apexcharts")).default;

    const options = {
      chart: {
        type: "bar",
        height: 400,
        background: "transparent",
        toolbar: { show: false },
        animations: { enabled: true },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "70%",
          dataLabels: { position: "top" },
        },
      },
      dataLabels: { enabled: false },
      stroke: {
        show: true,
        width: 2,
        colors: ["transparent"],
      },
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
      },
      grid: {
        borderColor: "#1e293b",
        strokeDashArray: 4,
      },
    };

    chart = new ApexCharts(chartContainer, options);
    chart.render();

    return () => {
      if (chart) chart.destroy();
    };
  });
</script>

<div bind:this={chartContainer} class="chart-container" />

<style>
  .chart-container {
    width: 100%;
    min-height: 400px;
  }
</style>
