<script>
  import { onMount } from 'svelte';
  import ApexCharts from 'apexcharts';

  export let categories = [];

  let chartContainer;
  let chart;

  onMount(() => {
    if (chartContainer && categories.length > 0) {
      renderChart();
    }
    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  });

  $: if (chart && categories.length > 0) {
    updateChart();
  }

  function renderChart() {
    const labels = categories.map(c => c.name);
    const series = categories.map(c => c.amount);

    const options = {
      series: series,
      chart: {
        type: 'pie',
        height: 300,
        background: 'transparent'
      },
      labels: labels,
      theme: {
        mode: 'dark'
      },
      legend: {
        labels: {
          colors: '#9fb0c8'
        }
      },
      dataLabels: {
        style: {
          colors: ['#fff']
        }
      }
    };

    chart = new ApexCharts(chartContainer, options);
    chart.render();
  }

  function updateChart() {
    if (chart) {
      const labels = categories.map(c => c.name);
      const series = categories.map(c => c.amount);
      chart.updateOptions({
        labels: labels
      });
      chart.updateSeries(series);
    }
  }
</script>

<div class="bg-card p-4 rounded-lg border">
  <h3 class="text-lg font-semibold mb-4">Expenses by Category</h3>
  {#if categories.length > 0}
    <div bind:this={chartContainer}></div>
  {:else}
    <div class="h-[300px] flex items-center justify-center text-muted-foreground">
      No expense data available
    </div>
  {/if}
</div>
