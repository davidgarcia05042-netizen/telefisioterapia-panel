<template>
  <nav class="sidebar dark-bg light-text light-font" aria-label="Menú principal">
    <ul>
      <!--
        N2 (docs/DECISIONES_TECNICAS.md): enlaces reales (teclado, clic medio, abrir en otra
        pestaña) en lugar de <li @click>. N1: colapsada, el nombre sale como
        tooltip al pasar el mouse o al enfocar con el teclado.
      -->
      <li v-for="item in visibleItems" :key="item.key">
        <router-link
          :to="item.to"
          :class="{ sidebar__item: true, sidebar__item__active: activeKey === item.key }"
          :aria-current="activeKey === item.key ? 'page' : null"
          :aria-label="open ? null : item.label"
        >
          <component :is="item.icon" class="sidebar__item--icon" aria-hidden="true" />
          <span v-if="open" class="sidebar__item--text">{{ item.label }}</span>
          <span v-else class="sidebar__tooltip" role="tooltip">{{ item.label }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script>
import { HospitalBox, ClipboardList, Run, AccountChild, Doctor, Account, PoliceBadgeOutline } from "mdue";

// `groups`: grupos que ven el elemento (sin la clave, lo ven todos).
const ITEMS = [
  { key: "therapies", to: "/therapies", label: "Terapias", icon: HospitalBox },
  { key: "routines", to: "/routines", label: "Rutinas", icon: ClipboardList },
  { key: "exercises", to: "/exercises", label: "Ejercicios", icon: Run },
  { key: "my_patients", to: "/my-patients", label: "Mis pacientes", icon: AccountChild, groups: ["Therapist"] },
  // N3: "Administradores" tiene su propia clave; antes usaba la de "Terapeutas".
  { key: "admins", to: "/admins", label: "Administradores", icon: PoliceBadgeOutline, groups: ["Admin"] },
  { key: "therapists", to: "/therapists", label: "Terapeutas", icon: Doctor, groups: ["Admin"] },
  { key: "patients", to: "/patients", label: "Pacientes", icon: Account, groups: ["Admin"] },
];

export default {
  name: "Sidebar",
  props: ["open"],
  data() {
    return {
      groups: [],
    };
  },
  beforeMount() {
    this.groups = JSON.parse(localStorage.getItem("groups")) || [];
  },
  computed: {
    visibleItems() {
      return ITEMS.filter((item) => !item.groups || item.groups.some((group) => this.groups.includes(group)));
    },
    // Elemento activo: el de la sección de la ruta actual (/therapies/1/edit -> therapies).
    activeKey() {
      const item = ITEMS.find((entry) => this.$route.path === entry.to || this.$route.path.startsWith(`${entry.to}/`));
      return item ? item.key : null;
    },
  },
};
</script>

<style scoped lang="scss">
/*
 * N4 (docs/DECISIONES_TECNICAS.md): fija bajo la barra superior. Antes se iba con el
 * desplazamiento en las páginas largas (visor 3D, resultado) y, en las cortas,
 * el fondo oscuro terminaba donde terminaba el contenido. Sin overflow: los
 * tooltips de la barra colapsada salen hacia la derecha.
 */
.sidebar {
  position: sticky;
  top: 30px;
  align-self: flex-start;
  flex-shrink: 0;
  box-sizing: border-box;
  height: calc(100vh - 30px);
  padding: 10px 0 10px 0;
}
.sidebar ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.sidebar__item {
  position: relative;
  display: flex;
  align-items: center;
  height: 30px;
  padding-left: 10px;
  padding-right: 10px;
  color: inherit;
  text-decoration: none;
  border-left: 2px solid transparent;
}
.sidebar__item:hover {
  text-decoration: underline;
  cursor: pointer;
}
.sidebar__item--text {
  padding-left: 10px;
  white-space: nowrap;
}
.sidebar__item__active {
  border-left-color: $primary;
}
.sidebar__tooltip {
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  padding: 4px 10px;
  border-radius: 4px;
  background: $dark;
  color: $white;
  font-size: 0.85em;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.12s ease-in-out;
}
.sidebar__item:hover .sidebar__tooltip,
.sidebar__item:focus-visible .sidebar__tooltip {
  opacity: 1;
  visibility: visible;
}
</style>
