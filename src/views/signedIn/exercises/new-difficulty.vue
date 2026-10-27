<template>
  <div class="therapies">
    <BackLink :to="{ name: 'view_exercise', params: { exercise_id: $route.params.exercise_id } }" label="Volver al ejercicio" />
    <div class="header">
      <h2 class="header__title dark-text regular-font">
        <template v-if="isEdit">
          Editando la dificultad <span class="light-italic-font">{{ originalName }}</span> de <span class="light-italic-font">{{ exercise.name }}</span>
        </template>
        <template v-else>
          Nueva dificultad para <span class="light-italic-font">{{ exercise.name }}</span>
        </template>
      </h2>
    </div>
    <p v-if="loading" class="light-font dark-text">Cargando...</p>
    <div v-else class="form-wrapper">
      <form class="create-therapy difficulty-form" @submit.prevent="saveDifficulty">
        <div class="danger-bg form-error" v-show="error_msg">
          <span class="white-text light-font">{{ error_msg }}</span>
          <!-- F3 (docs/DECISIONES_TECNICAS.md): ante el 409 por cambiar rangos de una asignada. -->
          <button v-if="rangesConflict" type="button" class="btn btn-light difficulty-duplicate" @click="duplicate">
            <span>Duplicar como nueva dificultad</span>
          </button>
        </div>
        <!--
          Los resultados se comparan con el rango vigente: en una dificultad
          asignada el backend no deja cambiar los rangos (409).
        -->
        <p v-if="isEdit && assignedCount > 0" class="difficulty-warning light-font dark-text">
          Esta dificultad está asignada en {{ assignedCount === 1 ? 'una rutina programada' : `${assignedCount} rutinas programadas` }}:
          puedes cambiar el nombre y la descripción, pero no los rangos, porque sus resultados se comparan con ellos.
          Para usar otros rangos, duplícala como una nueva dificultad.
        </p>
        <div class="form-group">
          <label for="name" class="light-font dark-text">Nombre de la dificultad</label>
          <input
            type="text"
            name="name"
            id="name"
            :class="{ 'light-font': true, 'has-error': !name_valid }"
            placeholder="Fácil, medio, etc."
            v-model="name"
          />
        </div>
        <div class="form-group">
          <label for="description" class="light-font dark-text">Descripción</label>
          <textarea
            name="description"
            id="description"
            :class="{ 'light-font': true, 'has-error': !description_valid }"
            cols="30"
            rows="6"
            v-model="description"
          ></textarea>
        </div>
        <hr>

        <!-- E5 (docs/DECISIONES_TECNICAS.md): lo medido en la referencia, como punto de partida. -->
        <h3 class="light-font dark-text">Medición de la referencia (servicio)</h3>
        <p v-if="!hasReference" class="light-font dark-text difficulty-help">
          El video de referencia todavía no tiene medición del servicio: no hay valores sugeridos.
        </p>
        <div v-else class="difficulty-table difficulty-table--reference">
          <span class="regular-font">Punto</span>
          <span class="regular-font">Mínimo medido</span>
          <span class="regular-font">Máximo medido</span>
          <template v-for="point in tracked_points" :key="point.point_id">
            <span class="light-font">{{ point.verbose }}</span>
            <span class="light-font">{{ formatAngle(point.min_angle) }}</span>
            <span class="light-font">{{ formatAngle(point.max_angle) }}</span>
          </template>
        </div>
        <hr>

        <h3 class="light-font dark-text">Rangos esperados</h3>
        <p v-if="ranges.length === 0" class="light-font dark-text difficulty-help">Todavía no hay rangos.</p>
        <div v-else class="difficulty-table difficulty-table--ranges">
          <span class="regular-font">Punto</span>
          <span class="regular-font">Ángulo mínimo</span>
          <span class="regular-font">Ángulo máximo</span>
          <span></span>
          <template v-for="(range, index) in ranges" :key="range.point.point_id">
            <span class="light-font">{{ range.point.verbose }}</span>
            <span class="light-font">{{ formatAngle(range.min_angle) }}</span>
            <span class="light-font">{{ formatAngle(range.max_angle) }}</span>
            <button type="button" class="btn btn-light difficulty-remove" @click="removeRange(index)"
                    :aria-label="`Quitar el rango de ${range.point.verbose}`">
              <span>Quitar</span>
            </button>
          </template>
        </div>

        <div class="form-group">
          <label for="tracked-point" class="light-font dark-text">Punto a seguir</label>
          <select id="tracked-point" v-model="selected_point_id" @change="fillAngles">
            <option :value="null" disabled>Elige una articulación</option>
            <option v-for="point in availablePoints" :key="point.point_id" :value="point.point_id">
              {{ point.verbose }}
            </option>
          </select>
          <span v-if="suggestion" class="light-font dark-text difficulty-help">{{ suggestion }}</span>
        </div>
        <div class="form-group">
          <label for="min-angle" class="light-font dark-text">Ángulo mínimo</label>
          <input id="min-angle" type="number" step="0.01" min="0" max="360" v-model.number="min_angle">
        </div>
        <div class="form-group">
          <label for="max-angle" class="light-font dark-text">Ángulo máximo</label>
          <input id="max-angle" type="number" step="0.01" min="0" max="360" v-model.number="max_angle">
        </div>
        <p v-if="range_error" class="light-font difficulty-range-error">{{ range_error }}</p>
        <button class="btn btn-success" type="button" @click="appendRange" :disabled="selected_point_id === null">
          <Clipboard />
          <span>Añadir rango</span>
        </button>
        <hr>
        <!-- Fase V: "Cancelar" vuelve sin guardar. -->
        <div class="form-actions">
          <router-link :to="{ name: 'view_exercise', params: { exercise_id: $route.params.exercise_id } }" class="btn btn-cancel">Cancelar</router-link>
          <button type="submit" class="btn btn-success btn-lg" :disabled="saving">
            <content-save v-if="isEdit" />
            <Plus v-else />
            <cached v-if="saving" class="rotate" />
            <span v-else>{{ isEdit ? 'Guardar cambios' : 'Crear dificultad' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import toast, { LOAD_ERROR, NOT_FOUND } from '@/lib/toast';
import Http from '@/lib/http';
import { backendErrorMessage } from '@/lib/storageService';
import '@/styles/views/view_routine.scss';
import { Plus, Clipboard, Cached, ContentSave } from "mdue";
import BackLink from '@/components/BackLink.vue';

/**
 * Crear (new_difficulty) o editar (edit_difficulty) una dificultad.
 * Cada articulación rastreada trae `point_id` (id de ExerciseSkeletonPointTracked,
 * el que guardan los rangos) y lo medido por el servicio en la referencia.
 */
export default {
  name: 'DifficultyForm',
  components: { Plus, Clipboard, Cached, ContentSave, BackLink },
  async beforeMount() {
    await this.load();
  },
  watch: {
    // Crear y editar comparten componente: al pasar de una ruta a la otra
    // (Duplicar) Vue reutiliza la instancia, así que se vuelve a cargar.
    async '$route.fullPath'() {
      Object.assign(this.$data, this.$options.data.call(this));
      await this.load();
    },
  },
  computed: {
    isEdit() {
      return Boolean(this.$route.params.difficulty_id);
    },
    hasReference() {
      return this.tracked_points.some((point) => point.min_angle !== null && point.max_angle !== null);
    },
    // Una articulación por rango: las que ya tienen rango no se ofrecen otra vez.
    availablePoints() {
      const used = new Set(this.ranges.map((range) => range.point.point_id));
      return this.tracked_points.filter((point) => !used.has(point.point_id));
    },
    selectedPoint() {
      return this.tracked_points.find((point) => point.point_id === this.selected_point_id) || null;
    },
    suggestion() {
      const point = this.selectedPoint;
      if (!point) return '';
      if (point.min_angle === null || point.max_angle === null) {
        return 'Sin medición del servicio para esta articulación: escribe el rango a mano.';
      }
      return `Sugerido por la referencia: ${this.formatAngle(point.min_angle)}° a ${this.formatAngle(point.max_angle)}°.`;
    },
  },
  methods: {
    async load() {
      const http = new Http();
      const response = await http.authGet(`/exercises/${this.$route.params.exercise_id}`);
      if (response.status !== 200 || !response.data) {
        toast.error(response.status === 404 ? NOT_FOUND : LOAD_ERROR);
        this.loading = false;
        return;
      }
      this.exercise = response.data;
      // Las articulaciones existen desde que se subió el video, aunque todavía
      // no estén medidas: antes solo se cargaban con el video procesado.
      await this.getPointsTracked();
      if (this.isEdit) await this.getDifficulty();
      else this.applyDuplicate(window.history.state && window.history.state.duplicate);
      this.loading = false;
    },
    // Rangos {point_tracked_id, min_angle, max_angle} -> filas del formulario.
    // Un rango cuya articulación ya no existe no aplica a nada y se omite.
    rangesFrom(list) {
      return (list || [])
        .map((range) => ({
          point: this.tracked_points.find((point) => point.point_id === range.point_tracked_id),
          min_angle: range.min_angle,
          max_angle: range.max_angle,
        }))
        .filter((range) => range.point);
    },
    // Formulario de creación precargado desde "Duplicar como nueva dificultad".
    applyDuplicate(copy) {
      if (!copy) return;
      this.name = copy.name || '';
      this.description = copy.description || '';
      this.ranges = this.rangesFrom(copy.ranges);
    },
    duplicate() {
      this.$router.push({
        name: 'new_difficulty',
        params: { exercise_id: this.exercise.id },
        state: {
          duplicate: {
            name: `${this.originalName} (copia)`,
            description: this.description,
            // Los rangos del formulario: los que se querían guardar.
            ranges: this.ranges.map((range) => ({
              point_tracked_id: range.point.point_id,
              min_angle: range.min_angle,
              max_angle: range.max_angle,
            })),
          },
        },
      });
    },
    async getPointsTracked() {
      const response = await new Http().authGet(`/exercises/${this.exercise.id}/points_tracked/`);
      if (response.status !== 200 || !response.data) {
        toast.error(LOAD_ERROR);
        return;
      }
      this.tracked_points = response.data;
    },
    async getDifficulty() {
      const response = await new Http().authGet(
        `/exercises/${this.exercise.id}/difficulties/${this.$route.params.difficulty_id}/`
      );
      if (response.status !== 200 || !response.data) {
        toast.error(response.status === 404 ? NOT_FOUND : LOAD_ERROR);
        return;
      }
      const difficulty = response.data;
      this.originalName = difficulty.name;
      this.name = difficulty.name;
      this.description = difficulty.description || '';
      this.assignedCount = difficulty.assigned_count || 0;
      this.ranges = this.rangesFrom(difficulty.ranges);
    },
    fillAngles() {
      const point = this.selectedPoint;
      this.range_error = '';
      this.min_angle = point && point.min_angle !== null ? Math.round(point.min_angle * 100) / 100 : '';
      this.max_angle = point && point.max_angle !== null ? Math.round(point.max_angle * 100) / 100 : '';
    },
    appendRange() {
      const point = this.selectedPoint;
      if (!point) return;
      const min = this.min_angle;
      const max = this.max_angle;
      if (typeof min !== 'number' || typeof max !== 'number' || isNaN(min) || isNaN(max)) {
        this.range_error = 'Escribe el ángulo mínimo y el máximo.';
        return;
      }
      if (min < 0 || max > 360) {
        this.range_error = 'Los ángulos deben estar entre 0 y 360 grados.';
        return;
      }
      if (min > max) {
        this.range_error = 'El ángulo mínimo no puede ser mayor que el máximo.';
        return;
      }
      this.ranges.push({ point, min_angle: min, max_angle: max });
      this.range_error = '';
      this.selected_point_id = null;
      this.min_angle = '';
      this.max_angle = '';
    },
    removeRange(index) {
      this.ranges.splice(index, 1);
    },
    async saveDifficulty() {
      this.name_valid = this.name.trim() !== '';
      this.description_valid = this.description.trim() !== '';
      if (!this.name_valid || !this.description_valid) {
        this.error_msg = 'Escribe el nombre y la descripción de la dificultad.';
        return;
      }
      this.error_msg = '';
      this.rangesConflict = false;
      this.saving = true;
      const http = new Http();
      const response = this.isEdit
        ? await http.authPut(`/exercises/${this.exercise.id}/difficulties/${this.$route.params.difficulty_id}/`, {
          name: this.name,
          description: this.description,
          ranges: this.ranges.map((range) => ({
            point_tracked_id: range.point.point_id,
            min_angle: range.min_angle,
            max_angle: range.max_angle,
          })),
        })
        : await http.authPost(`/exercises/${this.exercise.id}/post_difficulty/`, {
          name: this.name,
          description: this.description,
          exercise_id: this.exercise.id,
          ranges: JSON.stringify(this.ranges.map((range) => ({
            point_tracked: range.point,
            min_angle: range.min_angle,
            max_angle: range.max_angle,
          }))),
        });
      this.saving = false;
      const expected = this.isEdit ? 200 : 201;
      if (!response.request || response.request.status !== expected) {
        this.rangesConflict = this.isEdit && Boolean(response.request) && response.request.status === 409;
        this.error_msg = await backendErrorMessage(
          response, this.isEdit ? 'No se pudo guardar la dificultad' : 'No se pudo crear la dificultad'
        );
        return;
      }
      toast.success(this.isEdit ? 'Dificultad actualizada.' : 'Dificultad creada.');
      this.$router.push({ name: 'view_exercise', params: { exercise_id: this.exercise.id } });
    },
    formatAngle(value) {
      return value === null || value === undefined || value === '' ? '—' : parseFloat(value).toFixed(2);
    },
  },
  data() {
    return {
      loading: true,
      saving: false,
      exercise: {},
      tracked_points: [],
      ranges: [],
      originalName: '',
      assignedCount: 0,
      name: '',
      description: '',
      name_valid: true,
      description_valid: true,
      error_msg: '',
      rangesConflict: false,
      range_error: '',
      selected_point_id: null,
      min_angle: '',
      max_angle: '',
    };
  },
};
</script>

<style lang="scss">
.difficulty-form {
  min-width: min(560px, 100%);
}
.difficulty-table {
  display: grid;
  gap: 6px 12px;
  align-items: center;
  margin-bottom: 12px;
}
.difficulty-table--reference {
  grid-template-columns: 2fr 1fr 1fr;
}
.difficulty-table--ranges {
  grid-template-columns: 2fr 1fr 1fr auto;
}
.difficulty-remove {
  height: auto;
  padding: 2px 10px;
}
.difficulty-help {
  font-size: 0.9em;
  margin: 0 0 8px;
}
.difficulty-duplicate {
  margin-top: 8px;
  height: auto;
  padding: 4px 12px;
}
.difficulty-warning {
  margin: 0 0 12px;
  padding: 8px 12px;
  border: 1px solid #e0a030;
  border-radius: 8px;
  background: #fff4e0;
}
.difficulty-range-error {
  color: $danger;
  margin: 0 0 8px;
}
</style>
