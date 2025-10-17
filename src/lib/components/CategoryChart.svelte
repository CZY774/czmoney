<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let categories = [];

  let chartContainer;
  let chart;
  let ApexCharts;

  onMount(async () => {
    if (!browser) return;
    
    try {
      const module = await import('apexcharts');
      ApexCharts = module.default;
      
      setTimeout(() => {
        if (chartContainer && ApexCharts && categories.length > 0) {
          renderChart();
        }
      }, 100);
    } catch (error) {
      console.warn('Failed to load ApexCharts:', error);
    }
    
    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  });

  $: if (browser && ApexCharts && chartContainer && categories.length > 0) {
    setTimeout(renderChart, 100);
  }

  function renderChart() {
    if (!chartContainer || !ApexCharts || !browser || categories.length === 0) return;
    
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

      if (chart) {
        chart.destroy();
        chart = null;
      }

      chart = new ApexCharts(chartContainer, options);
      chart.render().catch(err => console.warn('Chart render failed:', err));
    } catch (error) {
      console.warn('Chart render error:', error);
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
