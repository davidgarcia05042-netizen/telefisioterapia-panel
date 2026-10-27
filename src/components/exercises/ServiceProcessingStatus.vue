<template>
  <!--
    Indicador del procesamiento en el Servicio de Procesamiento. Reemplaza la
    barra de análisis del navegador: no inicia nada, solo refleja el estado
    que devuelve el backend. Con "Video procesado" no se muestra.
  -->
  <div v-if="status === PROCESSING_STATUS" class="service-status processing" role="status">
    <span class="service-status-text">Procesando en el servicio (MediaPipe Heavy)…</span>
    <!-- El servicio no reporta porcentaje: barra indeterminada. -->
    <div class="indeterminate-track"><div class="indeterminate-bar"></div></div>
    <span class="service-status-hint">La página se actualiza sola al terminar.</span>
  </div>
  <div v-else-if="status === ERROR_STATUS" class="service-status error" role="alert">
    <!--
      P4 (docs/DECISIONES_TECNICAS.md): un mensaje principal en lenguaje claro, con lo que se
      puede hacer; las articulaciones, el motivo y el código técnico van
      debajo en letra pequeña, un bloque por motivo.
    -->
    <span class="service-status-text">{{ partial ? PARTIAL_MESSAGE : FULL_MESSAGE }}</span>
    <div v-for="group in errorGroups" :key="group.key" class="error-group">
      <small class="error-detail">Articulaciones sin medir: {{ group.names.join(', ') }}</small>
      <small v-if="group.message !== GENERIC_ERROR" class="error-detail">Motivo: {{ group.message }}</small>
      <small v-if="group.detail" class="error-detail">Detalle técnico: {{ group.detail }}</small>
    </div>
  </div>
</template>

<script>
import { ERROR_STATUS, PROCESSING_STATUS, describeJointError } from '@/services/serverMovementService';

// describeJointError devuelve este texto cuando el error es técnico: entonces
// no se repite como motivo y queda solo el detalle técnico.
const GENERIC_ERROR = 'El servicio no pudo procesar el video.';
const ADVICE = 'Revise que la persona aparezca completa y con buena luz, y vuelva a subirlo.';
const FULL_MESSAGE = `El servicio no pudo medir este video. ${ADVICE}`;
const PARTIAL_MESSAGE = `El servicio no pudo medir algunas articulaciones de este video. ${ADVICE}`;

export default {
  name: 'ServiceProcessingStatus',
  props: {
    status: { type: String, default: '' },
    // [{id, name, error}] por articulación.
    jointErrors: { type: Array, default: () => [] },
    // true si alguna articulación sí se midió (el error no fue del video entero).
    partial: { type: Boolean, default: false },
  },
  computed: {
    errorGroups() {
      const groups = new Map();
      for (const item of this.jointErrors) {
        const { message, detail } = describeJointError(item.error);
        const key = `${message}|${detail || ''}`;
        if (!groups.has(key)) groups.set(key, { key, message, detail, names: [] });
        groups.get(key).names.push(item.name);
      }
      return [...groups.values()];
    },
  },
  data() {
    return { PROCESSING_STATUS, ERROR_STATUS, GENERIC_ERROR, FULL_MESSAGE, PARTIAL_MESSAGE };
  },
};
</script>

<style scoped lang="scss">
.service-status {
  margin: 10px 0 14px;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: 'Open Sans', sans-serif;

  &.processing { background: #e6f6f6; border: 1px solid #4BC0C0; color: #1f5f5f; }
  &.error { background: #fdecec; border: 1px solid #e06666; color: #7a1f1f; }
}
.service-status-text { font-weight: 600; }
.service-status-hint { font-size: 0.85em; }
.indeterminate-track {
  position: relative;
  width: 100%;
  height: 8px;
  background: #cfe9e9;
  border-radius: 4px;
  overflow: hidden;
}
.indeterminate-bar {
  position: absolute;
  top: 0;
  left: -40%;
  width: 40%;
  height: 100%;
  background: #4BC0C0;
  border-radius: 4px;
  animation: indeterminate 1.4s ease-in-out infinite;
}
@keyframes indeterminate {
  0%   { left: -40%; }
  100% { left: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .indeterminate-bar { animation-duration: 4s; }
}
.error-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.error-detail {
  display: block;
  font-size: 0.8em;
  opacity: 0.85;
  word-break: break-word;
}
</style>
