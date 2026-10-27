<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">Nueva terapia</h2>
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
          <router-link :to="{ name: 'therapies' }" class="btn btn-cancel">Cancelar</router-link>
          <button type="submit" class="btn btn-success btn-lg">
            <plus />
            <cached v-if="loading" class="rotate" />
            <span v-else>Crear terapia</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { Plus, Cached } from "mdue";
import Http from "@/lib/http";
export default {
  name: "NewTherapy",

  components: {
    Plus,
    Cached,
  },

  methods: {
    async saveTherapy() {
      this.loading = true;
      this.name_valid = this.name !== "";
      this.description_valid = this.description !== "";
      this.form_valid = this.name_valid && this.description_valid;
      if (this.form_valid) {
        const http = new Http();
        const response = await http.authPost("/therapies/", {
          name: this.name,
          description: this.description,
          is_model: this.is_model,
        });
        if (response.request.status === 201) {
          this.$router.push({ name: "therapies" });
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
      name: "",
      description: "",
      is_model: false,
      loading: false,
      form_valid: true,
      name_valid: true,
      description_valid: true,
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
  textarea {
    margin-bottom: 10px;
    padding: 5px;
    padding-left: 10px;
    border-radius: 10px;
    border: 0;
    background-color: $light;
  }
  input.has-error,
  textarea.has-error {
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