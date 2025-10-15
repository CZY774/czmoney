<script>
  import { onMount } from 'svelte';
  import ApexCharts from 'apexcharts';

  export let data = [];

  let chartContainer;
  let chart;

  onMount(() => {
    if (chartContainer && data.length > 0) {
      renderChart();
    }
    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  });

  function renderChart() {
    const options = {
      series: data.map(d => d.amount),
      chart: {
        type: 'pie',
        height: 300,
        background: 'transparent'
      },
      labels: data.map(d => d.name),
      theme: {
        mode: 'dark'
      }
    };

    chart = new ApexCharts(chartContainer, options);
    chart.render();
  }
</script>

{#if data.length > 0}
  <div bind:this={chartContainer} class="w-full h-[300px]"></div>
{:else}
  <div class="h-[300px] flex items-center justify-center text-muted-foreground">
    No data
  </div>
{/if}
