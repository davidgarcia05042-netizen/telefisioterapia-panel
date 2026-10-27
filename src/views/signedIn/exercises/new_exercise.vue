<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">Nuevo ejercicio</h2>
    </div>
    <div class="form-wrapper">
      <form class="create-therapy" @submit.prevent="saveExercise">
        <div class="danger-bg form-error" v-show="!form_valid">
          <span class="white-text light-font">{{ error_msg }}</span>
        </div>
        <div class="form-group">
          <label for="therapy" class="light-font dark-text">Rutina</label>
          <select
            name="routine"
            id="routine"
            :class="{ 'light-font': true, 'has-error': !routine_valid }"
            v-model="routine"
          >
            <option value="1" v-if="loading_routines" class="light-italic-font">
              Cargando ...
            </option>
            <option
              :value="routine.id"
              v-for="routine in routines"
              :key="routine.id"
            >
              {{ routine.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="name" class="light-font dark-text"
            >Nombre del ejercicio</label
          >
          <input
            type="text"
            name="name"
            id="name"
            :class="{ 'light-font': true, 'has-error': !name_valid }"
            placeholder="Dale un nombre al nuevo ejercicio"
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
            placeholder="El ejercicio debe tener una descripción"
            v-model="description"
          ></textarea>
        </div>
        <div class="form-group">
          <label for="name" class="light-font dark-text"
            >¿En qué posición dentro de la rutina irá este ejercicio?</label
          >
          <input
            type="number"
            name="order"
            id="order"
            :class="{ 'light-font': true, 'has-error': !order_valid }"
            placeholder="Si eliges 1, este será el primer ejercicio que verá el paciente"
            v-model="order"
          />
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

        <div class="form-group"><hr /></div>

        <!-- Carga de video (opcional) -->
        <div class="form-group">
          <label for="video" class="light-font dark-text">Video del ejercicio (opcional)</label>
          <input
            type="file"
            name="video"
            id="video"
            accept="video/*"
            @change="videoChanged"
          />
          <!-- Barra de progreso de subida -->
          <div v-if="uploadStatus === 'uploading'" class="upload-status-msg uploading">
            <cloud-upload class="msg-icon" aria-hidden="true" />Subiendo video... {{ uploadProgress }}%
          </div>
          <div v-if="uploadStatus === 'uploading'" class="upload-progress-container">
            <div class="upload-progress-bar" :style="{ width: uploadProgress + '%' }"></div>
          </div>
          <div v-if="uploadStatus === 'success'" class="upload-status-msg success">
            <check-circle class="msg-icon" aria-hidden="true" />Video subido; el análisis de ángulos queda en proceso
          </div>
          <div v-if="uploadStatus === 'error'" class="upload-status-msg error">
            <close-circle class="msg-icon" aria-hidden="true" />Error al subir el video{{ uploadError ? ': ' + uploadError : '' }}
          </div>
        </div>

        <!-- Selector de puntos del esqueleto -->
        <div class="form-group">
          <label class="light-font dark-text">Seleccione los puntos a seguir (opcional)</label>
          <div>
            <button type="button" class="btn btn-primary" @click="isModalVisible = true" style="margin-bottom: 15px; padding: 8px 16px; border-radius: 8px; border: none; background: #4BC0C0; color: white; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
              <eye class="msg-icon" aria-hidden="true" />Abrir selector visual de puntos
            </button>
            
            <div class="chips-container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; min-height: 30px; font-family: 'Open Sans', sans-serif; margin-top: 8px;">
              <span v-if="selected_points.length === 0" class="light-italic-font muted-text" style="grid-column: 1 / -1;">
                Ningún punto seleccionado.
              </span>
              <div v-for="entry in selected_points" :key="'main-chip-'+entry.skeleton_point_id" style="background-color: #4BC0C0; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 6px; font-weight: 600; border: none; overflow: hidden;">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ getPointName(entry.skeleton_point_id) }}</span>
                <span style="cursor: pointer; font-weight: bold; font-size: 1.1rem; opacity: 0.8; flex-shrink: 0;" @click="removePoint(entry.skeleton_point_id)">&times;</span>
              </div>
            </div>

            <SkeletonSelectorModal 
              :visible="isModalVisible" 
              @update:visible="isModalVisible = $event"
              :initialSelected="selected_points"
              :availablePoints="skeleton_points"
              @saved="onPointsSaved"
            />
          </div>
        </div>

        <!-- Fase V: "Cancelar" vuelve sin guardar. -->
        <div class="form-actions">
          <router-link :to="{ name: 'exercises' }" class="btn btn-cancel">Cancelar</router-link>
          <button type="submit" class="btn btn-success btn-lg" :disabled="loading">
            <plus />
            <cached v-if="loading" class="rotate" />
            <span v-if="uploadStatus === 'uploading'">Subiendo video... {{ uploadProgress }}%</span>
            <span v-else-if="loading">Creando...</span>
            <span v-else>Crear ejercicio</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import toast, { LOAD_ERROR } from '@/lib/toast';
import { Plus, Cached, CheckCircle, CloseCircle, CloudUpload, Eye } from "mdue";
import Http from "@/lib/http";
import SkeletonSelectorModal from '@/components/SkeletonSelectorModal.vue';
import ExerciseService from '@/services/exerciseService';

export default {
  name: "NewExercise",

  components: {
    Plus,
    Cached,
    CheckCircle,
    CloseCircle,
    CloudUpload,
    Eye,
    SkeletonSelectorModal,
  },

  async beforeMount() {
    await this.getRoutines();
    await this.getSkeletonPoints();
  },

  methods: {
    onPointsSaved(points) {
      this.selected_points = points;
    },
    removePoint(id) {
      this.selected_points = this.selected_points.filter(p => p.skeleton_point_id !== id);
    },
    getPointName(pointId) {
      const match = this.skeleton_points.find(p => p.id === pointId || p.value === pointId);
      return match ? (match.verbose || match.label) : `Punto ${pointId}`;
    },
    videoChanged(e) {
      this.video = e.target.files[0];
    },
    async getRoutines() {
      this.loading_routines = true;
      const http = new Http();
      const response = await http.authGet("/routines/");
      if (response.status !== 200) {
        toast.error(LOAD_ERROR);
        return;
      }
      this.routines = response.data.results.map((row) => ({
        id: row.id,
        name: row.name,
      }));
      this.loading_routines = false;
    },
    async getSkeletonPoints() {
      const http = new Http();
      const response = await http.authGet('/skeleton/');
      if (response.status !== 200) {
        toast.error(LOAD_ERROR);
        return;
      }
      this.skeleton_points = response.data;
    },
    async saveExercise() {
      this.loading = true;
      this.name_valid = this.name !== "";
      this.description_valid = this.description !== "";
      this.routine_valid = this.routine !== "";
      this.order_valid = !!this.order;
      this.form_valid =
        this.name_valid &&
        this.description_valid &&
        this.routine_valid &&
        this.order_valid;

      if (!this.form_valid) {
        this.error_msg = "Revisa el formulario";
        this.loading = false;
        return;
      }

      try {
        // 1) Crear el ejercicio (metadatos)
        const http = new Http();
        const response = await http.authPost("/exercises/", {
          name: this.name,
          description: this.description,
          routine_id: parseInt(this.routine),
          order: this.order,
          is_model: this.is_model,
        });

        if (response.request?.status !== 201) {
          this.error_msg = `La petición falló con estado ${response.request?.status || 'desconocido'}`;
          this.loading = false;
          return;
        }

        // Obtener el ID del ejercicio recién creado
        let createdId = null;
        try {
          const json = await response.request.json();
          createdId = json.id;
        } catch (_) {
          // Si no podemos parsear el ID, navegamos de vuelta sin subir video
        }

        // 2) Si hay video y/o puntos, subirlos
        if (createdId && (this.video || this.selected_points.length > 0)) {
          const points = this.selected_points.map(p => ({
            skeleton_point_id: p.skeleton_point_id,
            left_point_id: p.left_point_id ?? null,
            right_point_id: p.right_point_id ?? null,
          }));

          this.uploadStatus = 'uploading';
          const result = await ExerciseService.saveExercise({
            exerciseId: createdId,
            metadata: null,
            file: this.video || null,
            points: points.length > 0 ? points : null,
            onProgress: (pct) => (this.uploadProgress = pct),
          });

          if (result.ok) {
            this.uploadStatus = 'success';
            this.uploadProgress = 100;
            // Esperar 2 segundos para que el usuario vea el mensaje de éxito
            await new Promise(r => setTimeout(r, 2000));
          } else {
            this.uploadStatus = 'error';
            this.uploadError = result.message || `falló el paso ${result.step}`;
            console.warn(`Ejercicio creado pero falló en paso: ${result.step}`);
            // El ejercicio ya existe: se muestra el motivo antes de volver al listado
            await new Promise(r => setTimeout(r, 4000));
          }
        }

        this.$router.push({ name: "exercises" });
      } catch (error) {
        console.error("saveExercise error", error);
        this.error_msg = "Error inesperado al crear el ejercicio";
      } finally {
        this.loading = false;
      }
    },
  },

  data() {
    return {
      form_valid: true,
      routine: "",
      routine_valid: true,

      name: "",
      name_valid: true,

      description: "",
      description_valid: true,

      order: undefined,
      order_valid: true,

      is_model: false,

      loading: false,
      loading_routines: false,
      routines: [],
      skeleton_points: [],
      selected_points: [],
      isModalVisible: false,
      error_msg: "",
      video: null,
      uploadProgress: 0,
      uploadStatus: '', // '' | 'uploading' | 'success' | 'error'
      uploadError: '',
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
.upload-progress-container {
  position: relative;
  width: 100%;
  height: 22px;
  background: #e0e0e0;
  border-radius: 11px;
  overflow: hidden;
  margin-top: 8px;
}
.upload-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4BC0C0, #36a2a2);
  border-radius: 11px;
  transition: width 0.3s ease;
}
.upload-progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75em;
  font-weight: 700;
  color: #fff;
}
.upload-status-msg {
  margin-top: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.9em;
  font-weight: 600;
  /* Icono mdue y texto en la misma línea. */
  display: flex;
  align-items: center;
  gap: 8px;
}
.msg-icon {
  flex-shrink: 0;
  font-size: 1.2em;
}
.upload-status-msg.uploading {
  background: #e3f2fd;
  border: 1px solid #90caf9;
  color: #0d47a1;
}
.upload-status-msg.success {
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
  color: #1b5e20;
}
.upload-status-msg.error {
  background: #ffebee;
  border: 1px solid #ef9a9a;
  color: #b71c1c;
}
</style>

