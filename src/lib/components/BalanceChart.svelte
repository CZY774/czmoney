<script>
  import { onMount } from 'svelte';
  import ApexCharts from 'apexcharts';

  export let balance = { income: 0, expense: 0 };

  let chartContainer;
  let chart;

  onMount(() => {
    if (chartContainer && balance) {
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
      chart: {
        type: 'bar',
        height: 300,
        background: 'transparent'
      },
      series: [{
        name: 'Amount',
        data: [balance.income, balance.expense]
      }],
      xaxis: {
        categories: ['Income', 'Expense']
      },
      colors: ['#10b981', '#ef4444'],
      theme: {
        mode: 'dark'
      }
    };

    chart = new ApexCharts(chartContainer, options);
    chart.render();
  }
</script>

<div bind:this={chartContainer} class="w-full h-[300px]"></div>
