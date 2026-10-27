<template>
  <div class="therapies">
    <BackLink :to="{ name: 'therapies' }" label="Volver a Terapias" />
    <!-- G8 (docs/DECISIONES_TECNICAS.md): mientras carga no se muestran secciones vacías. -->
    <p v-if="loading" class="light-font dark-text detail-loading">Cargando...</p>
    <p v-else-if="loadError" class="light-font dark-text detail-loading">No se pudo cargar la terapia.</p>
    <template v-else>
      <h2 class="light-font dark-text">
        Terapia <span class="light-italic-font">{{ therapy.name }}</span>
      </h2>
      <h3 class="regular-font dark-text">Descripción:</h3>
      <p class="light-font dark-text">{{ therapy.description }}</p>

      <!-- T5: la terapia muestra sus rutinas (antes se cargaban y no se mostraban). -->
      <div class="patients-container">
        <div class="patients-wrapper">
          <h3 class="regular-font dark-text">Rutinas:</h3>
          <p v-if="routinesError" class="light-font dark-text">No se pudieron cargar las rutinas.</p>
          <p v-else-if="therapy_routines.length === 0" class="light-font dark-text">
            Esta terapia no tiene rutinas.
          </p>
          <div v-else class="detail-table detail-table--routines">
            <span class="regular-font">Rutina</span>
            <span class="regular-font">Descripción</span>
            <span class="regular-font">Ejercicios</span>
            <template v-for="routine in therapy_routines" :key="routine.id">
              <span class="light-font">
                <router-link :to="{ name: 'view_routine', params: { routine_id: routine.id } }">
                  {{ routine.name }}
                </router-link>
              </span>
              <span class="light-font">{{ routine.description || '—' }}</span>
              <span class="light-font">{{ (routine.exercises || []).length }}</span>
            </template>
          </div>
        </div>
      </div>

      <div class="patients-container">
        <div class="patients-wrapper">
          <h3 class="regular-font dark-text">Pacientes:</h3>
          <p v-if="patientsError" class="light-font dark-text">No se pudieron cargar los pacientes.</p>
          <p v-else-if="therapy_patients.length === 0" class="light-font dark-text">
            No hay pacientes inscritos en esta terapia.
          </p>
          <div v-else class="detail-table">
            <span class="regular-font">Usuario</span>
            <span class="regular-font">Nombre</span>
            <template v-for="patient in therapy_patients" :key="patient.id">
              <span class="light-font">{{ patient.patient.user.username }}</span>
              <span class="light-font">{{ fullName(patient.patient.user) }}</span>
            </template>
          </div>
        </div>
      </div>
      <div class="actions-container">
        <div class="actions-wrapper">
          <button class="btn btn-dark" v-on:click="() => $router.push({name: 'assing_routine', params: {therapy_id: therapy.id}})" >
            <CalendarAccount class="action-icon" />
            <span>Asignar rutina a paciente</span>
          </button>
          <button class="btn btn-light" v-on:click="() => $router.push({name: 'enroll_patient', params: {therapy_id: therapy.id}})" >
            <ClipboardList class="action-icon" />
            <span>Inscribir paciente</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import toast, { LOAD_ERROR, NOT_FOUND } from '@/lib/toast';
import Http from '@/lib/http';
import '@/styles/views/edit_therapy.scss';
import { CalendarAccount, ClipboardList } from "mdue";
import BackLink from '@/components/BackLink.vue';

export default {
  name: 'ViewTherapy',
  async beforeMount() {
    await this.getTherapy();
  },
  components: {
    CalendarAccount,
    ClipboardList,
    BackLink
  },
  methods: {
    async getTherapy() {
      const http = new Http();
      const response = await http.authGet(
        `/therapies/${this.$route.params.therapy_id}`
      );
      if (response.status !== 200) {
        toast.error(response.status === 404 ? NOT_FOUND : LOAD_ERROR);
        this.loadError = true;
        this.loading = false;
        return;
      }
      this.therapy = response.data;
      // Independientes: si falla una lista, la otra se muestra igual.
      await Promise.all([this.getTherapyPatients(), this.getTherapyRoutines()]);
      this.loading = false;
    },
    async getTherapyPatients() {
      const http = new Http();
      const response = await http.authGet(
        `/therapies/${this.$route.params.therapy_id}/get_patients/`
      );
      if (response.status === 200) {
        this.therapy_patients = response.data;
      } else {
        this.patientsError = true;
        toast.error(LOAD_ERROR);
      }
    },
    async getTherapyRoutines() {
      const http = new Http();
      const response = await http.authGet(
        `/therapies/${this.$route.params.therapy_id}/routines/`
      );
      if (response.status === 200) {
        this.therapy_routines = response.data;
      } else {
        this.routinesError = true;
        toast.error(LOAD_ERROR);
      }
    },
    fullName(user) {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      return name || '—';
    },
  },
  data() {
    return {
      loading: true,
      loadError: false,
      patientsError: false,
      routinesError: false,
      therapy: {},
      therapy_patients: [],
      therapy_routines: [],
    };
  },
};
</script>

<style lang="scss" scoped>
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
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  margin-bottom: 4px;
}
.detail-table--routines {
  grid-template-columns: 1fr 2fr auto;
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
