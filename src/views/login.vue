<template>
  <div class="wrapper">
    <div class="dark-bg login">
      <form class="secondary-bg login__form" @submit.prevent="login">
        <!-- I2 (docs/DECISIONES_TECNICAS.md): el login decía solo "Bienvenido", sin nombrar el producto. -->
        <h3 class="light-text regular-font login__form--title">Panel de telefisioterapia</h3>
        <p class="light-text light-font login__form--subtitle">Inicie sesión con su usuario y contraseña.</p>
        <div class="danger-bg login__form--error" v-show="hasError">
          <span class="white-text light-font">{{ errorMsg }}</span>
        </div>
        <input
          type="text"
          placeholder="Nombre de usuario"
          v-model="username"
          class="login__form--input"
        />
        <input
          type="password"
          placeholder="Contraseña"
          v-model="password"
          class="login__form--input"
        />
        <button type="submit" class="dark-bg login__form--btn">
          <span class="light-font light-text">Iniciar sesión</span> 
        </button>
        <div class="loader-wrapper" v-show="loading">
          <div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
        </div>
      </form>
    </div>
    <div class="img"></div>
  </div>
</template>

<script>
import Http from "../lib/http";
import Storage from "../lib/storage";

export default {
  name: "Login",
  mounted() {
    // G3: http.js trae aquí al usuario cuando el backend rechaza el token.
    if (this.$route.query.session === "expired") {
      this.errorMsg = "Tu sesión expiró. Inicia sesión de nuevo.";
      this.hasError = true;
    }
  },
  methods: {
    async login() {
      this.loading = true;
      this.hasError = false;
      const http = new Http();


      const response = await http.post("/auth/users/login/", {
        username: this.username,
        password: this.password,
      });
      if (response.error) {
        this.errorMsg = "Hubo un error accediendo al servidor. Inténtelo más tarde o comuníquese con el Administrador";
        this.hasError = true;
        this.loading = false;
      } else {
        if (response.status === 201) {
          const storage = new Storage();
          const groups = [];
          const permissions = [];
          response.data.user.groups.forEach((group) => {
            groups.push(group.name);
            group.permissions.forEach((permission) => {
              permissions.push(permission.codename);
            });
          });
          if (groups.includes("Admin") || groups.includes("Therapist")) {
            storage.set("user", JSON.stringify(response.data.user))
            storage.setToken(response.data.access_token);
            storage.set("groups", JSON.stringify(groups));
            storage.set("permissions", JSON.stringify(permissions));
            this.loading = false;
            this.$router.push("/");
          } else {
            this.errorMsg =
              "Para acceder debe contar con el rol Terapeuta o Administrador.";
            this.hasError = true;
            this.loading = false;
          }
        } else if (response.status >= 400 && response.status <= 500) {
          this.errorMsg = "Usuario y contraseña no válidas.";
          this.hasError = true;
          this.loading = false;
        } else {
          this.errorMsg = "Error interno. Inténtelo más tarde.";
          this.hasError = true;
          this.loading = false;
        }
      }
    },
  },
  data() {
    return {
      username: "",
      password: "",
      hasError: false,
      errorMsg: "",
      loading: false,
    };
  },
};
</script>

<style scoped lang="scss">
.wrapper {
  height: 100vh;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
}

.login {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login__form {
  border: 1px solid #2f2f2f;
  border-radius: 10px;
  padding: 10px;
  width: 30vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
}

.login__form--title {
  align-self: center;
  margin-bottom: 0;
}
.login__form--subtitle {
  align-self: center;
  margin: 4px 0 14px;
  font-size: 0.85em;
  opacity: 0.85;
}

.login__form--error {
  margin-bottom: 10px;
  padding: 5px;
  padding-left: 10px;
  border-radius: 30px;
  border: 0;
  font-weight: 400;
  font-size: 0.8em;
}

.login__form--input {
  margin-bottom: 10px;
  padding: 5px;
  padding-left: 10px;
  border-radius: 30px;
  border: 0;
}

.login__form--input::placeholder {
  @extend .regular-italic-font;
}

.login__form--btn {
  font-weight: 300;
  padding: 5px;
  border-radius: 30px;
  border: 0;
  cursor: pointer;
}

.img {
  width: 100%;
  background: url(../assets/login.jpg);
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center center;
}

@media (max-width: 800px) {
  .img {
    display: none;
  }

  .login__form {
    width: 80vw;
  }
}

// Loader
.loader-wrapper {
  width: 100%;
  display:flex;
  justify-content: center;
}
.lds-ellipsis {
  display: inline-block;
  position: relative;
  width: 80px;
  height: 80px;
}
.lds-ellipsis div {
  position: absolute;
  top: 33px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #fff;
  animation-timing-function: cubic-bezier(0, 1, 1, 0);
}
.lds-ellipsis div:nth-child(1) {
  left: 8px;
  animation: lds-ellipsis1 0.6s infinite;
}
.lds-ellipsis div:nth-child(2) {
  left: 8px;
  animation: lds-ellipsis2 0.6s infinite;
}
.lds-ellipsis div:nth-child(3) {
  left: 32px;
  animation: lds-ellipsis2 0.6s infinite;
}
.lds-ellipsis div:nth-child(4) {
  left: 56px;
  animation: lds-ellipsis3 0.6s infinite;
}
@keyframes lds-ellipsis1 {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes lds-ellipsis3 {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(0);
  }
}
@keyframes lds-ellipsis2 {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(24px, 0);
  }
}

</style>
