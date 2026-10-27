<template>
  <div class="metrics-tab">
    <div v-if="metrics" class="metrics-grid">
      <div v-for="(metric, pointName) in metrics" :key="pointName" class="metric-card-item">
        <div class="metric-title">{{ formatPointName(pointName) }}</div>
        <div class="metric-detail">Repeticiones: <strong>{{ metric.reps }}</strong></div>
        <div class="metric-detail">Rango: {{ metric.min }}° – {{ metric.max }}°</div>
        <div class="metric-detail">Amplitud: <strong>{{ metric.amplitude }}°</strong></div>
      </div>
    </div>
    <div v-else>
      <p class="empty-msg">Este archivo JSON no contiene cálculos angulares previos para procesar métricas.</p>
    </div>
  </div>
</template>

<script>
import { formatPointName } from '../utils/formatters';

export default {
  name: 'MetricsTab',
  props: {
    metrics: {
      type: Object,
      default: null
    }
  },
  methods: {
    formatPointName
  }
}
</script>

<style scoped>
.metrics-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.metric-card-item {
  background: white;
  border-left: 4px solid #4BC0C0;
  padding: 10px 14px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  flex: 1 1 200px;
  min-width: 150px;
}
.metric-title {
  font-weight: 700;
  color: #4BC0C0;
  margin-bottom: 6px;
  font-size: 0.9em;
}
.metric-detail {
  font-size: 0.85em;
  color: #555;
  margin-bottom: 2px;
}
.empty-msg {
  font-size: 0.9em;
  color: #888;
}
</style>
