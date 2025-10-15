<script>
  import { onMount } from 'svelte';
  import ApexCharts from 'apexcharts';

  export let balance = { income: 0, expense: 0 };

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

  function renderChart() {
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
          data: [balance.income || 0, balance.expense || 0]
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

      chart = new ApexCharts(chartContainer, options);
      chart.render();
    } catch (error) {
      console.error('Chart render error:', error);
    }
  }
</script>

<div bind:this={chartContainer} class="w-full min-h-[250px] md:min-h-[300px]"></div>
