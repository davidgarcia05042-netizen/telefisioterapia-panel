<template>
  <!--
    I1 (docs/DECISIONES_TECNICAS.md): antes la página de inicio era solo una foto de stock en
    blanco y negro. Ahora es un tablero con datos que la API ya da: para el
    terapeuta, sus pacientes y rutinas; para el administrador, los usuarios y
    las terapias.
  -->
  <div class="home">
    <header class="home__header">
      <h2 class="light-font dark-text">Hola, {{ firstName }}</h2>
      <p class="light-font secondary-text">{{ todayLabel }}</p>
    </header>

    <p v-if="loadError" class="home__error regular-font" role="alert">
      No se pudieron cargar algunos datos. Recargue la página para intentarlo de nuevo.
    </p>

    <template v-if="isTherapist">
      <section class="home__cards" aria-label="Resumen de sus pacientes">
        <router-link :to="{ name: 'my-patients' }" class="home-card">
          <account-child class="home-card__icon" aria-hidden="true" />
          <span class="home-card__value bold-font">{{ show(therapist.patients) }}</span>
          <span class="home-card__label regular-font">Pacientes</span>
        </router-link>
        <div class="home-card">
          <calendar-today class="home-card__icon" aria-hidden="true" />
          <span class="home-card__value bold-font">{{ show(therapist.summary && therapist.summary.today) }}</span>
          <span class="home-card__label regular-font">Rutinas para hoy</span>
        </div>
        <div class="home-card home-card--progress">
          <progress-clock class="home-card__icon" aria-hidden="true" />
          <span class="home-card__value bold-font">{{ show(therapist.summary && therapist.summary.inProgress) }}</span>
          <span class="home-card__label regular-font">Rutinas en curso</span>
        </div>
        <div class="home-card home-card--ok">
          <check-circle class="home-card__icon" aria-hidden="true" />
          <span class="home-card__value bold-font">{{ show(therapist.summary && therapist.summary.finished) }}</span>
          <span class="home-card__label regular-font">Rutinas finalizadas</span>
        </div>
      </section>

      <section class="home__panel">
        <h3 class="regular-font dark-text">Próximas rutinas</h3>
        <p v-if="loading" class="light-font dark-text" role="status">Cargando...</p>
        <p v-else-if="!therapist.summary || therapist.summary.pending.length === 0" class="light-font dark-text">
          No hay rutinas pendientes.
        </p>
        <ul v-else class="home__list">
          <li v-for="item in therapist.summary.pending" :key="item.id" class="home__list-item">
            <router-link
              :to="{ name: 'view_patient_routine', params: { patient_id: item.therapyPatientId, scheduled_training_id: item.id } }"
              class="home__list-link"
            >
              <span class="home__list-date light-font">{{ formatDateTime(item.start_time) }}</span>
              <span class="home__list-main">
                <span class="regular-font dark-text">{{ item.patient }}</span>
                <span class="light-font secondary-text">{{ item.routine }}</span>
              </span>
              <span class="home__list-status">
                <span v-if="item.overdue" class="status-badge status-badge--error">Atrasada</span>
                <span v-else :class="['status-badge', statusClass(item.status)]">{{ item.status }}</span>
              </span>
              <chevron-right class="home__list-arrow" aria-hidden="true" />
            </router-link>
          </li>
        </ul>
      </section>
    </template>

    <section v-if="isAdmin" class="home__cards" aria-label="Resumen de la plataforma">
      <router-link :to="{ name: 'therapists' }" class="home-card">
        <doctor class="home-card__icon" aria-hidden="true" />
        <span class="home-card__value bold-font">{{ show(admin.therapists) }}</span>
        <span class="home-card__label regular-font">Terapeutas</span>
      </router-link>
      <router-link :to="{ name: 'patients' }" class="home-card">
        <account class="home-card__icon" aria-hidden="true" />
        <span class="home-card__value bold-font">{{ show(admin.patients) }}</span>
        <span class="home-card__label regular-font">Pacientes</span>
      </router-link>
      <router-link :to="{ name: 'admins' }" class="home-card">
        <police-badge-outline class="home-card__icon" aria-hidden="true" />
        <span class="home-card__value bold-font">{{ show(admin.admins) }}</span>
        <span class="home-card__label regular-font">Administradores</span>
      </router-link>
      <router-link :to="{ name: 'therapies' }" class="home-card">
        <hospital-box class="home-card__icon" aria-hidden="true" />
        <span class="home-card__value bold-font">{{ show(admin.therapies) }}</span>
        <span class="home-card__label regular-font">Terapias</span>
      </router-link>
    </section>

    <section class="home__panel">
      <h3 class="regular-font dark-text">Accesos rápidos</h3>
      <div class="home__shortcuts">
        <template v-if="isTherapist">
          <router-link :to="{ name: 'my-patients' }" class="home__shortcut regular-font">
            <account-child aria-hidden="true" />Mis pacientes
          </router-link>
          <router-link :to="{ name: 'new_therapy' }" class="home__shortcut regular-font">
            <plus aria-hidden="true" />Nueva terapia
          </router-link>
          <router-link :to="{ name: 'new_routine' }" class="home__shortcut regular-font">
            <plus aria-hidden="true" />Nueva rutina
          </router-link>
          <router-link :to="{ name: 'new_exercise' }" class="home__shortcut regular-font">
            <plus aria-hidden="true" />Nuevo ejercicio
          </router-link>
        </template>
        <template v-if="isAdmin">
          <router-link :to="{ name: 'new-therapists' }" class="home__shortcut regular-font">
            <plus aria-hidden="true" />Nuevo terapeuta
          </router-link>
          <router-link :to="{ name: 'new-patient' }" class="home__shortcut regular-font">
            <plus aria-hidden="true" />Nuevo paciente
          </router-link>
          <router-link :to="{ name: 'new-admin' }" class="home__shortcut regular-font">
            <plus aria-hidden="true" />Nuevo administrador
          </router-link>
        </template>
      </div>
    </section>
  </div>
</template>

<script>
import Http from '@/lib/http';
import { formatDateTime, statusClass } from '@/lib/format';
import { countOf, summarizeRoutines } from '@/services/dashboardService';
import {
  Account, AccountChild, CalendarToday, CheckCircle, ChevronRight, Doctor, HospitalBox, Plus,
  PoliceBadgeOutline, ProgressClock,
} from 'mdue';

const TODAY = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

export default {
  name: 'Home',
  components: {
    Account, AccountChild, CalendarToday, CheckCircle, ChevronRight, Doctor, HospitalBox, Plus,
    PoliceBadgeOutline, ProgressClock,
  },
  data() {
    const user = JSON.parse(localStorage.getItem('user') || 'null') || {};
    const groups = JSON.parse(localStorage.getItem('groups') || 'null') || [];
    const today = TODAY.format(new Date());
    return {
      user,
      isTherapist: groups.includes('Therapist'),
      isAdmin: groups.includes('Admin'),
      todayLabel: today.charAt(0).toUpperCase() + today.slice(1),
      loading: true,
      loadError: false,
      therapist: { patients: null, summary: null },
      admin: { therapists: null, patients: null, admins: null, therapies: null },
    };
  },
  computed: {
    firstName() {
      return this.user.first_name || this.user.username || '';
    },
  },
  async mounted() {
    const loads = [];
    if (this.isTherapist) loads.push(this.loadTherapist());
    if (this.isAdmin) loads.push(this.loadAdmin());
    await Promise.all(loads);
    this.loading = false;
  },
  methods: {
    formatDateTime,
    statusClass,
    // "—" mientras carga o si no se pudo cargar.
    show(value) {
      return value === null || value === undefined ? '—' : value;
    },
    async get(url) {
      const response = await new Http().authGet(url);
      return response;
    },
    async loadTherapist() {
      const response = await this.get(`/therapist_patient?therapist_id=${this.user.id}`);
      if (response.status !== 200 || !Array.isArray(response.data)) {
        this.loadError = true;
        return;
      }
      const therapyPatients = response.data;
      this.therapist.patients = therapyPatients.length;
      // Una consulta por paciente con rutinas (404 = no tiene).
      const entries = await Promise.all(therapyPatients.map(async (therapyPatient) => {
        if (!(therapyPatient.scheduled_trainings || []).length) return { therapyPatient, routines: [] };
        const routines = await this.get(`/scheduled_training?patient_id=${therapyPatient.id}`);
        if (routines.status === 200 && Array.isArray(routines.data)) return { therapyPatient, routines: routines.data };
        if (routines.status !== 404) this.loadError = true;
        return { therapyPatient, routines: [] };
      }));
      this.therapist.summary = summarizeRoutines(entries);
    },
    async loadAdmin() {
      const endpoints = { therapists: '/therapists', patients: '/patients', admins: '/admins', therapies: '/therapies/' };
      await Promise.all(Object.entries(endpoints).map(async ([key, url]) => {
        const response = await this.get(url);
        if (response.status === 200) this.admin[key] = countOf(response.data);
        else this.loadError = true;
      }));
    },
  },
};
</script>

<style scoped lang="scss">
.home {
  box-sizing: border-box;
  width: 100%;
  max-width: 1100px;
  /* Toda la altura bajo la barra superior, como la foto de antes: la barra lateral se estira con el contenido. */
  min-height: calc(100vh - 30px);
  padding: 8px 10px 24px;
}
.home__header {
  h2 { margin: 8px 0 0; }
  p { margin: 4px 0 16px; }
}
.home__error {
  padding: 8px 12px;
  border-radius: 6px;
  background: #fdecec;
  border: 1px solid #d64545;
  color: #7a1f1f;
}
.home__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.home-card {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 14px;
  align-items: center;
  padding: 18px 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e3e8f0;
  box-shadow: 0 1px 3px rgba(32, 37, 44, 0.06);
  color: $dark;
  text-decoration: none;
}
a.home-card:hover {
  border-color: $primary;
  box-shadow: 0 2px 8px rgba(60, 111, 200, 0.15);
}
.home-card__icon {
  grid-row: 1 / span 2;
  font-size: 2.2rem;
  color: $primary;
}
.home-card--progress .home-card__icon { color: #e0a030; }
.home-card--ok .home-card__icon { color: #2e9d5b; }
.home-card__value {
  font-size: 1.9rem;
  line-height: 1.1;
}
.home-card__label {
  font-size: 0.9rem;
  color: $secondary;
}
.home__panel {
  padding: 16px 20px;
  margin-bottom: 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e3e8f0;
  h3 { margin: 0 0 12px; }
}
.home__list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.home__list-item + .home__list-item {
  border-top: 1px solid #e3e8f0;
}
.home__list-link {
  display: grid;
  grid-template-columns: 210px 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 10px 6px;
  text-decoration: none;
  border-radius: 8px;
}
.home__list-link:hover {
  background: #eef3fb;
}
.home__list-date {
  color: $secondary;
  font-size: 0.9rem;
  white-space: nowrap;
}
.home__list-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.home__list-arrow {
  color: $secondary;
  font-size: 1.3rem;
}
.home__shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.home__shortcut {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #cdd6e4;
  color: $dark;
  text-decoration: none;
  font-size: 0.9rem;
}
.home__shortcut:hover {
  border-color: $primary;
  color: $primary;
}
@media (max-width: 700px) {
  .home__list-link {
    grid-template-columns: 1fr auto;
  }
  .home__list-date {
    grid-column: 1 / -1;
  }
  .home__list-arrow {
    display: none;
  }
}
</style>
