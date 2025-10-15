<script>
  import { onMount } from 'svelte';
  import ApexCharts from 'apexcharts';

  export let income = 0;
  export let expense = 0;

  let chartContainer;
  let chart;
  let mounted = false;

  onMount(() => {
    mounted = true;
    setTimeout(() => {
      if (chartContainer && mounted) {
        renderChart();
      }
    }, 100);
    
    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  });

  $: if (mounted && chartContainer && (income >= 0 || expense >= 0)) {
    setTimeout(renderChart, 100);
  }

  function renderChart() {
    if (!chartContainer || !mounted) return;
    
    try {
      const options = {
        chart: {
          type: 'bar',
          height: 250,
          width: '100%',
          background: 'transparent',
          toolbar: { show: false }
        },
        series: [{
          name: 'Amount',
          data: [income || 0, expense || 0]
        }],
        xaxis: {
          categories: ['Income', 'Expense']
        },
        colors: ['#10b981', '#ef4444'],
        theme: { mode: 'dark' },
        responsive: [{
          breakpoint: 768,
          options: {
            chart: { height: 200 }
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

<div bind:this={chartContainer} class="w-full min-h-[250px] md:min-h-[300px]"></div>
