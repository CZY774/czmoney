<script lang="ts">
  import { onMount } from 'svelte';
  
  export let type: 'donut' | 'bar' = 'donut';
  export let series: number[] = [];
  export let labels: string[] = [];
  export let height: number = 350;
  
  let chartContainer: HTMLDivElement;
  let ApexCharts: any;

  onMount(async () => {
    // Dynamically import ApexCharts to avoid SSR issues
    const module = await import('apexcharts');
    ApexCharts = module.default;
    
    if (series.length > 0) {
      renderChart();
    }
  });

  function renderChart() {
    if (!ApexCharts || !chartContainer) return;

    const options = {
      chart: {
        type,
        height,
        background: 'transparent'
      },
      series,
      labels,
      colors: ['#1f8ef1', '#00d1b2', '#ff6b6b', '#feca57', '#ff9ff3', '#54a0ff'],
      legend: {
        position: 'bottom',
        labels: {
          colors: '#9fb0c8'
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%'
          }
        }
      },
      dataLabels: {
        enabled: false
      },
      tooltip: {
        theme: 'dark'
      }
    };

    const chart = new ApexCharts(chartContainer, options);
    chart.render();

    return () => {
      chart.destroy();
    };
  }

  $: if (ApexCharts && series.length > 0) {
    renderChart();
  }
</script>

<div bind:this={chartContainer} class="w-full"></div>

{#if series.length === 0}
  <div class="flex items-center justify-center h-64 text-muted-foreground">
    No data to display
  </div>
{/if}
