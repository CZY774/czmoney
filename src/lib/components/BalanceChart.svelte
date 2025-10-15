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

  $: if (chart && (income || expense)) {
    updateChart();
  }

  function renderChart() {
    const options = {
      series: [income, expense],
      chart: {
        type: 'donut',
        height: 300,
        background: 'transparent'
      },
      labels: ['Income', 'Expense'],
      colors: ['#10b981', '#ef4444'],
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
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%'
          }
        }
      }
    };

    chart = new ApexCharts(chartContainer, options);
    chart.render();
  }

  function updateChart() {
    if (chart) {
      chart.updateSeries([income, expense]);
    }
  }
</script>

<div class="bg-card p-4 rounded-lg border">
  <h3 class="text-lg font-semibold mb-4">Income vs Expense</h3>
  <div bind:this={chartContainer}></div>
</div>
