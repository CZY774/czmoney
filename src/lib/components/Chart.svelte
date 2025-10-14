<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let options = {};
  export let series = [];
  export let type = 'line';
  export let height = 350;

  let chartElement;
  let chart;

  onMount(async () => {
    if (browser) {
      const ApexCharts = (await import('apexcharts')).default;
      
      const chartOptions = {
        chart: {
          type,
          height,
          background: 'transparent',
          toolbar: { show: false }
        },
        theme: { mode: 'dark' },
        ...options,
        series
      };

      chart = new ApexCharts(chartElement, chartOptions);
      chart.render();
    }
  });

  $: if (browser && chart) {
    chart.updateOptions({ series });
  }
</script>

<div bind:this={chartElement}></div>
