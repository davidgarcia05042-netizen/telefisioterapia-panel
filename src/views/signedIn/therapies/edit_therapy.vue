<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">
        Editando la terapia
        <span class="light-italic-font">{{ therapy.name }}</span>
      </h2>
    </div>
    <div class="form-wrapper">
      <form class="create-therapy" @submit.prevent="saveTherapy">
        <div class="danger-bg form-error" v-show="!form_valid">
          <span class="white-text light-font">{{ error_msg }}</span>
        </div>
        <div class="form-group">
          <label for="name" class="light-font dark-text"
            >Nombre de la terapia</label
          >
          <input
            type="text"
            name="name"
            id="name"
            :class="{ 'light-font': true, 'has-error': !name_valid }"
            placeholder="Dale un nombre a la nueva terapia"
            v-model="name"
          />
        </div>
        <div class="form-group">
          <label for="description" class="light-font dark-text"
            >Descripción</label
          >
          <textarea
            name="description"
            id="description"
            :class="{ 'light-font': true, 'has-error': !description_valid }"
            cols="30"
            rows="10"
            placeholder="La terapia debe tener una descripción"
            v-model="description"
          ></textarea>
        </div>
        <div class="form-group form-checkbox">
          <label for="is_model" class="light-font dark-text"
            >¿Es un modelo?</label
          >
          <input
            type="checkbox"
            name="is_model"
            id="is_model"
            v-model="is_model"
          />
        </div>
        <p class="form-help light-font">Marca el registro como plantilla para reutilizar. Por ahora es solo una etiqueta: no cambia cómo funciona.</p>
        <!-- Fase V: "Cancelar" vuelve sin guardar. -->
        <div class="form-actions">
          <router-link :to="{ name: 'view_therapy', params: { therapy_id: $route.params.therapy_id } }" class="btn btn-cancel">Cancelar</router-link>
          <button type="submit" class="btn btn-success btn-lg">
            <content-save />
            <cached v-if="loading" class="rotate" />
            <span v-else>Guardar cambios</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import toast, { NOT_FOUND } from '@/lib/toast';
import { Cached, ContentSave } from "mdue";
import Http from "@/lib/http";
import "@/styles/views/edit_therapy.scss";
export default {
  name: "EditTherapy",

  components: {
    ContentSave,
    Cached,
  },

  async beforeMount() {
    await this.getTherapy();
    await this.getPatients();
    await this.getTherapists();
  },

  methods: {
    async saveTherapy() {
      this.loading = true;
      this.name_valid = this.name !== "";
      this.description_valid = this.description !== "";
      this.form_valid = this.name_valid && this.description_valid;
      if (this.form_valid) {
        const http = new Http();
        const response = await http.authPut(`/therapies/${this.therapy.id}/`, {
          name: this.name,
          description: this.description,
          is_model: this.is_model,
        });
        if (response.request.status === 200) {
          this.$router.push({ name: "therapies" });
        } else {
          this.error_msg = `La petición falló con estado ${response.status}`;
        }
      } else {
        this.error_msg = "Revisa el formulario";
      }
      this.loading = false;
    },
    async getTherapy() {
      const http = new Http();
      const response = await http.authGet(
        `/therapies/${this.$route.params.therapy_id}`
      );
      if (response.status !== 404) {
        this.therapy = response.data;
        this.name = this.therapy.name;
        this.description = this.therapy.description;
        await this.getTherapyPatients();
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
    async getTherapyPatients() {
      const http = new Http();
      const response = await http.authGet(
        `/therapies/${this.$route.params.therapy_id}/get_patients/`
      );
      if (response.status !== 404) {
        this.therapy_patients = response.data;
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
      this.$router.go();
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
};
</script>
