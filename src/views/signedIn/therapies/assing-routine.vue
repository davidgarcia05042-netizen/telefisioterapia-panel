<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">
        Asignando rutina en 
        <span class="light-italic-font">{{ therapy.name }}</span>
      </h2>
    </div>
    <div class="form-wrapper">
      <div class="form-container">
        <h3 class="regular-font dark-text">Asignar rutina a paciente</h3>
        <div class="danger-bg assign__form--error" v-show="hasError">
          <span class="white-text light-font">{{ errorMsg }}</span>
        </div>
        <p class="regular-font">Paciente</p>
        <select name="patient" id="patient" v-model="patient">
          <option
            v-for="patient in therapy_patients"
            :value="patient.id"
            :key="patient.id"
          >
            {{
              patient.patient.user.first_name + ' ' + patient.patient.user.last_name
            }}
          </option>
        </select>
        <p class="regular-font">Rutina</p>
        <select name="routines" id="routines" v-model="routine">
          <option
            v-for="routine in therapy_routines"
            :value="routine.id"
            :key="routine.id"
          >
            {{ routine.name }}
          </option>
        </select>
        <p class="regular-font">Fecha</p>
        <input
          type="datetime-local"
          name="start_time"
          id="start_time"
          v-model="start_time"
        />
        <hr>
        <h4 v-if="routine_exercises.length !== 0" class="regular-font dark-text">Dificultades de los ejercicios (opcional)</h4>
        <!-- T3 (decisión del equipo, 2026-10-16): la dificultad es opcional. -->
        <p v-if="routine_exercises.length !== 0" class="light-font dark-text difficulty-help">
          Sin dificultad, el resultado mostrará lo medido sin rango esperado.
        </p>
        <template v-for="exercise in routine_exercises" :key="exercise.id">
          <label class="regular-font" :for="'difficulty-' + exercise.id">
            Dificultad para el ejercicio <span class="light-italic-font">{{ exercise.name }}</span>
          </label>
          <select :id="'difficulty-' + exercise.id" v-model="selected_difficulties[exercise.id]">
            <option value="">Sin dificultad</option>
            <option v-for="diff in exercise.difficulties" :value="diff.id" :key="diff.id">{{ diff.name }}</option>
          </select>
        </template>
        <!-- Fase V: "Cancelar" vuelve sin guardar. -->
        <div class="form-actions">
          <router-link :to="{ name: 'view_therapy', params: { therapy_id: $route.params.therapy_id } }" class="btn btn-cancel">Cancelar</router-link>
          <button
            class="btn btn-success"
         
            :disabled="saving"
            @click="schedulePatient"
          >
            <content-save aria-hidden="true" />
            <span>{{ saving ? 'Guardando...' : 'Guardar' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import toast, { NOT_FOUND } from '@/lib/toast';
import Http from "@/lib/http";
import { backendErrorMessage } from "@/lib/storageService";
import "@/styles/views/edit_therapy.scss";
import { ContentSave } from "mdue";
export default {
  name: 'EnrollPatient',
  components: { ContentSave },
  async beforeMount() {
    await this.getTherapy();
    await this.getTherapyPatients();
    await this.getTherapyRoutines();
  },
  methods: {
    async getTherapy() {
      const http = new Http();
      const response = await http.authGet(
        `/therapies/${this.$route.params.therapy_id}`
      );
      if (response.status !== 404) {
        this.therapy = response.data;
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
    async getTherapyRoutines() {
      const http = new Http();
      const response = await http.authGet(
        `/therapies/${this.$route.params.therapy_id}/routines/`
      );
      if (response.status !== 404) {
        this.therapy_routines = response.data;
      } else {
        toast.error(NOT_FOUND);
      }
    },    
    async schedulePatient() {
      if (this.patient === '') {
        this.hasError = true;
        this.errorMsg = "Debes seleccionar un paciente"
        return
      }
      if (this.routine === '') {
        this.hasError = true;
        this.errorMsg = "Debes seleccionar una rutina"
        return
      }
      if (this.start_time === '') {
        this.hasError = true;
        this.errorMsg = "Debes seleccionar una fecha y hora para que el usuario desarrolle la rutina"
        return
      }
      // T3: la dificultad es opcional. Solo se envían los ejercicios que la
      // tienen: el backend lee `diff` de cada entrada, y una entrada sin ella
      // le producía un error 500 con la asignación ya creada a medias.
      const difficulties = this.routine_exercises
        .filter(exercise => this.selected_difficulties[exercise.id])
        .map(exercise => ({ exercise_id: exercise.id, diff: Number(this.selected_difficulties[exercise.id]) }));
      this.hasError = false;
      this.saving = true;
      const http = new Http();
      const date = new Date(this.start_time);
      // T2: se espera la respuesta; antes se navegaba sin saber si se guardó.
      const response = await http.authPost('/scheduled_training', {
        routine: this.routine,
        therapy_patient: this.patient,
        start_time: `${
          date.getDate() < 10 ? '0' + date.getDate() : '' + date.getDate()
        }/${
          date.getMonth() + 1 < 10
            ? '0' + (date.getMonth() + 1)
            : '' + (date.getMonth() + 1)
        }/${date.getFullYear()} ${
          date.getHours() < 10 ? '0' + date.getHours() : '' + date.getHours()
        }:${
          date.getMinutes() < 10
            ? '0' + date.getMinutes()
            : '' + date.getMinutes()
        }:${
          date.getSeconds() < 10
            ? '0' + date.getSeconds()
            : '' + date.getSeconds()
        }`,
        difficulties
      });
      this.saving = false;
      if (!response.request || response.request.status !== 201) {
        this.hasError = true;
        this.errorMsg = await backendErrorMessage(response, 'No se pudo asignar la rutina');
        return;
      }
      toast.success('Rutina asignada al paciente.');
      this.$router.push({
        name: 'view_therapy',
        params: {
          therapy_id: this.therapy.id
        }
      });
    },
  },
  watch: {
    routine: function(id) {
      const routine_obj = this.therapy_routines.find(routine => routine.id === id)
      this.routine_exercises = routine_obj ? routine_obj.exercises : [];
      // Arranca en "Sin dificultad" para cada ejercicio de la rutina elegida.
      this.selected_difficulties = Object.fromEntries(this.routine_exercises.map(exercise => [exercise.id, '']));
    }
  },
  data() {
    return {
      therapy: {},
      therapy_patients: [],
      therapy_routines: [],
      routine_exercises: [],
      selected_difficulties: {},
      saving: false,
      patient: '',
      routine: '',
      start_time: '',
      hasError: false,
      errorMsg: '',
    };
  },
}
</script>

<style lang="scss" scoped>
.form-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
}
.form-container {
  width: 90%;
  border: 1px solid #2f2f2f;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  &* {
    margin-top: 10px
  }
  button {
    width: 30%;
  }
}
.assign__form--error {
  margin-bottom: 10px;
  padding: 5px;
  padding-left: 10px;
  border-radius: 30px;
  border: 0;
  font-weight: 400;
  font-size: 0.8em;
}
.difficulty-help {
  margin: 0 0 8px;
  font-size: 0.9em;
}
</style>