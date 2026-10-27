<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">Cambiar contraseña</h2>
    </div>
    <div class="form-wrapper">
      <form class="create-therapy" @submit.prevent="changePassword">
        <div class="danger-bg form-error" v-show="error_msg">
          <span class="white-text light-font">{{ error_msg }}</span>
        </div>
        <div class="form-group">
          <label for="name" class="light-font dark-text"
            >Contraseña actual</label
          >
          <input
            type="password"
            name="actual_password"
            id="actual_password"
            :class="{ 'light-font': true, 'has-error': !actual_password_valid }"
            placeholder="Escribe tu contraseña actual"
            v-model="actual_password"
          />
        </div>
        <div class="form-group">
          <label for="name" class="light-font dark-text"
            >Contraseña nueva</label
          >
          <input
            type="password"
            name="new_password"
            id="new_password"
            :class="{ 'light-font': true, 'has-error': !new_password_valid }"
            placeholder="Escribe tu contraseña nueva"
            v-model="new_password"
          />
        </div>
        <div class="form-group">
          <label for="name" class="light-font dark-text"
            >Contraseña nueva (Repetición)</label
          >
          <input
            type="password"
            name="new_password_again"
            id="new_password_again"
            :class="{ 'light-font': true, 'has-error': !new_password_again_valid }"
            placeholder="Repite la contraseña nueva"
            v-model="new_password_again"
          />
        </div>
        <button type="submit" class="btn btn-success btn-lg">
          <plus />
          <cached v-if="loading" class="rotate" />
          <span v-else>Cambiar contraseña</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { Plus, Cached } from "mdue";
import Http from "@/lib/http";
import Storage from "@/lib/storage";
import toast from "@/lib/toast";
import { backendErrorMessage } from "@/lib/storageService";
export default {
  name: "ChangePassword",

  components: {
    Plus,
    Cached,
  },

  methods: {
    async changePassword() {
      this.loading = true;
      this.error_msg = "";
      this.actual_password_valid = this.actual_password !== "";
      this.new_password_valid = this.new_password !== "";
      this.new_password_again_valid = this.new_password_again !== "" && this.new_password === this.new_password_again;
      this.form_valid = this.actual_password_valid && this.new_password_valid && this.new_password_again_valid;
      const user = JSON.parse(localStorage.getItem('user'))
      if (this.form_valid) {
        const http = new Http();
        const response = await http.authPost("/auth/users/change_password/", {
          username: user.username,
          password: this.actual_password,
          new_password: this.new_password,
        });
        if (response.request && response.request.status === 201) {
          toast.success("Contraseña cambiada. Inicia sesión con la nueva.");
          await this.logout();
        } else {
          // El backend explica el motivo en español: contraseña actual
          // incorrecta, o la nueva no pasa los validadores (muy corta, común,
          // solo números o parecida al usuario).
          this.error_msg = await backendErrorMessage(response, "No se pudo cambiar la contraseña");
        }
      } else {
        if (!this.actual_password_valid || this.new_password === "") {
          this.error_msg = "Escribe la contraseña actual y la nueva.";
        } else if (this.new_password !== this.new_password_again) {
          this.error_msg = "Las contraseñas nuevas no coinciden";
        } else if (this.new_password.length < 8) {
          this.error_msg = "La nueva contraseña debe tener al menos 8 caracteres";
          this.new_password_valid = false;
        }
      }
      this.loading = false;
    },
    async logout() {
      // Primero se revoca el token en el backend; la sesión local se limpia
      // aunque esa llamada falle (http.logout no lanza errores).
      await new Http().logout();
      new Storage().clearSession();
      this.$router.push("/login");
    },
  },

  data() {
    return {
      actual_password: "",
      new_password: "",
      new_password_again: "",
      is_model: false,
      loading: false,
      form_valid: true,
      actual_password_valid: true,
      new_password_valid: true,
      new_password_again_valid: true,
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