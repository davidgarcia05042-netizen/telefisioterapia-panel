<template>
  <div class="therapies">
    <BackLink :to="{ name: 'view_patient', params: { patient_id: $route.params.patient_id } }" label="Volver al paciente" />
    <h2 class="light-font dark-text">
      Rutina <span class="light-italic-font">{{ routine_name }}</span><br>
      Paciente <span class="light-italic-font">{{ patient_name }}</span>
    </h2>

    <h3 class="regular-font dark-text">Estado:</h3>
    <!-- P3: el estado se deriva de los resultados, no solo del campo del backend. -->
    <p class="light-font dark-text">
      <span :class="['status-badge', routineStatus.badge]">{{ routineStatus.label }}</span>
      <span v-if="routineStatus.detail" class="routine-status-detail">{{ routineStatus.detail }}</span>
    </p>

    <!--
      Subir video del paciente (docs/DECISIONES_TECNICAS.md, fase 6): el flujo del
      paciente nunca estuvo cerrado (la app móvil no avisaba al backend). Desde
      aquí el terapeuta sube el video y el backend lo manda al Servicio de
      Procesamiento.
    -->
    <div class="patient-upload" v-if="routine_exercises.length">
      <h3 class="regular-font dark-text">Subir video del paciente:</h3>
      <p class="light-font dark-text upload-note">
        Solo videos de prueba, sin datos de pacientes reales (mp4, mov, webm, mkv o avi; máximo 50 MB).
      </p>
      <div class="upload-row" v-for="exercise in routine_exercises" :key="exercise.id">
        <span class="regular-font dark-text">{{ exercise.name }}</span>
        <input
          type="file"
          accept="video/*"
          :disabled="isUploading(exercise.id)"
          @change="(event) => uploadPatientVideo(exercise, event)"
        />
        <span class="light-font dark-text">{{ uploadMessage(exercise.id) }}</span>
        <div v-if="isUploading(exercise.id)" class="upload-progress-container">
          <div class="upload-progress-bar" :style="{ width: uploadProgress(exercise.id) + '%' }"></div>
        </div>
      </div>
    </div>

    <div v-if="training && training.id">
      <p class="bold-font dark-text">Comienzo: <span class="light-italic-font">{{ formatDateTime(training.start_time) }}</span></p>
      <p class="bold-font dark-text">Final: <span class="light-italic-font">{{ formatDateTime(training.end_time, 'Sin terminar') }}</span></p>
      <h3 class="regular-font dark-text">Resultado de los ejercicios:</h3>
      <!-- P2: se actualiza sola mientras algún video se procesa (antes: botón manual). -->
      <p v-if="hasProcessing" class="light-font dark-text auto-refresh-note" role="status">
        Hay videos en procesamiento: la lista se actualiza sola cada 5 segundos.
      </p>
      <Table
        ref="results"
        :key="results_table_key"
        :columns="[
          { query: 'id', verbose: 'ID', hidden: true },
          { query: 'exercise.name', verbose: 'Ejercicio' },
          { query: 'start_time', verbose: 'Subido', format: 'datetime' },
          { query: 'status', verbose: 'Estado', format: 'status' },
        ]"
        :actions="['detail']"
        :api_endpoint="`/exercise_results?training_id=${training.id}`"
        sorting_column="id"
        @detail="goToDetail"
        @loaded="onResultsLoaded"
      />
    </div>
  </div>
</template>

<script>
import toast, { NOT_FOUND } from '@/lib/toast';
import Http from '@/lib/http';
import StorageService, { backendErrorMessage } from '@/lib/storageService';
import '@/styles/views/view_routine.scss';
import Table from '@/components/table';
import BackLink from '@/components/BackLink.vue';
import { formatDateTime } from '@/lib/format';
import { ERROR_STATUS, PROCESSED_STATUS, PROCESSING_STATUS, STATUS_POLL_MS } from '@/services/serverMovementService';

const FINISHED = '3'; // ScheduledTraining.FINISHED en el backend
/**
 * @param
 * patient_id
 * scheduled_training_id
 */
export default {
  name: 'ViewPatient',
  components: {
    Table, BackLink
  },
  beforeUnmount() {
    clearTimeout(this._refreshTimer);
  },
  computed: {
    hasProcessing() {
      return this.results.some(result => result.status === PROCESSING_STATUS);
    },
    /**
     * P3: "Iniciado" aunque ya hubiera resultados no decía nada. Se toma el
     * último resultado de cada ejercicio de la rutina.
     */
    routineStatus() {
      if (this.scheduled_training_status === FINISHED) {
        return { label: 'Finalizada', badge: 'status-badge--ok', detail: '' };
      }
      const latest = new Map();
      for (const result of this.results) {
        const exerciseId = result.exercise && result.exercise.id;
        if (exerciseId && (!latest.has(exerciseId) || result.id > latest.get(exerciseId).id)) {
          latest.set(exerciseId, result);
        }
      }
      if (latest.size === 0) {
        return { label: this.scheduled_training_status_verbose || 'Sin iniciar', badge: 'status-badge--neutral', detail: '' };
      }
      const statuses = [...latest.values()].map(result => result.status);
      const count = (status) => statuses.filter(value => value === status).length;
      const total = this.routine_exercises.length || latest.size;
      const parts = [`${latest.size} de ${total} ejercicios con video`];
      if (count(PROCESSED_STATUS)) parts.push(`${count(PROCESSED_STATUS)} procesados`);
      if (count(PROCESSING_STATUS)) parts.push(`${count(PROCESSING_STATUS)} en procesamiento`);
      if (count(ERROR_STATUS)) parts.push(`${count(ERROR_STATUS)} con error`);
      const done = latest.size >= total && count(PROCESSED_STATUS) === latest.size;
      return {
        label: done ? 'Ejercicios completos' : 'En curso',
        badge: done ? 'status-badge--ok' : (count(ERROR_STATUS) ? 'status-badge--error' : 'status-badge--progress'),
        detail: parts.join(' · '),
      };
    },
  },
  async beforeMount() {
    this.patient_id = this.$route.params.patient_id;
    this.scheduled_training_id = this.$route.params.scheduled_training_id;
    await this.getPatient();
    await this.getScheduledTraining();
  },
  methods: {
    async getPatient() {
      const http = new Http();
      const responsePatient = await http.authGet(
        `/therapist_patient?patient_id=${this.$route.params.patient_id}`
      );
      if (responsePatient.status !== 404) {
        this.patient = responsePatient.data;
        this.patient_name = `${this.patient.patient.user.first_name} ${this.patient.patient.user.last_name}`;
      } else {
        toast.error(NOT_FOUND);
      }
    },
    async getScheduledTraining() {
      const http = new Http();
      const responseScheduledTraining = await http.authGet(
        `/scheduled_training?scheduled_training_id=${this.$route.params.scheduled_training_id}`
      );
      if (responseScheduledTraining.status !== 404) {
        this.scheduled_training = responseScheduledTraining.data;
        this.routine_name = this.scheduled_training.routine.name;
        this.routine_exercises = this.scheduled_training.routine.exercises || [];
        this.scheduled_training_status_verbose = this.scheduled_training.status_verbose;
        this.scheduled_training_status = this.scheduled_training.status;
        // Antes solo se mostraba al finalizar ('3'). Ahora el terapeuta crea
        // la sesión al subir un video, así que se busca siempre: si no existe,
        // el backend devuelve una sesión vacía y la tabla no se muestra.
        await this.getTraining();
      } else {
        toast.error(NOT_FOUND);
      }
    },
    async getTraining() {
      const http = new Http();
      const responseTraining = await http.authGet(
        `/training?scheduled_training_id=${this.$route.params.scheduled_training_id}`
      );
      if (responseTraining.status !== 404) {
        this.training = responseTraining.data;
      } else {
        toast.error(NOT_FOUND);
      }
    },
    // P2: mientras haya resultados procesándose, se recarga la tabla cada 5 s
    // (sin "Cargando...", para que no parpadee).
    onResultsLoaded(rows) {
      this.results = rows;
      clearTimeout(this._refreshTimer);
      if (this.hasProcessing) {
        this._refreshTimer = setTimeout(() => this.$refs.results && this.$refs.results.refresh(), STATUS_POLL_MS);
      }
    },
    formatDateTime,
    goToDetail(result_id) {
      this.$router.push({ name: 'view_exercise_result', params: {
        patient_id: this.$route.params.patient_id,
        scheduled_training_id: this.$route.params.scheduled_training_id,
        result_id
      } });
    },

    setUpload(exerciseId, state) {
      // Reemplazar el objeto completo mantiene la reactividad por ejercicio.
      this.uploads = { ...this.uploads, [exerciseId]: state };
    },
    isUploading(exerciseId) {
      return Boolean(this.uploads[exerciseId] && this.uploads[exerciseId].busy);
    },
    uploadMessage(exerciseId) {
      return this.uploads[exerciseId] ? this.uploads[exerciseId].message : '';
    },
    uploadProgress(exerciseId) {
      return this.uploads[exerciseId] ? this.uploads[exerciseId].progress || 0 : 0;
    },
    /**
     * Sesión → subida a Supabase → resultado. El backend crea el resultado en
     * "procesando" y lo manda al servicio; el estado final llega por callback.
     */
    async uploadPatientVideo(exercise, event) {
      const file = event.target.files[0];
      if (!file) return;
      this.setUpload(exercise.id, { busy: true, progress: 0, message: 'Preparando la sesión...' });
      try {
        const http = new Http();

        // 1) Sesión de entrenamiento (si ya existe, el backend devuelve la misma).
        const trainingResp = await http.authPost('/training', {
          schedule_training_id: Number(this.scheduled_training_id),
        });
        if (!trainingResp.request || trainingResp.request.status !== 201) {
          throw new Error(await backendErrorMessage(trainingResp, 'No se pudo crear la sesión'));
        }
        const { id: trainingId } = await trainingResp.request.json();

        // 2) Video directo a Supabase con la URL firmada.
        const videoUrl = await StorageService.uploadVideo(file, 'result', (percent) =>
          this.setUpload(exercise.id, { busy: true, progress: percent, message: `Subiendo video... ${percent}%` })
        );

        // 3) Resultado: el backend lo deja en "procesando" y lo envía al servicio.
        const resultResp = await http.authPost('/exercise_results', {
          video: videoUrl,
          training_id: trainingId,
          exercise_id: exercise.id,
        });
        if (!resultResp.request || resultResp.request.status !== 201) {
          throw new Error(await backendErrorMessage(resultResp, 'El servidor rechazó el video'));
        }

        this.setUpload(exercise.id, {
          busy: false,
          message: 'Video enviado. El análisis tarda alrededor de un minuto; la lista se actualiza sola.',
        });
        await this.getScheduledTraining();
        this.results_table_key += 1;
      } catch (error) {
        this.setUpload(exercise.id, { busy: false, message: `Error: ${error.message}` });
      } finally {
        // Permite volver a elegir el mismo archivo tras un error.
        event.target.value = '';
      }
    },
  },
  data() {
    return {
      patient_id: null,
      scheduled_training_id: null,
      patient: {},
      patient_name: '',
      scheduled_training: {},
      routine_name: '',
      routine_exercises: [],
      scheduled_training_status_verbose: '',
      scheduled_training_status: '',
      training: {},
      results_table_key: 0,
      results: [],
      uploads: {},
    };
  },
};
</script>

<style lang="scss">
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
    width: auto;
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

.patient-upload {
  margin-bottom: 20px;
  .upload-note {
    font-size: 0.9em;
  }
  .upload-row {
    display: grid;
    grid-template-columns: 1fr 1fr 2fr;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid #ddd;
  }
  .upload-progress-container {
    grid-column: 1 / -1;
    height: 6px;
    background: #eee;
    border-radius: 3px;
    overflow: hidden;
  }
  .upload-progress-bar {
    height: 100%;
    background: #2f2f2f;
    transition: width 0.2s;
  }
}
.auto-refresh-note {
  margin: 0 0 8px;
  font-size: 0.9em;
}
.routine-status-detail {
  margin-left: 10px;
  font-size: 0.9em;
}
</style>
