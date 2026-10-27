<template>
  <div class="chart-wrapper">
    <div class="chart-header">{{ title }}</div>
    <canvas ref="canvas" height="100"></canvas>
  </div>
</template>

<script>
import Chart from 'chart.js/auto';
import { playheadPlugin } from '../utils/chartPlugins';

export default {
  name: 'AngleChart',
  props: {
    title: String,
    labels: Array,
    dataPoints: Array,
    currentFrameIndex: Number,
    step: Number,
    isPlaying: Boolean
  },
  data() {
    return {
      chartInstance: null
    };
  },
  watch: {
    currentFrameIndex(newIndex) {
      if (this.chartInstance) {
        this.chartInstance._playheadIndex = Math.floor(newIndex / this.step);
        this.chartInstance.draw();
      }
    }
  },
  mounted() {
    this.renderChart();
  },
  beforeUnmount() {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
  },
  methods: {
    renderChart() {
      const canvas = this.$refs.canvas;
      if (!canvas) return;

      this.chartInstance = new Chart(canvas, {
        type: 'line',
        plugins: [playheadPlugin],
        data: {
          labels: this.labels,
          datasets: [{
            label: this.title + ' (°)',
            data: this.dataPoints,
            borderColor: '#4BC0C0',
            backgroundColor: 'rgba(75,192,192,0.08)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
            fill: true,
            spanGaps: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          animation: false,
          onClick: (event, _elements, chart) => {
            const xScale = chart.scales.x;
            if (!xScale) return;
            const sampledIdx = Math.round(xScale.getValueForPixel(event.x));
            if (sampledIdx == null || sampledIdx < 0) return;
            const originalIdx = sampledIdx * this.step;
            this.$emit('seek', originalIdx);
          },
          plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: {
              ticks: { maxTicksLimit: 8, font: { size: 10 } },
              grid: { color: 'rgba(0,0,0,0.05)' }
            },
            y: {
              title: { display: true, text: 'Grados (°)', font: { size: 10 } },
              ticks: { font: { size: 10 } },
              grid: { color: 'rgba(0,0,0,0.05)' }
            }
          }
        }
      });
      this.chartInstance._playheadIndex = Math.floor(this.currentFrameIndex / this.step);
    }
  }
}
</script>

<style scoped>
.chart-wrapper {
  background: #f8f9fa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px 14px;
  cursor: crosshair;
}
.chart-header {
  font-size: 0.8em;
  font-weight: 700;
  color: #4BC0C0;
  margin-bottom: 4px;
}
</style>
