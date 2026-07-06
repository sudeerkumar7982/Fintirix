// Configuration and styling helper for Chart.js - Groww Light Theme Edition
export function createPriceChart(ctx, initialData = [], isPositive = true) {
  const accentColor = isPositive ? "#00d09c" : "#ff5252"; // Groww Green vs Loss Red
  const accentColorAlpha = isPositive ? "rgba(0, 208, 156, 0.05)" : "rgba(255, 82, 82, 0.05)";
  const accentColorBorder = isPositive ? "rgba(0, 208, 156, 1)" : "rgba(255, 82, 82, 1)";

  // Remove gradient to match Groww's clean line chart
  const gradient = "transparent";

  const config = {
    type: "line",
    data: {
      labels: initialData.map(d => d.time),
      datasets: [
        {
          label: "Price",
          data: initialData.map(d => d.close),
          borderColor: accentColorBorder,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: accentColor,
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 2,
          fill: false,
          backgroundColor: gradient,
          tension: 0.15,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: "#1e293b", // Slate-800 for high readability in light mode
          titleColor: "#94a3b8",
          bodyColor: "#ffffff",
          borderColor: "#334155",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
          displayColors: false,
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#64748b",
            font: {
              family: "Inter",
              size: 11
            },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8
          },
          border: {
            display: false
          }
        },
        y: {
          grid: {
            color: "rgba(0, 0, 0, 0.04)", // Soft light grid lines
          },
          ticks: {
            color: "#64748b",
            font: {
              family: "Inter",
              size: 11
            },
            callback: function (value) {
              return "₹" + value.toFixed(2);
            }
          },
          border: {
            display: false
          }
        }
      }
    }
  };

  return new Chart(ctx, config);
}

export function updatePriceChart(chart, data, isPositive) {
  const accentColor = isPositive ? "#00d09c" : "#ff5252";
  const accentColorAlpha = isPositive ? "rgba(0, 208, 156, 0.05)" : "rgba(255, 82, 82, 0.05)";
  const accentColorBorder = isPositive ? "rgba(0, 208, 156, 1)" : "rgba(255, 82, 82, 1)";

  const ctx = chart.ctx;
  const gradient = "transparent";

  chart.data.labels = data.map(d => d.time);
  chart.data.datasets[0].data = data.map(d => d.close);
  chart.data.datasets[0].borderColor = accentColorBorder;
  chart.data.datasets[0].pointHoverBackgroundColor = accentColor;
  chart.data.datasets[0].backgroundColor = gradient;
  
  chart.update("none");
}

// Portfolio Doughnut Chart - Groww Theme
export function createPortfolioChart(ctx, labels = [], data = []) {
  const themePalette = [
    "#5367f5", // Groww Blue
    "#00d09c", // Groww Green
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#14b8a6", // Teal
    "#8b5cf6", // Purple
    "#3b82f6", // Sky Blue
    "#f43f5e", // Rose
    "#84cc16", // Lime
  ];

  const config = {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: themePalette.slice(0, Math.max(1, labels.length)),
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          position: "right",
          labels: {
            boxWidth: 10,
            padding: 12,
            color: "#475569",
            font: {
              family: "Inter",
              size: 11
            }
          }
        },
        tooltip: {
          backgroundColor: "#1e293b",
          borderColor: "#334155",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: function(context) {
              const value = context.parsed;
              const formattedVal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
              return ` ${context.label}: ${formattedVal}`;
            }
          }
        }
      }
    }
  };

  return new Chart(ctx, config);
}

export function updatePortfolioChart(chart, labels, data) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  
  const themePalette = ["#5367f5", "#00d09c", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6", "#3b82f6", "#f43f5e", "#84cc16"];
  chart.data.datasets[0].backgroundColor = themePalette.slice(0, labels.length);
  
  chart.update();
}
