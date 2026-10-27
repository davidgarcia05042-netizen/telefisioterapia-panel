<template>
  <div class="viewer-header">
    <div class="header-left">
      <h2 class="light-font dark-text" style="margin: 0;">Visor 3D</h2>
      <div v-if="jsonData" class="source-badge">
        <span class="badge-label" :class="dataSource === 'localstorage' ? 'badge-local' : 'badge-file'">
          <satellite-variant v-if="dataSource === 'service'" aria-hidden="true" />
          <content-save v-else-if="dataSource === 'localstorage'" aria-hidden="true" />
          <folder v-else aria-hidden="true" />
          {{ dataSource === 'service' ? 'Servicio de procesamiento'
            : dataSource === 'localstorage' ? 'Guardado en el navegador' : 'Archivo JSON' }}
        </span>
        <span class="badge-name" :title="dataSourceName">{{ dataSourceName }}</span>
        <span v-if="jsonData.exercise_name" class="badge-exercise">— {{ jsonData.exercise_name }}</span>
      </div>
    </div>
    <div class="header-right">
      <label class="upload-btn card" v-if="!jsonData">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        <span>Cargar archivo JSON</span>
        <input type="file" accept=".json" @change="onFileChange" style="display:none" />
      </label>
      <!-- V2: con el movimiento del servicio no hay otro archivo que cargar. -->
      <button v-else-if="dataSource !== 'service'" class="btn btn-dark reset-btn" @click="$emit('reset-data')">
        Cargar otro archivo
      </button>
    </div>
  </div>
</template>

<script>
import { ContentSave, Folder, SatelliteVariant } from 'mdue';

export default {
  name: 'ViewerHeader',
  components: { ContentSave, Folder, SatelliteVariant },
  props: {
    jsonData: Object,
    dataSource: String,
    dataSourceName: String
  },
  methods: {
    onFileChange(event) {
      const file = event.target.files[0];
      if (file) {
        this.$emit('file-change', file);
      }
    }
  }
}
</script>

<style scoped>
.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  background: white;
  border-radius: 12px;
  padding: 14px 22px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  flex-shrink: 0;
}
.header-left { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.header-right { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.source-badge { display: flex; align-items: center; gap: 8px; margin-left: 16px; }
.badge-label { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 5px; font-size: 0.75em; font-weight: bold; color: white; }
.badge-local { background: #4BC0C0; }
.badge-file { background: #8e44ad; }
.badge-name { font-size: 0.85em; color: #555; font-weight: 500; }
.badge-exercise { font-size: 0.85em; color: #333; font-weight: 600; }
.upload-btn { display:flex; align-items:center; gap:8px; cursor:pointer; padding: 8px 14px; font-size: 0.9em; font-weight: 500; }
.reset-btn { border-radius: 6px; padding: 8px 16px; font-size: 0.9em; }
</style>
