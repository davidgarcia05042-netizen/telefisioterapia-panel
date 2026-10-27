<template>
  <div class="therapies">
    <BackLink :to="{ name: 'my-patients' }" label="Volver a Mis pacientes" />
    <h2 class="light-font dark-text">
      Paciente <span class="light-italic-font">{{ loading ? 'Cargando...' : patient_name }}</span>
    </h2>
    
    <h3 class="regular-font dark-text">Terapeuta:</h3>
    <p class="light-font dark-text">{{ loading ? 'Cargando...' : therapist_name }}</p>
    <h3 class="regular-font dark-text">Rutinas</h3>
    <div>
      <Table
        :columns="[
          { query: 'id', verbose: 'ID', hidden: true },
          { query: 'routine.name', verbose: 'Rutina' },
          { query: 'start_time', verbose: 'Fecha de inicio', format: 'datetime' },
          { query: 'status_verbose', verbose: 'Estado', format: 'status' },
        ]"
        :actions="['detail']"
        :api_endpoint="`/scheduled_training?patient_id=${$route.params.patient_id}`"
        :empty_on_404="true"
        sorting_column="id"
        @detail="goToDetail"
      />
    </div>
  </div>
</template>

<script>
import toast, { NOT_FOUND } from '@/lib/toast';
import Http from '@/lib/http';
import '@/styles/views/view_routine.scss';
import Table from '@/components/table';
import BackLink from '@/components/BackLink.vue';

export default {
  name: 'ViewPatient',
  components: {
    Table, BackLink
  },
  async beforeMount() {
    await this.getPatient();
  },
  methods: {
    async getPatient() {
      const http = new Http();
      const response = await http.authGet(
        `/therapist_patient?patient_id=${this.$route.params.patient_id}`
      );
      this.loading = false;
      if (response.status === 200 && response.data) {
        this.patient = response.data;
        // El terapeuta (o el paciente) puede venir nulo si se borró (SET_NULL).
        this.patient_name = this.fullName(this.patient.patient);
        this.therapist_name = this.fullName(this.patient.therapist);
      } else {
        toast.error(NOT_FOUND);
      }
    },
    fullName(person) {
      const user = person && person.user;
      if (!user) return '—';
      return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || '—';
    },
    goToDetail(routine_id) {
      this.$router.push({
        name: 'view_patient_routine',
        params: {
          patient_id: this.$route.params.patient_id,
          scheduled_training_id: routine_id
        }
      });
    }
  },
  data() {
    return {
      patient: {},
      // G8: hasta que responde el backend se ve "Cargando...", no un nombre vacío.
      loading: true,
      patient_name: '',
      therapist_name: '',
      difficulties: []
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
</style>