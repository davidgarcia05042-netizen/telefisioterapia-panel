<template>
  <!-- Texto claro en toda la barra: el botón del menú heredaba el color del body (negro sobre oscuro). -->
  <nav class="navbar dark-bg light-text">
    <button
      type="button"
      class="navbar__action__sidebar navbar__button light-text light-font"
      aria-label="Mostrar u ocultar los nombres del menú"
      title="Mostrar u ocultar los nombres del menú"
      @click="toggle_sidebar"
    >
      <Menu aria-hidden="true" />
    </button>
    <h3 class="navbar__title light-text light-font">Panel de telefisioterapia</h3>
    <!-- N5 (docs/DECISIONES_TECNICAS.md): el menú de usuario se abre con clic (antes solo al pasar el mouse). -->
    <div ref="userMenu" class="navbar__user light-text light-font">
      <button
        type="button"
        class="navbar__button"
        aria-label="Menú de usuario"
        title="Menú de usuario"
        aria-haspopup="true"
        :aria-expanded="menuOpen ? 'true' : 'false'"
        @click="menuOpen = !menuOpen"
      >
        <account aria-hidden="true" />
      </button>
      <ul v-if="menuOpen" class="user__menu dark-bg">
        <li class="user__menu__item">
          <router-link to="/profile" class="user__menu__link" @click="menuOpen = false">
            <card-account-details class="user__menu__item--icon" aria-hidden="true" /><span
              class="user__menu__item--text"
              >Perfil</span
            >
          </router-link>
        </li>
        <li class="user__menu__item">
          <button type="button" class="user__menu__link" @click="logout">
            <logout class="user__menu__item--icon" aria-hidden="true" /><span
              class="user__menu__item--text"
              >Cerrar sesión</span
            >
          </button>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script>
import { Account, Logout, CardAccountDetails, Menu } from "mdue";
import Storage from "../lib/storage";
import Http from "../lib/http";

export default {
  name: "Navbar",
  components: {
    Account,
    Logout,
    CardAccountDetails,
    Menu,
  },
  data() {
    return {
      menuOpen: false,
    };
  },
  mounted() {
    // El menú se cierra con un clic fuera de él o con Escape.
    this._onDocumentClick = (event) => {
      if (this.menuOpen && !this.$refs.userMenu.contains(event.target)) this.menuOpen = false;
    };
    this._onKeydown = (event) => {
      if (event.key === "Escape") this.menuOpen = false;
    };
    document.addEventListener("click", this._onDocumentClick);
    document.addEventListener("keydown", this._onKeydown);
  },
  beforeUnmount() {
    document.removeEventListener("click", this._onDocumentClick);
    document.removeEventListener("keydown", this._onKeydown);
  },
  methods: {
    async logout() {
      this.menuOpen = false;
      // Primero se revoca el token en el backend; la sesión local se limpia
      // aunque esa llamada falle (http.logout no lanza errores).
      await new Http().logout();
      new Storage().clearSession();
      this.$router.push("/login");
    },
    toggle_sidebar() {
      this.$emit("toggle-sidebar");
    },
  },
};
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  width: 100%;
  height: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  z-index: 3;
}

.navbar__action__sidebar {
  margin-left: 10px;
  height: 100%;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.navbar__user {
  margin-right: 10px;
  height: 100%;
  display: flex;
  align-items: center;
}

.navbar__button {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 4px;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.user__menu {
  position: fixed;
  margin: 0;
  padding: 5px 10px 5px 10px;
  top: 30px;
  right: 0;
  list-style: none;
  font-size: 0.8em;
}

.user__menu__item {
  padding: 5px 0 5px 0;
}

.user__menu__item--icon {
  margin-right: 10px;
}

.user__menu__link {
  display: flex;
  align-items: center;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

.user__menu__link:hover {
  text-decoration: underline;
}
</style>