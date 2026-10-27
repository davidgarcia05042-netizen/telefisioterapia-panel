<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">Nueva rutina</h2>
    </div>
    <div class="form-wrapper">
      <form class="create-therapy" @submit.prevent="saveRoutine">
        <div class="danger-bg form-error" v-show="!form_valid">
          <span class="white-text light-font">{{ error_msg }}</span>
        </div>
        <div class="form-group">
          <label for="therapy" class="light-font dark-text">Terapia</label>
          <select
            name="therapy"
            id="therapy"
            :class="{ 'light-font': true, 'has-error': !therapy_valid }"
            v-model="therapy"
          >
            <option
              value="1"
              v-if="loading_therapies"
              class="light-italic-font"
            >
              Cargando ...
            </option>
            <option
              :value="therapie.id"
              v-for="therapie in therapies"
              :key="therapie.id"
            >
              {{ therapie.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="name" class="light-font dark-text"
            >Nombre de la rutina</label
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
          <router-link :to="{ name: 'routines' }" class="btn btn-cancel">Cancelar</router-link>
          <button type="submit" class="btn btn-success btn-lg">
            <plus />
            <cached v-if="loading" class="rotate" />
            <span v-else>Crear rutina</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import toast, { LOAD_ERROR } from '@/lib/toast';
import { Plus, Cached } from "mdue";
import Http from "@/lib/http";
export default {
  name: "NewTherapy",

  components: {
    Plus,
    Cached,
  },

  async beforeMount() {
    await this.getTherapies();
  },

  methods: {
    async getTherapies() {
      this.loading_therapies = true;
      const http = new Http();
      const response = await http.authGet("/therapies/");
      if (response.status !== 200) {
        toast.error(LOAD_ERROR);
        return;
      }
      this.therapies = response.data.results.map((row) => ({
        id: row.id,
        name: row.name,
      }));
      this.loading_therapies = false;
    },
    async saveRoutine() {
      this.loading = true;
      this.name_valid = this.name !== "";
      this.description_valid = this.description !== "";
      this.therapy_valid = this.therapy !== "";
      this.form_valid =
        this.name_valid && this.description_valid && this.therapy_valid;
      if (this.form_valid) {
        const http = new Http();
        const response = await http.authPost("/routines/", {
          name: this.name,
          description: this.description,
          therapy_id: parseInt(this.therapy),
          is_model: this.is_model,
        });
        if (response.request.status === 201) {
          this.$router.push({ name: "routines" });
        } else {
          this.error_msg = `La petición falló con estado ${response.status}`;
        }
      } else {
        this.error_msg = "Revisa el formulario";
      }
      this.loading = false;
    },
  },

  data() {
    return {
      form_valid: true,
      therapy: "",
      therapy_valid: true,

      name: "",
      name_valid: true,

      description: "",
      description_valid: true,

      is_model: false,

      loading: false,
      loading_therapies: false,
      therapies: [],
      error_msg: "",
    };
  },
};
</script>

<style scoped lang="scss">
.therapies {
  height: calc(100vh - 50px);
  width: 100%;
  overflow-y: scroll;
  padding: 10px;
}
.header {
  margin-bottom: 20px;
}
.header__title {
  margin: 0;
}
.form-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}
.create-therapy {
  border: 1px solid $dark;
  border-radius: 20px;
  padding: 1.5em;
  display: flex;
  flex-direction: column;
  button {
    align-self: flex-end;
  }
}
.form-group {
  width: 100%;
  display: flex;
  flex-direction: column;

  * {
    display: block;
  }
  label {
    margin-bottom: 5px;
  }
  textarea {
    resize: none;
  }
  input,
  textarea,
  select {
    margin-bottom: 10px;
    padding: 5px;
    padding-left: 10px;
    padding-right: 10px;
    border-radius: 10px;
    border: 0;
    background-color: $light;
  }
  input.has-error,
  textarea.has-error,
  select.has-error {
    border: 1px solid $danger;
  }
  input::placeholder,
  textarea::placeholder {
    @extend .regular-italic-font;
  }
  &.form-checkbox {
    flex-direction: row;
    align-items: center;
    margin-bottom: 10px;
    input {
      margin: 0;
      margin-left: 10px;
    }
    label {
      margin-bottom: 0;
    }
  }
}
.form-error {
  margin-bottom: 10px;
  padding: 5px;
  padding-left: 10px;
  border-radius: 30px;
  border: 0;
  font-weight: 400;
  font-size: 0.8em;
}
</style>
