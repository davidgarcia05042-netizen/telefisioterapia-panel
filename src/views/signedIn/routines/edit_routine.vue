<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">
        Editando la rutina
        <span class="light-italic-font">{{ routine.name }}</span>
      </h2>
    </div>
    <div class="form-wrapper">
      <form class="create-therapy" @submit.prevent="saveRoutine">
        <div class="danger-bg form-error" v-show="!form_valid">
          <span class="white-text light-font">{{ error_msg }}</span>
        </div>
        <div class="form-group">
          <label for="name" class="light-font dark-text"
            >Nombre de la rutine</label
          >
          <input
            type="text"
            name="name"
            id="name"
            :class="{ 'light-font': true, 'has-error': !name_valid }"
            placeholder="Dale un nombre a la nueva rutina"
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
            placeholder="La rutina debe tener una descripción"
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
          <router-link :to="{ name: 'view_routine', params: { routine_id: $route.params.routine_id } }" class="btn btn-cancel">Cancelar</router-link>
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
  name: "EditRoutine",

  components: {
    ContentSave,
    Cached,
  },

  async beforeMount() {
    await this.getRoutine();
  },

  methods: {
    async saveRoutine() {
      this.loading = true;
      this.name_valid = this.name !== "";
      this.description_valid = this.description !== "";
      this.form_valid = this.name_valid && this.description_valid;
      if (this.form_valid) {
        const http = new Http();
        const response = await http.authPut(`/routines/${this.routine.id}/`, {
          name: this.name,
          description: this.description,
          is_model: this.is_model,
        });
        if (response.request.status === 200) {
          this.$router.push({ name: "routines" });
        } else {
          this.error_msg = `La petición falló con estado ${response.status}`;
        }
      } else {
        this.error_msg = "Revisa el formulario";
      }
      this.loading = false;
    },
    async getRoutine() {
      const http = new Http();
      const response = await http.authGet(
        `/routines/${this.$route.params.routine_id}`
      );
      if (response.status !== 404) {
        this.routine = response.data;
        this.name = this.routine.name;
        this.description = this.routine.description;
      } else {
        toast.error(NOT_FOUND);
      }
    },
  },

  data() {
    return {
      routine: {},
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
