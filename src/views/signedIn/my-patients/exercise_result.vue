<template>
  <div class="therapies" v-if="result">
    <BackLink
      :to="{ name: 'view_patient_routine', params: { patient_id: $route.params.patient_id, scheduled_training_id: $route.params.scheduled_training_id } }"
      label="Volver a la rutina del paciente"
    />
    <h2 class="light-font dark-text">
      Ejercicio <span class="light-italic-font">{{ exercise_name }}</span>
    </h2>
    <div class="video-container">
      <div class="video-wrapper">
        <h3 class="regular-font dark-text">Estado del video:</h3>
        <p><span :class="['status-badge', statusClass(result.status)]">{{ result.status }}</span></p>
        <!-- Procesamiento en el servicio: el panel consulta el estado hasta que termine. -->
        <ServiceProcessingStatus :status="result.status" :jointErrors="joint_errors" :partial="hasMeasuredJoint" />
        <h3 class="regular-font dark-text">Video subido:</h3>
        <!-- URL pública de Supabase Storage, guardada tal cual por el backend -->
        <video :src="result.video" controls></video>
        <hr>
        <p v-if="hasDifficulty === false" class="light-font dark-text no-difficulty">
          Este ejercicio no tiene dificultad asignada en esta rutina: se muestra lo medido por el
          servicio, sin rango esperado.
        </p>
        <div class="patients-table data-table">
          <span class="regular-font data-table__head">Punto</span>
          <span class="regular-font data-table__head">Ángulo mínimo esperado</span>
          <span class="regular-font data-table__head">Ángulo mínimo</span>
          <span class="regular-font data-table__head">Ángulo máximo esperado</span>
          <span class="regular-font data-table__head data-table__head--last">Ángulo máximo</span>
          <template v-for="point in result_tracked_points" :key="point.id">
            <span class="light-font">{{point.point_tracked_name}}</span>
            <span class="light-font">{{ formatAngle(point.expected_min_angle) }}</span>
            <span class="light-font">{{ formatAngle(point.min_angle) }}</span>
            <span class="light-font">{{ formatAngle(point.expected_max_angle) }}</span>
            <span class="light-font">{{ formatAngle(point.max_angle) }}</span>
          </template>
        </div>

        <!-- Movimiento del paciente medido por el servicio (docs/DECISIONES_TECNICAS.md, V3) -->
        <template v-if="movement">
          <hr>
          <h3 class="regular-font dark-text">Movimiento del paciente</h3>
          <p class="source-badge">{{ SERVICE_SOURCE_LABEL }} · {{ angleModeLabel('2d') }}</p>
          <div v-for="(point, index) in movement_points" :key="index" class="movement-chart">
            <h4 class="regular-font dark-text">{{ point.name }}</h4>
            <p v-if="point.percent_in_range !== null" class="light-font dark-text">
              Tiempo dentro del rango esperado ({{ point.expected_min }}° – {{ point.expected_max }}°):
              <strong>{{ point.percent_in_range }}%</strong>
            </p>
            <!-- Mínimo y máximo medidos frente a las metas (misma regla que la app, rangeGoal.js). -->
            <div v-if="point.goal.status === 'reached' || point.goal.status === 'not_reached'"
                 :class="['range-goal', point.goal.status === 'reached' ? 'reached' : 'not-reached']">
              <p class="regular-font">
                {{ point.goal.status === 'reached' ? REACHED_LABEL : NOT_REACHED_LABEL }}
                <span class="light-font range-goal-note">
                  (mínimo {{ formatDegrees(point.min_angle) }}, máximo {{ formatDegrees(point.max_angle) }};
                  tolerancia de {{ RANGE_TOLERANCE_DEGREES }}°)
                </span>
              </p>
              <p v-for="gap in point.goal.gaps" :key="gap" class="light-font range-goal-gap">{{ gap }}</p>
            </div>
            <p v-else-if="point.expected_min === null && hasDifficulty" class="light-font dark-text">
              Sin rango esperado en la dificultad asignada para esta articulación.
            </p>
            <div class="chart-box"><canvas :id="'result-chart-' + index"></canvas></div>
          </div>
        </template>
        <!-- Exportaciones: solo con el movimiento del servicio. -->
        <template v-if="result.video">
          <hr v-if="!movement">
          <p v-if="!movement" class="light-font dark-text">{{ noMovementText }}</p>
          <div class="export-row">
            <button class="btn btn-dark" @click="exportMovementJSON" :disabled="!movement" :title="movement ? '' : noMovementText">
              Descargar JSON de movimiento
            </button>
            <button class="btn btn-dark" @click="exportRawCSV" :disabled="!movement" :title="movement ? '' : noMovementText">
              Exportar CSV crudo (33 puntos)
            </button>
          </div>
        </template>
      </div>
    </div>
    <div class="actions-container">
      <div class="actions-wrapper">
        <div class="form-group">
          <label for="description" class="light-font dark-text"
            >Concepto</label
          >
          <textarea
            name="description"
            id="description"
            class="light-font"
            cols="30"
            rows="10"
            placeholder="Dale un análisis al ejercicio que acabas de ver"
            v-model="concept"
          ></textarea>

          <!-- P7 (docs/DECISIONES_TECNICAS.md): antes ocupaba todo el ancho, más grande que cualquier otra acción. -->
          <div class="form-actions">
            <button class="btn btn-success btn-lg" @click="sendConcept">
              <send aria-hidden="true" />
              <cached v-if="loading" class="rotate" />
              <span v-else>Enviar concepto</span>
            </button>
          </div>
        </div>
        
      </div>
    </div>
  </div>
</template>

<script>
import toast, { NOT_FOUND } from '@/lib/toast';
import Http from '@/lib/http';
import '@/styles/views/view_routine.scss';
import { Cached, Send } from "mdue";
import { Chart, registerables } from 'chart.js';
import ExerciseExportService from '@/services/exerciseExportService';
import {
  ERROR_STATUS, PROCESSED_STATUS, PROCESSING_STATUS, SERVICE_SOURCE_LABEL, UNAVAILABLE_LABEL, angleModeLabel,
  fetchResultMovement, framesForMode, percentInRange, pollWhileProcessing,
} from '@/services/serverMovementService';
import { NOT_REACHED_LABEL, RANGE_TOLERANCE_DEGREES, REACHED_LABEL, rangeGoal } from '@/services/rangeGoal';
import { statusClass } from '@/lib/format';
import ServiceProcessingStatus from '@/components/exercises/ServiceProcessingStatus.vue';
import BackLink from '@/components/BackLink.vue';

// Incluye Filler: el rango esperado se sombrea rellenando entre dos líneas.
Chart.register(...registerables);

// Tope de puntos por gráfica: un video de 2 min a 30 fps tiene ~3600 frames.
const MAX_CHART_POINTS = 600;

export default {
  name: 'ViewExercise',
  async beforeMount() {
    await this.getResult();
  },
  beforeUnmount() {
    this._stopPolling?.();
    this._destroyCharts();
  },
  components: {
    Send, Cached, ServiceProcessingStatus, BackLink
  },
  methods: {
    async sendConcept() {
      const http = new Http();
      const response = await http.authPost(
        `/exercise_results/${this.$route.params.result_id}/concept`,
        {
          concept: this.concept
        }
      )
      if (response.status === 201) {
        this.$router.go()
      }
    },
    async _fetchResult() {
      const http = new Http();
      const response = await http.authGet(
        `/exercise_results?exercise_result_id=${this.$route.params.result_id}`
      );
      return response.status === 200 ? response.data : null;
    },
    async getResult() {
      const result = await this._fetchResult();
      if (!result) {
        toast.error(NOT_FOUND);
        return;
      }
      this.result = result;
      this.exercise_name = this.result.exercise.name;
      if (this.result.concept) {
        this.concept = this.result.concept
      }
      await this._loadMeasurements();
      if (this.result.status === PROCESSING_STATUS) {
        // Mientras el servicio procesa, se consulta el resultado cada 5 s; al
        // terminar se cargan la tabla y el movimiento sin recargar la página.
        this._stopPolling = pollWhileProcessing(() => this._fetchResult(), async (fresh) => {
          this.result = fresh;
          await this._loadMeasurements();
        });
      }
    },
    async _loadMeasurements() {
      // Lo medido por el servicio se muestra SIEMPRE, haya o no dificultad: la
      // dificultad solo agrega el rango esperado. Cada carga es independiente,
      // así que un fallo en una no corta la otra.
      if (this.result.status === PROCESSED_STATUS || this.result.status === ERROR_STATUS) {
        await this._safely('la dificultad', () => this.getDifficulties());
      }
      this._buildTable();
      // El movimiento existe si el job terminó y midió algo: con "procesado", o
      // con error si alguna articulación sí se midió. P4: si no se midió nada
      // (o sigue procesando), no se pide: solo dejaba un 404 en la consola.
      const finished = this.result.status === PROCESSED_STATUS
        || (this.result.status === ERROR_STATUS && this.hasMeasuredJoint);
      if (finished) await this._safely('el movimiento', () => this.loadMovement());
    },
    async _safely(what, load) {
      try {
        await load();
      } catch (e) {
        console.error(`No se pudo cargar ${what}:`, e);
        toast.error(`No se pudo cargar ${what}.`);
      }
    },
    async getDifficulties() {
      this._ranges = {};
      const http = new Http();
      const response = await http.authGet(
        `/scheduled_training/diffs?scheduled_training_id=${this.$route.params.scheduled_training_id}&exercise_id=${this.result.exercise.id}`
      );
      if (response.status !== 200) {
        toast.error('No se pudo consultar la dificultad de la asignación: se muestra lo medido sin rango esperado.');
        return;
      }
      // {"difficulty": null}: la asignación no tiene dificultad para este ejercicio.
      const difficulty = response.data && response.data.difficulty;
      this.hasDifficulty = Boolean(difficulty);
      for (const range of (difficulty && difficulty.ranges) || []) {
        // Un rango sin articulación (borrada) no aplica a nada: se ignora.
        const skeletonPointId = range && range.point_tracked ? range.point_tracked.skeleton_point_id : null;
        if (skeletonPointId !== null && skeletonPointId !== undefined) {
          this._ranges[skeletonPointId] = range;
        }
      }
    },
    /** Tabla de lo medido, con el rango esperado ("—") cuando la dificultad lo tiene. */
    _buildTable() {
      const ranges = this._ranges || {};
      this.result_tracked_points = (this.result.points || [])
        .filter(point => point.point_tracked && point.point_tracked.skeleton_point)
        .map(point => {
          const range = ranges[point.point_tracked.skeleton_point_id];
          return {
            id: point.point_tracked.skeleton_point_id,
            point_tracked_name: point.point_tracked.skeleton_point.verbose,
            expected_min_angle: range ? range.min_angle : null,
            expected_max_angle: range ? range.max_angle : null,
            min_angle: point.min_angle,
            max_angle: point.max_angle,
          };
        });
    },
    async loadMovement() {
      const movement = await fetchResultMovement(this.$route.params.result_id);
      if (!movement) return;
      // 2D: es la medición clínica, y los rangos de la dificultad son 2D.
      this._frames = framesForMode(movement, '2d');
      const ranges = this._ranges || {};
      this.movement_points = (this.result.points || [])
        .filter(point => point.point_tracked && point.point_tracked.skeleton_point)
        .map(point => {
          const skeleton = point.point_tracked.skeleton_point;
          const range = ranges[point.point_tracked.skeleton_point_id];
          const expectedMin = range ? Number(range.min_angle) : null;
          const expectedMax = range ? Number(range.max_angle) : null;
          const angles = this._frames.map(frame => frame.angles[skeleton.codename]);
          return {
            name: skeleton.verbose,
            codename: skeleton.codename,
            expected_min: expectedMin,
            expected_max: expectedMax,
            percent_in_range: percentInRange(angles, expectedMin, expectedMax),
            min_angle: point.min_angle,
            max_angle: point.max_angle,
            // Con los valores crudos del rango: Number(null) sería 0°.
            goal: rangeGoal(point.min_angle, point.max_angle, range && range.min_angle, range && range.max_angle),
          };
        });
      this.movement = movement;
      this.$nextTick(() => this._buildCharts());
    },
    _buildCharts() {
      this._destroyCharts();
      const step = Math.max(1, Math.ceil(this._frames.length / MAX_CHART_POINTS));
      const sampled = this._frames.filter((_, i) => i % step === 0);
      const labels = sampled.map(frame => frame.t.toFixed(1) + 's');

      this.movement_points.forEach((point, index) => {
        const canvas = document.getElementById('result-chart-' + index);
        if (!canvas) return;
        const datasets = [];
        if (point.expected_min !== null && point.expected_max !== null) {
          const band = { borderColor: 'rgba(75, 192, 192, 0.7)', borderDash: [4, 4], borderWidth: 1, pointRadius: 0 };
          datasets.push({ ...band, label: 'Mínimo esperado', data: labels.map(() => point.expected_min), fill: false });
          // fill: '-1' rellena hasta el conjunto anterior: la franja del rango esperado.
          datasets.push({ ...band, label: 'Rango esperado', data: labels.map(() => point.expected_max),
                          backgroundColor: 'rgba(75, 192, 192, 0.18)', fill: '-1' });
        }
        datasets.push({
          label: 'Ángulo 2D (°)',
          data: sampled.map(frame => frame.angles[point.codename] ?? null),
          borderColor: '#9966FF', borderWidth: 2, pointRadius: 0, tension: 0.1, fill: false,
        });
        this._charts.push(new Chart(canvas, {
          type: 'line',
          data: { labels, datasets },
          options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { title: { display: true, text: 'Grados (°)' } }, x: { ticks: { maxTicksLimit: 12 } } },
            plugins: { legend: { position: 'bottom' } },
          },
        }));
      });
    },
    _destroyCharts() {
      (this._charts || []).forEach(chart => chart.destroy());
      this._charts = [];
    },
    exportMovementJSON() {
      ExerciseExportService.exportMovementJSON(
        { id: this.result.exercise.id, name: `${this.exercise_name}_paciente` },
        this.movement.duration, this._frames, 0
      );
    },
    exportRawCSV() {
      ExerciseExportService.exportRawCSV(this._frames, `${this.exercise_name}_paciente`, 0);
    },
    angleModeLabel,
    statusClass,
    // Grados enteros, como los compara rangeGoal.
    formatDegrees(value) {
      return value === null || value === undefined ? '—' : `${Math.round(Number(value))}°`;
    },
    // Una articulación en error no tiene mínimo ni máximo.
    formatAngle(value) {
      return value === null || value === undefined ? '—' : parseFloat(value).toFixed(2);
    },
    async getPointsTracked() {}
    // async getDifficulties() {
    //   const http = new Http();
      
    // },
  },
  computed: {
    // Alguna articulación tiene mínimo y máximo: el error no fue del video entero.
    hasMeasuredJoint() {
      return (this.result.points || []).some(point => point.max_angle !== null && point.min_angle !== null);
    },
    // P4: con error ya terminó; "Disponible al terminar..." sería falso.
    noMovementText() {
      return this.result.status === ERROR_STATUS
        ? 'Sin movimiento: el servicio no pudo medir este video.'
        : `${UNAVAILABLE_LABEL}.`;
    },
    // Motivo por articulación que guarda el backend (sin vecinos, video
    // rechazado por el servicio, persona no detectada...).
    joint_errors() {
      return (this.result.points || [])
        .filter(point => point.error)
        .map(point => ({
          id: point.point_tracked ? point.point_tracked.skeleton_point_id : point.error,
          name: point.point_tracked && point.point_tracked.skeleton_point
            ? point.point_tracked.skeleton_point.verbose
            : 'Articulación',
          error: point.error,
        }));
    },
  },
  data() {
    return {
      result: {},
      exercise_name: '',
      result_tracked_points: [],
      loading: false,
      concept: '',
      movement: null,
      movement_points: [],
      // null: sin consultar (o falló la consulta); false: la asignación no tiene dificultad.
      hasDifficulty: null,
      SERVICE_SOURCE_LABEL,
      UNAVAILABLE_LABEL,
      REACHED_LABEL,
      NOT_REACHED_LABEL,
      RANGE_TOLERANCE_DEGREES,
    };
  },
};
</script>

<style lang="scss" scoped>
.video-container {
  width: 100%;
  display: flex;
  justify-content: center;
}
.video-wrapper {
  width: 90%;
  border: 1px solid #2f2f2f;
  border-radius: 10px;
  padding: 20px;
  align-self: center;
  display:flex;
  flex-direction: column;
  h3 {
    margin-top: 0;
  }
  video {
    height: 40vh;
    justify-self: center;
  }
}
.actions-container {
  width: 100%;
  display: flex;
  justify-content: center;
}
.actions-wrapper {
  width: 90%;
  padding: 20px;
  display: flex;
  justify-content: space-evenly;
  button {
    padding: 10px
  }
}

.action-icon {
  font-size: 2em;
}
.patients-table {
	grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
}
.form-group > .btn {
  height: 2em;
}
.no-difficulty {
  padding: 6px 12px;
  border-radius: 6px;
  background: #fff7e6;
  border: 1px solid #f0b54c;
}
.source-badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.9em;
  background: #e6f6f6;
  border: 1px solid #4BC0C0;
  color: #1f5f5f;
}
.movement-chart {
  margin-bottom: 24px;
  h4 { margin: 8px 0 4px; }
}
.range-goal {
  margin: 4px 0 8px;
  padding: 6px 12px;
  border-radius: 6px;
  p { margin: 2px 0; }
  &.reached { background: #e8f5e9; border: 1px solid #66bb6a; color: #1b5e20; }
  &.not-reached { background: #fff7e6; border: 1px solid #f0b54c; color: #7a4a00; }
}
.range-goal-note { font-size: 0.9em; }
.range-goal-gap { font-size: 0.95em; }
.chart-box {
  position: relative;
  height: 260px;
}
.export-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  button { padding: 8px 16px; }
  button:disabled { opacity: 0.45; cursor: not-allowed; }
}
</style>