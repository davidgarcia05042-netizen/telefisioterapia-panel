import { Chart } from 'chart.js';

/**
 * ExerciseChartService
 * Responsabilidad única: construir, actualizar y destruir las instancias
 * de Chart.js para el análisis de movimiento del ejercicio.
 */
export default class ExerciseChartService {

  constructor() {
    /** @type {Object.<string, Chart>} */
    this._instances = {};
  }

  // ─── Helpers privados ──────────────────────────────────────────────────────

  _buildDatasets(point, historyArr, chartType) {
    if (chartType === 'posicion') {
      const xs = [], ys = [], zs = [];
      for (const frame of historyArr) {
        const coords = frame.points[point.id];
        if (coords) {
          xs.push(coords[0]); ys.push(coords[1]); zs.push(coords[2]);
        } else {
          xs.push(null); ys.push(null); zs.push(null);
        }
      }
      return {
        datasets: [
          { label: 'Eje X (Ancho)', data: xs, borderColor: '#FF6384', borderWidth: 2, pointRadius: 0, tension: 0.1 },
          { label: 'Eje Y (Alto)',  data: ys, borderColor: '#36A2EB', borderWidth: 2, pointRadius: 0, tension: 0.1 },
          { label: 'Eje Z (Prof)', data: zs, borderColor: '#4BC0C0', borderWidth: 2, pointRadius: 0, tension: 0.1 },
        ],
        yAxisTitle: 'Coordenada Normalizada',
      };
    }

    // chartType === 'angulo'
    const angles = historyArr.map(frame =>
      frame.angles && frame.angles[point.codename] !== undefined
        ? frame.angles[point.codename]
        : null
    );
    return {
      datasets: [
        { label: 'Ángulo (Grados)', data: angles, borderColor: '#9966FF', borderWidth: 2, pointRadius: 0, tension: 0.1 },
      ],
      yAxisTitle: 'Grados (°)',
    };
  }

  _computeStats(datasets) {
    const stats = [];
    for (const ds of datasets) {
      const valid = ds.data.filter(v => v !== null && !isNaN(v));
      if (valid.length > 0) {
        const min = Math.min(...valid);
        const max = Math.max(...valid);
        const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
        stats.push({
          label: ds.label.split('(')[0].trim(),
          min: min.toFixed(2),
          max: max.toFixed(2),
          avg: avg.toFixed(2),
          color: ds.borderColor,
        });
      }
    }
    return stats;
  }

  // ─── API pública ───────────────────────────────────────────────────────────

  /**
   * Crea o recrea todas las gráficas para los puntos rastreados.
   * @param {Array}  trackedPoints
   * @param {Array}  historyArr
   * @param {string} chartType  'posicion' | 'angulo'
   * @returns {Object.<string, Array>} chartStats por codename
   */
  buildCharts(trackedPoints, historyArr, chartType) {
    const times = historyArr.map(f => f.t);
    const statsMap = {};

    for (const point of trackedPoints) {
      const canvas = document.getElementById('chart-' + point.codename);
      if (!canvas) continue;

      this._instances[point.codename]?.destroy();

      const { datasets, yAxisTitle } = this._buildDatasets(point, historyArr, chartType);
      statsMap[point.codename] = this._computeStats(datasets);

      this._instances[point.codename] = new Chart(canvas, {
        type: 'line',
        data: { labels: times, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'top' } },
          scales: {
            x: { title: { display: true, text: 'Tiempo (segundos)' } },
            y: { title: { display: true, text: yAxisTitle } },
          },
        },
      });
    }

    return statsMap;
  }

  /**
   * Actualiza los datos de las gráficas existentes sin recrearlas.
   * @param {Array}  trackedPoints
   * @param {Array}  historyArr
   * @param {string} chartType
   * @returns {Object.<string, Array>} chartStats actualizado
   */
  refreshCharts(trackedPoints, historyArr, chartType) {
    const times = historyArr.map(f => f.t);
    const statsMap = {};

    for (const point of trackedPoints) {
      const chart = this._instances[point.codename];
      if (!chart) continue;

      chart.data.labels = times;

      const { datasets } = this._buildDatasets(point, historyArr, chartType);
      chart.data.datasets.forEach((ds, i) => {
        if (datasets[i]) ds.data = datasets[i].data;
      });

      statsMap[point.codename] = this._computeStats(chart.data.datasets);
      chart.update('none'); // Sin animación para máximo rendimiento
    }

    return statsMap;
  }

  destroyAll() {
    for (const chart of Object.values(this._instances)) {
      chart.destroy();
    }
    this._instances = {};
  }
}
