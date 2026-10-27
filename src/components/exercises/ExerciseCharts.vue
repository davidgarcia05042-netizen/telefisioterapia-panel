<template>
  <div style="width: 100%; margin-top: 30px;">
    <hr>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
      <h3 class="regular-font dark-text" style="margin: 0;">Análisis de Movimiento en el Tiempo:</h3>
      <select 
        :value="chartType" 
        @change="onChartTypeChange" 
        class="form-control" 
        style="width: 250px; font-size: 1.1em; padding: 8px;"
      >
        <option value="angulo">Ángulos vs Tiempo (Grados)</option>
        <option value="posicion">Posición vs Tiempo (X, Y, Z)</option>
      </select>
    </div>
    
    <div v-for="point in trackedPoints" :key="point.codename" style="margin-bottom: 60px; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 10px;">
        <h4 class="light-font" style="margin: 0;">{{ point.verbose }}</h4>
        <div v-if="chartStats[point.codename]" style="display: flex; gap: 10px; font-size: 0.85em; flex-wrap: wrap;">
          <div v-for="stat in chartStats[point.codename]" :key="stat.label" 
               :style="`background-color: ${stat.color}15; color: ${stat.color}; border: 1px solid ${stat.color}50; padding: 6px 14px; border-radius: 20px; font-weight: 500; font-family: 'Open Sans', sans-serif;`">
            <strong>{{ stat.label }}</strong> &bull; Mín: {{ stat.min }} &bull; Máx: {{ stat.max }} &bull; Prom: {{ stat.avg }}
          </div>
        </div>
      </div>
      <div style="height: 350px; width: 100%; margin-top: 10px;">
        <canvas :id="'chart-' + point.codename" style="width: 100%; height: 100%;"></canvas>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExerciseCharts',
  props: {
    trackedPoints: {
      type: Array,
      required: true,
      default: () => []
    },
    chartStats: {
      type: Object,
      required: true,
      default: () => ({})
    },
    chartType: {
      type: String,
      required: true,
      default: 'angulo'
    }
  },
  emits: ['update:chartType', 'refresh'],
  methods: {
    onChartTypeChange(e) {
      this.$emit('update:chartType', e.target.value);
      this.$nextTick(() => {
        this.$emit('refresh');
      });
    }
  }
}
</script>
