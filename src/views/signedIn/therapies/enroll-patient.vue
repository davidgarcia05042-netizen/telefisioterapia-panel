<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">
        Inscribir paciente en
        <span class="light-italic-font">{{ therapy.name }}</span>
      </h2>
    </div>
    <div class="form-wrapper">
      <div class="form-container">
        <h3 class="light-font dark-text">Añadir paciente a esta terapia</h3>
        <label for="patient" class="light-font dark-text">Paciente</label>
        <select
          name="patient"
          id="patient"
          class="light-font"
          v-model="selected_patient"
        >
          <option
            v-for="patient in patients"
            :value="patient.id"
            :key="patient.id"
          >
            {{ patient.user.first_name + " " + patient.user.last_name }}
          </option>
        </select>
        <label for="therapist" class="light-font dark-text">Terapeuta</label>
        <select
          name="therapist"
          id="therapist"
          class="light-font"
          v-model="selected_therapist"
        >
          <option
            v-for="therapist in therapists"
            :value="therapist.id"
            :key="therapist.id"
          >
            {{ therapist.user.first_name + " " + therapist.user.last_name }}
          </option>
        </select>
        <hr>
        <!-- Fase V: "Cancelar" vuelve sin guardar. -->
        <div class="form-actions">
          <router-link :to="{ name: 'view_therapy', params: { therapy_id: $route.params.therapy_id } }" class="btn btn-cancel">Cancelar</router-link>
          <button class="btn btn-success btn-lg" @click="enrollPatient">
            <plus />
            <cached v-if="loading" class="rotate" />
            <span v-else>Agregar paciente</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import toast, { NOT_FOUND } from '@/lib/toast';
import { Plus, Cached } from "mdue";
import Http from "@/lib/http";
import "@/styles/views/edit_therapy.scss";
import { backendErrorMessage } from "@/lib/storageService";
export default {
  name: 'EnrollPatient',
  components: {
    Plus,
    Cached,
  },
  async beforeMount() {
    await this.getTherapy();
    await this.getPatients();
    await this.getTherapists();
  },
  methods: {
    async getTherapy() {
      const http = new Http();
      const response = await http.authGet(
        `/therapies/${this.$route.params.therapy_id}`
      );
      if (response.status !== 404) {
        this.therapy = response.data;
      } else {
        toast.error(NOT_FOUND);
      }
    },
    async getPatients() {
      const http = new Http();
      const response = await http.authGet(`/patients`);
      if (response.status !== 404) {
        this.patients = response.data;
      } else {
        toast.error(NOT_FOUND);
      }
    },
    async getTherapists() {
      const http = new Http();
      const response = await http.authGet(`/therapists`);
      if (response.status !== 404) {
        this.therapists = response.data;
      } else {
        toast.error(NOT_FOUND);
      }
    },
    async enrollPatient() {
      const http = new Http();
      const response = await http.authPost(
        `/therapies/${this.therapy.id}/enroll_patient/`,
        {
          therapy: this.therapy.id,
          therapist: this.selected_therapist,
          patient: this.selected_patient,
        }
      );
      // Igual que T2: antes navegaba sin saber si la inscripción se guardó.
      const status = response.request ? response.request.status : null;
      if (status !== 200 && status !== 201) {
        toast.error(await backendErrorMessage(response, 'No se pudo inscribir al paciente'));
        return;
      }
      toast.success('Paciente inscrito en la terapia.');
      this.$router.push({
        name: 'view_therapy',
        params: {
          therapy_id: this.therapy.id
        }
      });
    },
  },
  data() {
    return {
      therapy: {},
      name: "",
      description: "",
      is_model: false,
      loading: false,
      form_valid: true,
      name_valid: true,
      description_valid: true,
      error_msg: "",
      therapy_patients: [],
      selected_patient: "",
      patients: [],
      selected_therapist: "",
      therapists: [],
    };
  },
}
</script>

<style lang="scss">
.form-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
}
.form-container {
  width: 90%;
  border: 1px solid #2f2f2f;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  &* {
    margin-top: 10px
  }
  button {
    width: 30%;
  }
}
</style>