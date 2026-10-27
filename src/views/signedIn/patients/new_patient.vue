<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">Nuevo paciente</h2>
    </div>
    <div class="form-wrapper">
      <form class="create-therapy" @submit.prevent="saveTherapist">
        <div class="danger-bg form-error" v-show="error_msg">
          <span class="white-text light-font">{{ error_msg }}</span>
        </div>
        <div class="form-group">
          <label for="first_name" class="light-font dark-text"
            >Nombres</label
          >
          <input
            type="text"
            name="first_name"
            id="first_name"
            :class="{ 'light-font': true, 'has-error': !first_name_valid }"
            placeholder="Nombre del paciente"
            v-model="first_name"
          />
        </div>
        <div class="form-group">
          <label for="last_name" class="light-font dark-text"
            >Apellidos</label
          >
          <input
            type="text"
            name="last_name"
            id="last_name"
            :class="{ 'light-font': true, 'has-error': !last_name_valid }"
            placeholder="Apellidos del paciente"
            v-model="last_name"
          />
        </div>
        <div class="form-group">
          <label for="email" class="light-font dark-text"
            >Correo</label
          >
          <input
            type="email"
            name="email"
            id="email"
            :class="{ 'light-font': true, 'has-error': !email_valid }"
            placeholder="Correo electrónico del paciente"
            v-model="email"
          />
        </div>
        <div class="form-group">
          <label for="username" class="light-font dark-text"
            >Nombre de usuario</label
          >
          <input
            type="text"
            name="username"
            id="username"
            :class="{ 'light-font': true, 'has-error': !username_valid }"
            placeholder="Nombre de usuario único del paciente"
            v-model="username"
          />
        </div>
        <div class="form-group">
          <label for="birth_date" class="light-font dark-text">Fecha de nacimiento</label>
          <input
            type="date"
            name="birth_date"
            id="birth_date"
            :class="{ 'light-font': true, 'has-error': !birth_date_valid }"
            v-model="birth_date"
          />
        </div>
        <div class="form-group">
          <label for="height" class="light-font dark-text">Estatura (m)</label>
          <input
            type="number"
            step="0.01"
            name="height"
            id="height"
            :class="{ 'light-font': true, 'has-error': !height_valid }"
            placeholder="Estatura en metros (ej. 1.75)"
            v-model="height"
          />
        </div>
        <div class="form-group">
          <label for="weight" class="light-font dark-text">Peso (kg)</label>
          <input
            type="number"
            step="0.1"
            name="weight"
            id="weight"
            :class="{ 'light-font': true, 'has-error': !weight_valid }"
            placeholder="Peso en kilogramos (ej. 70.5)"
            v-model="weight"
          />
        </div>
        <div class="form-group">
          <label for="gender" class="light-font dark-text">Género</label>
          <select
            name="gender"
            id="gender"
            :class="{ 'light-font': true, 'has-error': !gender_valid }"
            v-model="gender"
          >
            <option value="" disabled>Seleccione un género</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div class="form-group">
          <label for="description" class="light-font dark-text">Descripción / Notas</label>
          <textarea
            name="description"
            id="description"
            rows="3"
            :class="{ 'light-font': true, 'has-error': !description_valid }"
            placeholder="Notas del paciente (ej. motivo de rehabilitación)"
            v-model="description"
          ></textarea>
        </div>
        <p class="form-help light-font">Al crear la cuenta se mostrará una contraseña temporal, una sola vez. Pídale al usuario que la cambie al entrar.</p>
        <!-- Fase V: "Cancelar" vuelve sin guardar. -->
        <div class="form-actions">
          <router-link :to="{ name: 'patients' }" class="btn btn-cancel">Cancelar</router-link>
          <button type="submit" class="btn btn-success btn-lg">
            <plus />
            <cached v-if="loading" class="rotate" />
            <span v-else>Crear paciente</span>
          </button>
        </div>
      </form>
    </div>
    <TemporaryPasswordDialog ref="password" />
  </div>
</template>

<script>
import { Plus, Cached } from "mdue";
import Http from "@/lib/http";
import { backendErrorMessage } from "@/lib/storageService";
import toast from "@/lib/toast";
import TemporaryPasswordDialog from "@/components/TemporaryPasswordDialog.vue";
export default {
  name: "NewPatient",

  components: {
    Plus,
    Cached,
    TemporaryPasswordDialog,
  },

  methods: {
    async saveTherapist() {
      this.loading = true;
      this.error_msg = "";
      this.first_name_valid = this.first_name !== "";
      this.last_name_valid = this.last_name !== "";
      this.email_valid = this.email !== "";
      this.username_valid = this.username !== "";
      this.birth_date_valid = this.birth_date !== "";
      this.height_valid = this.height !== "" && this.height !== null;
      this.weight_valid = this.weight !== "" && this.weight !== null;
      this.gender_valid = this.gender !== "";
      this.description_valid = this.description !== "";

      this.form_valid = this.first_name_valid && this.last_name_valid && this.email_valid && this.username_valid && this.birth_date_valid && this.height_valid && this.weight_valid && this.gender_valid && this.description_valid;
      if (this.form_valid) {
        const http = new Http();
        const response = await http.authPost("/patients", {
          username: this.username,
          email: this.email,
          first_name: this.first_name,
          last_name: this.last_name,
          birth_date: this.birth_date,
          height: parseFloat(this.height),
          weight: parseFloat(this.weight),
          gender: this.gender,
          description: this.description
        });
        if (response.request && response.request.status === 201) {
          // F3 (docs/DECISIONES_TECNICAS.md): el backend devuelve la contraseña temporal una
          // sola vez; se muestra en el diálogo y no queda en esta página.
          const created = await response.request.json();
          this.loading = false;
          const closedByUser = await this.$refs.password.show({
            username: created.username,
            password: created.temporary_password,
            role: "Paciente",
          });
          // Si se salió de la página con el diálogo abierto, no se navega.
          if (!closedByUser) return;
          toast.success("Paciente creado.");
          this.$router.push({ name: "patients" });
          return;
        } else {
          this.error_msg = await backendErrorMessage(response, "No se pudo crear el paciente");
        }
      } else {
        this.error_msg = "Revisa el formulario";
      }
      this.loading = false;
    },
  },

  data() {
    return {
      first_name_valid: true,
      first_name: '',
      last_name_valid: true,
      last_name: '',
      email_valid: true,
      email: '',
      username_valid: true,
      username: '',
      birth_date_valid: true,
      birth_date: '',
      height_valid: true,
      height: '',
      weight_valid: true,
      weight: '',
      gender_valid: true,
      gender: '',
      description_valid: true,
      description: '',
      loading: false,
      form_valid: true,
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
  width: 80%;
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