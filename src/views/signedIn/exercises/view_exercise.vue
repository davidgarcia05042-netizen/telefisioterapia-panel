<template>
  <div class="therapies">
    <BackLink :to="{ name: 'exercises' }" label="Volver a Ejercicios" />
    <h2 class="light-font dark-text">
      Ejercicio <span class="light-italic-font">{{ exercise.name }}</span>
    </h2>
    <h3 class="regular-font dark-text">Descripción:</h3>
    <p class="light-font dark-text">{{ exercise.description }}</p>
    <div class="video-container">
      <div class="video-wrapper">
        <h3 class="regular-font dark-text">Estado del video de ayuda:</h3>
        <p><span :class="['status-badge', statusClass(exercise.status)]">{{ exercise.status }}</span></p>

        <!-- Procesamiento en el servicio: el panel consulta el estado hasta que termine. -->
        <ServiceProcessingStatus :status="exercise.status" :jointErrors="jointErrors" />

        <template v-if="hasVideoStatus">
          <h3 class="regular-font dark-text">Video subido:</h3>

          <ExerciseVideoPlayer
            v-if="exercise.video"
            :videoSrc="exercise.video"
            :trackedPoints="tracked_points"
            v-model:angleMode="angleMode"
            :mediaPipeModel="mediaPipeModel"
            :previewEnabled="previewEnabled"
          />

          <!--
            Previsualización en el navegador: botón secundario, apagada por
            defecto. Solo dibuja el esqueleto sobre el video; no escribe nada en
            la base ni alimenta gráficas, exportaciones o el visor 3D.
          -->
          <div class="preview-row">
            <button class="btn btn-secondary preview-toggle" @click="previewEnabled = !previewEnabled">
              <Eye class="action-icon" />
              <span>{{ previewEnabled ? 'Ocultar previsualización' : PREVIEW_BUTTON_LABEL }}</span>
            </button>
          </div>
          <div v-if="previewEnabled" class="preview-box">
            <label class="light-font dark-text preview-model">
              Modelo:
              <select v-model="mediaPipeModel" class="preview-select">
                <option value="heavy">Heavy (Preciso, el mismo del servicio)</option>
                <option value="full">Full (Balanceado)</option>
                <option value="lite">Lite (Rápido)</option>
              </select>
            </label>
            <p class="light-font dark-text preview-note">
              {{ PREVIEW_LABEL }}: detección en este equipo solo para revisar el video. No se guarda
              ni reemplaza la medición del servicio.
            </p>
          </div>

          <!-- Fuente de lo que se muestra (docs/DECISIONES_TECNICAS.md, V3): el servidor manda. -->
          <p v-if="serverMovement" class="source-badge service">
            {{ SERVICE_SOURCE_LABEL }} · {{ angleModeLabel(angleMode) }}
          </p>

          <hr>
          <h4 class="regular-font dark-text">Medición del servicio (MediaPipe Heavy)</h4>
          <div class="patients-table data-table">
            <span class="regular-font data-table__head">Punto</span>
            <span class="regular-font data-table__head">Ángulo mínimo</span>
            <span class="regular-font data-table__head data-table__head--last">Ángulo máximo</span>
            <template v-for="point in tracked_points" :key="point.id">
              <span class="light-font">{{point.verbose}}</span>
              <span class="light-font">{{ formatAngle(point.min_angle) }}</span>
              <span class="light-font">{{ formatAngle(point.max_angle) }}</span>
            </template>
          </div>
          <hr>
          <!-- E5 (docs/DECISIONES_TECNICAS.md): la tabla no tenía título ni acciones; ahora se edita y se borra. -->
          <h4 class="regular-font dark-text">Dificultades</h4>
          <p v-if="difficulties.length === 0" class="light-font dark-text">
            Este ejercicio no tiene dificultades.
          </p>
          <div v-else class="diff-table data-table">
            <span class="regular-font data-table__head">Nombre</span>
            <span class="regular-font data-table__head">Punto seguido</span>
            <span class="regular-font data-table__head">Ángulo mínimo</span>
            <span class="regular-font data-table__head">Ángulo máximo</span>
            <span class="regular-font data-table__head data-table__head--last">Acciones</span>
            <template v-for="diff in difficulties" :key="diff.id">
              <template v-for="(range, index) in rowsOf(diff)" :key="index">
                <span class="light-font">{{ index === 0 ? diff.name : '' }}</span>
                <span class="light-font">{{ range ? range.point_tracked.skeleton_point.verbose : 'Sin rangos' }}</span>
                <span class="light-font">{{ range ? formatAngle(range.min_angle) : '—' }}</span>
                <span class="light-font">{{ range ? formatAngle(range.max_angle) : '—' }}</span>
                <span v-if="index === 0" class="diff-actions">
                  <button type="button" class="icon-btn" aria-label="Editar dificultad" data-tooltip="Editar"
                          @click="$router.push({ name: 'edit_difficulty', params: { exercise_id: exercise.id, difficulty_id: diff.id } })">
                    <Pencil aria-hidden="true" />
                  </button>
                  <button type="button" class="icon-btn icon-btn--danger" aria-label="Eliminar dificultad"
                          data-tooltip="Eliminar" :disabled="deletingId === diff.id" @click="deleteDifficulty(diff)">
                    <DeleteOutline aria-hidden="true" />
                  </button>
                </span>
                <span v-else></span>
              </template>
            </template>
          </div>

          <!-- E4: con movimiento del servicio, las gráficas se muestran sin pedirlas. -->
          <ExerciseCharts
            v-show="showCharts"
            :trackedPoints="tracked_points"
            :chartStats="chartStats"
            v-model:chartType="chartType"
            @refresh="generateCharts"
          />
        </template>
      </div>
    </div>
    <div class="actions-container">
      <div class="actions-wrapper">
        <button class="btn btn-dark" v-on:click="() => $router.push({name: 'edit_exercise', params: {exercise_id: exercise.id}})" >
          <VideoAccount class="action-icon" />
          <span>Asignar video al ejercicio</span>
        </button>
        <button class="btn btn-dark" v-on:click="() => $router.push({name: 'new_difficulty', params: {exercise_id: exercise.id}})" >
          <RunFast class="action-icon" />
          <span>Asignar nueva dificultad al ejercicio</span>
        </button>
        <!--
          Botón "Enviar resultados" oculto a propósito (docs/DECISIONES_TECNICAS.md, tema 5):
          los ángulos de referencia los mide el Servicio de Procesamiento con el
          mismo motor que mide al paciente. El análisis en el navegador es solo
          una herramienta visual y nunca escribe ángulos (además, video_results
          ahora exige la firma HMAC del servicio).
        -->
      </div>
    </div>
    <!-- Gráficas, exportaciones y 3D: solo con el movimiento del servicio. -->
    <p v-if="!serverMovement && hasVideoStatus" class="light-font dark-text unavailable-note">
      {{ UNAVAILABLE_LABEL }}.
      <template v-if="exercise.status === PROCESSED_STATUS">
        Este video se procesó sin guardar el movimiento (antes de la v2): vuelve a subirlo para obtenerlo.
      </template>
    </p>
    <div class="actions-container">
      <div class="actions-wrapper">
        <button class="btn btn-dark" @click="downloadMovementJSON" :disabled="!serverMovement" :title="unavailableTitle">
          <Download class="action-icon" />
          <span>Descargar JSON de Movimiento</span>
        </button>
        <button class="btn btn-dark" @click="exportToCSV" :disabled="!serverMovement" :title="unavailableTitle">
          <FileExcel class="action-icon" />
          <span>Exportar a Excel (CSV)</span>
        </button>
        <button class="btn btn-dark" @click="exportRawCSV" :disabled="!serverMovement" :title="unavailableTitle">
          <FileExcel class="action-icon" />
          <span>Exportar CSV Crudo (33 puntos)</span>
        </button>
        <button class="btn btn-primary" @click="$router.push({ path: `/exercises/${exercise.id}/3d-viewer`, query: { mode: angleMode } })" :disabled="!serverMovement" :title="unavailableTitle">
          <Cube class="action-icon" />
          <span>Ver Análisis en 3D</span>
        </button>
      </div>
    </div>
    <ConfirmDialog ref="confirm" />
  </div>
</template>

<script>
import '@/styles/views/view_routine.scss';
import toast, { LOAD_ERROR } from '@/lib/toast';
import { VideoAccount, RunFast, Download, Cube, FileExcel, Eye, Pencil, DeleteOutline } from 'mdue';
import { statusClass } from '@/lib/format';
import Http from '@/lib/http';
import { backendErrorMessage } from '@/lib/storageService';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { Chart, registerables } from 'chart.js';
import ExerciseApiService      from '@/services/exerciseApiService';
import ExerciseExportService   from '@/services/exerciseExportService';
import ExerciseChartService       from '@/services/exerciseChartService';
import {
  ERROR_STATUS, PREVIEW_LABEL, PROCESSED_STATUS, PROCESSING_STATUS, SERVICE_SOURCE_LABEL,
  UNAVAILABLE_LABEL, angleModeLabel, fetchExerciseMovement, historyFromMovement, pollWhileProcessing,
} from '@/services/serverMovementService';

import ExerciseVideoPlayer from '@/components/exercises/ExerciseVideoPlayer.vue';
import ExerciseCharts from '@/components/exercises/ExerciseCharts.vue';
import ServiceProcessingStatus from '@/components/exercises/ServiceProcessingStatus.vue';
import BackLink from '@/components/BackLink.vue';

Chart.register(...registerables);

// Las articulaciones de referencia no guardan el motivo del error (queda en el
// log del backend); se reconocen porque el servicio no les dejó mínimo ni máximo.
const REFERENCE_JOINT_ERROR = 'sin medición del servicio (el motivo queda en el registro del backend)';

export default {
  name: 'ViewExercise',
  components: {
    VideoAccount, RunFast, Download, Cube, FileExcel, Eye, Pencil, DeleteOutline, ConfirmDialog,
    ExerciseVideoPlayer, ExerciseCharts, ServiceProcessingStatus, BackLink
  },
  data() {
    return {
      exercise: {},
      tracked_points: [],
      difficulties: [],
      showCharts: false,
      chartStats: {},
      // E4: ángulos por defecto; la posición normalizada no tiene lectura clínica.
      chartType: 'angulo',
      // 2D: la medición clínica validada.
      angleMode: '2d',
      // E6: la previsualización arranca con el modelo del servicio ('lite', 'full', 'heavy').
      mediaPipeModel: 'heavy',
      previewEnabled: false,
      // Movimiento medido por el servicio (null si todavía no hay).
      serverMovement: null,
      deletingId: null,
      SERVICE_SOURCE_LABEL,
      PREVIEW_LABEL,
      PREVIEW_BUTTON_LABEL: 'Previsualizar en el navegador',
      UNAVAILABLE_LABEL,
      PROCESSED_STATUS,
    };
  },
  computed: {
    hasVideoStatus() {
      return [PROCESSING_STATUS, PROCESSED_STATUS, ERROR_STATUS].includes(this.exercise.status);
    },
    // Hay movimiento que pedir: procesado, o en error con alguna articulación
    // medida. Procesando, /movement siempre es 404.
    mayHaveMovement() {
      if (this.exercise.status === PROCESSED_STATUS) return true;
      return this.exercise.status === ERROR_STATUS
        && this.tracked_points.some(point => point.min_angle !== null && point.max_angle !== null);
    },
    jointErrors() {
      if (this.exercise.status !== ERROR_STATUS) return [];
      return this.tracked_points
        .filter(point => point.min_angle === null || point.max_angle === null)
        .map(point => ({ id: point.point_id, name: point.verbose, error: REFERENCE_JOINT_ERROR }));
    },
    unavailableTitle() {
      return this.serverMovement ? '' : UNAVAILABLE_LABEL;
    },
  },
  async beforeMount() {
    this._apiService     = new ExerciseApiService();
    this._chartService   = new ExerciseChartService();

    try {
      await this._loadExercise();
    } catch (e) {
      console.error('Error cargando ejercicio:', e);
      toast.error(LOAD_ERROR);
    }
  },
  beforeUnmount() {
    this._stopPolling?.();
    this._chartService.destroyAll();
  },
  watch: {
    angleMode(newVal) {
      // Con datos del servidor el selector elige entre `angles` (2D, medición
      // clínica) y `angles_3d` (visualización) del movimiento medido.
      if (this.serverMovement) {
        this._serverHistory = historyFromMovement(this.serverMovement, this.exercise.id, newVal);
        this.generateCharts();
      }
    },
  },
  methods: {
    async _loadExercise() {
      const response = await this._apiService.getExercise(this.$route.params.exercise_id);
      if (response.status === 404) return;
      this.exercise = response.data;
      if (this.hasVideoStatus) {
        // Independientes: un fallo en una carga (p. ej. la dificultad) no
        // impide mostrar lo medido por el servicio.
        await this._safely('las articulaciones', () => this._loadTrackedPoints());
        await this._safely('las dificultades', () => this._loadDifficulties());
        if (this.mayHaveMovement) await this._safely('el movimiento', () => this._loadServerMovement());
      }
      if (this.exercise.status === PROCESSING_STATUS) this._watchProcessing();
    },

    /**
     * Mientras el servicio procesa, consulta el ejercicio cada 5 s. Al terminar
     * actualiza estado, mínimos y máximos y carga el movimiento sin recargar.
     */
    _watchProcessing() {
      this._stopPolling?.();
      this._stopPolling = pollWhileProcessing(
        async () => {
          const response = await this._apiService.getExercise(this.exercise.id);
          return response.status === 200 ? response.data : null;
        },
        async (exercise) => {
          this.exercise = exercise;
          await this._safely('las articulaciones', () => this._loadTrackedPoints());
          if (this.mayHaveMovement) await this._safely('el movimiento', () => this._loadServerMovement());
        },
      );
    },

    async _safely(what, load) {
      try {
        await load();
      } catch (e) {
        console.error(`No se pudo cargar ${what}:`, e);
        toast.error(`No se pudo cargar ${what}.`);
      }
    },

    // Un rango cuya articulación se borró (point_tracked nulo) no aplica a nada.
    validRanges(difficulty) {
      return ((difficulty && difficulty.ranges) || []).filter(range => range && range.point_tracked && range.point_tracked.skeleton_point);
    },

    // Filas de una dificultad en la tabla: una por rango, o una vacía si no tiene.
    rowsOf(difficulty) {
      const ranges = this.validRanges(difficulty);
      return ranges.length ? ranges : [null];
    },

    // E5: solo se borra si ninguna rutina programada la usa; si no, el backend
    // responde 409 con el motivo y se muestra tal cual.
    async deleteDifficulty(difficulty) {
      const confirmed = await this.$refs.confirm.ask({
        title: '¿Eliminar esta dificultad?',
        message: `Se eliminará la dificultad «${difficulty.name}» con sus rangos. Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
      });
      if (!confirmed) return;
      this.deletingId = difficulty.id;
      const response = await new Http().authDelete(`/exercises/${this.exercise.id}/difficulties/${difficulty.id}/`);
      this.deletingId = null;
      if (response.request && response.request.status === 204) {
        toast.success('Dificultad eliminada.');
        await this._safely('las dificultades', () => this._loadDifficulties());
        return;
      }
      toast.error(await backendErrorMessage(response, 'No se pudo eliminar la dificultad'));
    },

    async _loadTrackedPoints() {
      const response = await this._apiService.getPointsTracked(this.exercise.id);
      if (response.status === 200) this.tracked_points = response.data;
    },

    async _loadDifficulties() {
      const response = await this._apiService.getDifficulties(this.exercise.id);
      if (response.status === 200) this.difficulties = response.data;
    },

    /** Movimiento medido por el servicio: la única fuente de gráficas, exportaciones y 3D. */
    async _loadServerMovement() {
      const movement = await fetchExerciseMovement(this.exercise.id);
      if (!movement) return;
      this._serverHistory = historyFromMovement(movement, this.exercise.id, this.angleMode);
      this.serverMovement = movement;
      this.generateCharts();
    },

    generateCharts() {
      if (!this._serverHistory) return;
      this.showCharts = true;
      this.$nextTick(() => {
        this.chartStats = this._chartService.buildCharts(
          this.tracked_points, this._serverHistory.getHistoryArray(), this.chartType
        );
      });
    },

    // El movimiento del servidor se exporta completo (fps 0: sin submuestreo).
    exportToCSV() {
      ExerciseExportService.exportTrackedCSV(
        this._serverHistory.getHistoryArray(), this.tracked_points, this.exercise.name, 0
      );
    },

    exportRawCSV() {
      ExerciseExportService.exportRawCSV(this._serverHistory.getHistoryArray(), this.exercise.name, 0);
    },

    downloadMovementJSON() {
      ExerciseExportService.exportMovementJSON(
        this.exercise, this.serverMovement.duration, this._serverHistory.getHistoryArray(), 0
      );
    },

    angleModeLabel,
    statusClass,

    // Sin medición del servicio (procesando o en error) no hay mínimo ni máximo.
    formatAngle(value) {
      return value === null || value === undefined ? '—' : parseFloat(value).toFixed(2);
    },
  }
};
</script>

<style lang="scss">
.video-container { width: 100%; display: flex; justify-content: center; }
.video-wrapper {
  width: 90%;
  border: 1px solid #2f2f2f;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
  video { width: 100%; justify-self: center; }
}
.patients-table, .diff-table {
  overflow-x: auto;
  display: grid;
  width: 100%;
}
// Más específico que .diff-table de view_routine.scss (cuatro columnas).
.video-wrapper .diff-table {
  grid-template-columns: 1.2fr 1.4fr 1fr 1fr 104px;
}
.diff-actions {
  gap: 4px;
}
.actions-wrapper {
  width: 90%;
  padding: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  button {
    padding: 8px 16px;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.9em;
    max-height: 40px;
    border-radius: 6px;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
  }
}
.action-icon { font-size: 1.4em; }
.source-badge {
  margin: 12px 0 4px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.9em;
  &.service { background: #e6f6f6; border: 1px solid #4BC0C0; color: #1f5f5f; }
}
.preview-row { display: flex; justify-content: flex-start; margin-top: 12px; }
.preview-toggle {
  height: auto;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  border-radius: 6px;
}
.preview-box {
  margin-top: 8px;
  padding: 10px 14px;
  border: 1px dashed #f0b54c;
  border-radius: 8px;
  background: #fff7e6;
}
.preview-model { display: flex; align-items: center; gap: 8px; }
.preview-select { padding: 4px 8px; border-radius: 4px; }
.preview-note { margin: 6px 0 0; font-size: 0.85em; }
.unavailable-note { text-align: center; margin: 0; font-size: 0.9em; }
</style>
