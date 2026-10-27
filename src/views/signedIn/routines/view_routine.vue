<template>
  <div class="therapies">
    <BackLink :to="{ name: 'routines' }" label="Volver a Rutinas" />
    <!-- G8 (docs/DECISIONES_TECNICAS.md): mientras carga no se muestran secciones vacías. -->
    <p v-if="loading" class="light-font dark-text detail-loading">Cargando...</p>
    <p v-else-if="loadError" class="light-font dark-text detail-loading">No se pudo cargar la rutina.</p>
    <template v-else>
      <h2 class="light-font dark-text">
        Rutina <span class="light-italic-font">{{ routine.name }}</span>
      </h2>
      <p v-if="routine.therapy" class="light-font dark-text">
        Terapia:
        <router-link :to="{ name: 'view_therapy', params: { therapy_id: routine.therapy.id } }">
          {{ routine.therapy.name }}
        </router-link>
      </p>
      <h3 class="regular-font dark-text">Descripción:</h3>
      <p class="light-font dark-text">{{ routine.description }}</p>

      <!-- T5: la rutina muestra sus ejercicios (ya venían en la respuesta y no se mostraban). -->
      <div class="patients-container">
        <div class="patients-wrapper">
          <h3 class="regular-font dark-text">Ejercicios:</h3>
          <p v-if="exercises.length === 0" class="light-font dark-text">Esta rutina no tiene ejercicios.</p>
          <div v-else class="detail-table detail-table--exercises">
            <span class="regular-font">Orden</span>
            <span class="regular-font">Ejercicio</span>
            <span class="regular-font">Video de referencia</span>
            <template v-for="exercise in exercises" :key="exercise.id">
              <span class="light-font">{{ exercise.order }}</span>
              <span class="light-font">
                <router-link :to="{ name: 'view_exercise', params: { exercise_id: exercise.id } }">
                  {{ exercise.name }}
                </router-link>
              </span>
              <span class="light-font">
                <span :class="['status-badge', statusClass(exercise.status)]">{{ exercise.status || '—' }}</span>
              </span>
            </template>
          </div>
        </div>
      </div>

      <div class="patients-container">
        <div class="patients-wrapper">
          <h3 class="regular-font dark-text">Rutinas programadas:</h3>
          <p v-if="scheduledError" class="light-font dark-text">No se pudieron cargar las asignaciones.</p>
          <p v-else-if="scheduled_routines_patients.length === 0" class="light-font dark-text">
            Esta rutina no está asignada a ningún paciente.
          </p>
          <div v-else class="detail-table detail-table--scheduled">
            <span class="regular-font">Paciente</span>
            <span class="regular-font">Terapeuta</span>
            <span class="regular-font">Fecha</span>
            <template v-for="patient in scheduled_routines_patients" :key="patient.id">
              <span class="light-font">{{ fullName(patient.patient) }}</span>
              <span class="light-font">{{ fullName(patient.therapist) }}</span>
              <span class="light-font">{{ formatDateTime(patient.start_time) }}</span>
            </template>
          </div>
        </div>
      </div>
      <div v-if="routine.therapy" class="actions-container">
        <div class="actions-wrapper">
          <button class="btn btn-dark" v-on:click="() => $router.push({name: 'assing_routine', params: {therapy_id: routine.therapy.id}})" >
            <CalendarAccount class="action-icon" />
            <span>Asignar rutina a paciente</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import toast, { LOAD_ERROR, NOT_FOUND } from '@/lib/toast';
import Http from '@/lib/http';
import '@/styles/views/view_routine.scss';
import { CalendarAccount } from "mdue";
import BackLink from '@/components/BackLink.vue';
import { formatDateTime, statusClass } from '@/lib/format';

export default {
  name: 'ViewRoutine',
  async beforeMount() {
    await this.getRoutine();
  },
  components: {
    CalendarAccount, BackLink,
  },
  computed: {
    exercises() {
      return [...(this.routine.exercises || [])].sort((a, b) => a.order - b.order);
    },
  },
  methods: {
    async getRoutine() {
      const http = new Http();
      const response = await http.authGet(
        `/routines/${this.$route.params.routine_id}`
      );
      if (response.status !== 200) {
        toast.error(response.status === 404 ? NOT_FOUND : LOAD_ERROR);
        this.loadError = true;
        this.loading = false;
        return;
      }
      this.routine = response.data;
      await this.getScheduledTrainings();
      this.loading = false;
    },
    async getScheduledTrainings() {
      const http = new Http();
      const response = await http.authGet(
        `/scheduled_training?routine_id=${this.$route.params.routine_id}`
      );
      // El backend responde 404 cuando la rutina no tiene asignaciones: es una
      // lista vacía, no un error.
      if (response.status === 200) {
        this.scheduled_routines_patients = response.data;
      } else if (response.status !== 404) {
        this.scheduledError = true;
        toast.error(LOAD_ERROR);
      }
    },
    // Paciente o terapeuta ({user}) por su nombre; el usuario si no tiene nombre.
    fullName(person) {
      const user = person && person.user;
      if (!user) return '—';
      return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || '—';
    },
    // G11: formato único de fechas (lib/format.js).
    formatDateTime,
    statusClass,
  },
  data() {
    return {
      loading: true,
      loadError: false,
      scheduledError: false,
      routine: {},
      scheduled_routines_patients: [],
    };
  },
};
</script>

<style lang="scss">
.detail-loading {
  margin-top: 20px;
}
.patients-container {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
.patients-wrapper {
  width: 90%;
  border: 1px solid #2f2f2f;
  border-radius: 10px;
  padding: 20px;
  align-self: center;
  h3 {
    margin-top: 0;
  }
}
.detail-table {
  display: grid;
  gap: 6px 12px;
  align-items: center;
}
.detail-table--exercises {
  grid-template-columns: auto 2fr 1fr;
}
.detail-table--scheduled {
  grid-template-columns: 1fr 1fr 1fr;
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
</style>
