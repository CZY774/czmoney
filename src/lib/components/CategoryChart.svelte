<script>
  import { onMount } from 'svelte';
  import ApexCharts from 'apexcharts';

  export let categories = [];

  let chartContainer;
  let chart;
  let mounted = false;

  onMount(() => {
    mounted = true;
    setTimeout(() => {
      if (chartContainer && mounted && categories.length > 0) {
        renderChart();
      }
    }, 100);
    
    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  });

  $: if (mounted && chartContainer && categories.length > 0) {
    if (chart) {
      chart.destroy();
    }
    setTimeout(renderChart, 50);
  }

  function renderChart() {
    try {
      const options = {
        series: categories.map(d => d.amount),
        chart: {
          type: 'pie',
          height: 250,
          width: '100%',
          background: 'transparent',
          toolbar: { show: false }
        },
        labels: categories.map(d => d.name),
        theme: { mode: 'dark' },
        responsive: [{
          breakpoint: 768,
          options: {
            chart: { height: 200 },
            legend: { position: 'bottom' }
          }
        }]
      };

      chart = new ApexCharts(chartContainer, options);
      chart.render();
    } catch (error) {
      console.error('Chart render error:', error);
    }
  }
</script>

{#if categories.length > 0}
  <div bind:this={chartContainer} class="w-full min-h-[250px] md:min-h-[300px]"></div>
{:else}
  <div class="min-h-[250px] flex items-center justify-center text-muted-foreground">
    No data
  </div>
{/if}
