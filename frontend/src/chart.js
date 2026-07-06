// Chart.js helpers — mirrors the original chart.js but uses window.Chart (CDN)
const Chart = window.Chart;

export function createPriceChart(canvasId, initialData = []) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: initialData.map(d => d.time),
      datasets: [{
        label: 'Price',
        data: initialData.map(d => d.close),
        borderColor: '#00d09c',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#00d09c',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        fill: false,
        backgroundColor: 'transparent',
        tension: 0.15,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index', intersect: false,
          backgroundColor: '#1e293b', titleColor: '#94a3b8',
          bodyColor: '#ffffff', borderColor: '#334155',
          borderWidth: 1, padding: 10, cornerRadius: 6,
          displayColors: false,
          callbacks: {
            label: ctx2 => {
              const v = ctx2.parsed.y;
              return v != null ? `Price: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)}` : '';
            }
          }
        }
      },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, border: { display: false } },
        y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 }, callback: v => '₹' + v.toFixed(2) }, border: { display: false } }
      }
    }
  });
}

export function updatePriceChart(chart, data, isPositive) {
  if (!chart) return;
  const color = isPositive ? '#00d09c' : '#ff5252';
  chart.data.labels = data.map(d => d.time);
  chart.data.datasets[0].data = data.map(d => d.close);
  chart.data.datasets[0].borderColor = color;
  chart.data.datasets[0].pointHoverBackgroundColor = color;
  chart.update('none');
}

export function createPortfolioChart(canvasId, labels = [], data = []) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  const palette = ['#5367f5','#00d09c','#f59e0b','#ec4899','#14b8a6','#8b5cf6','#3b82f6','#f43f5e','#84cc16'];
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: palette.slice(0, Math.max(1, labels.length)), borderColor: '#ffffff', borderWidth: 2, hoverOffset: 4 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 10, padding: 12, color: '#475569', font: { family: 'Inter', size: 11 } } },
        tooltip: {
          backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, padding: 10, cornerRadius: 6,
          callbacks: { label: ctx2 => ` ${ctx2.label}: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(ctx2.parsed)}` }
        }
      }
    }
  });
}

export function updatePortfolioChart(chart, labels, data) {
  if (!chart) return;
  const palette = ['#5367f5','#00d09c','#f59e0b','#ec4899','#14b8a6','#8b5cf6','#3b82f6','#f43f5e','#84cc16'];
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.data.datasets[0].backgroundColor = palette.slice(0, labels.length);
  chart.update();
}
