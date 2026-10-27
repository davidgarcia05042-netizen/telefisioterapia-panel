<template>
  <div class="viewer-3d-container">
    <BackLink
      v-if="$route.params.exercise_id"
      :to="{ name: 'view_exercise', params: { exercise_id: $route.params.exercise_id } }"
      label="Volver al ejercicio"
    />
    <!-- Header Bar -->
    <ViewerHeader 
      :jsonData="jsonData"
      :dataSource="dataSource"
      :dataSourceName="dataSourceName"
      @file-change="handleFileChange"
      @reset-data="resetData"
    />

    <!-- 3D Viewer -->
    <div class="main-content" ref="mainContent">
      <div class="canvas-wrapper" :class="isDarkMode ? 'dark-bg' : 'light-bg'" v-if="jsonData">
        <Skeleton3D 
          :currentFrame="currentFrame" 
          :trackedIndices="activeTrackedIndices"
          :showAllPoints="showAllPoints"
          @toggle-points="showAllPoints = !showAllPoints"
          :isDarkMode="isDarkMode"
          @toggle-theme="isDarkMode = !isDarkMode"
          :showAxes="showAxes"
          @toggle-axes="showAxes = !showAxes"
          @toggle-fullscreen="toggleFullscreen"
        />
      </div>
      <div v-else class="empty-state" :class="isDarkMode ? 'dark-bg' : 'light-bg'">
        <p class="light-font" style="font-size: 1.2em;">{{ emptyMessage }} Sube un archivo JSON para visualizar la reconstrucción anatómica 3D.</p>
      </div>

      <!-- Scrubber -->
      <PlaybackControls 
        v-if="jsonData"
        v-model="currentFrameIndex"
        :isPlaying="isPlaying"
        :totalFrames="totalFrames"
        :currentTimeFormatted="currentTimeFormatted"
        :totalTimeFormatted="totalTimeFormatted"
        @toggle-play="togglePlay"
        @scrub="onScrub"
      />
    </div>

    <!-- Bottom Tab Panel -->
    <div class="bottom-panel" v-if="jsonData">
      <!-- Tab Bar -->
      <div class="tab-bar">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'metrics' }" 
          @click="activeTab = 'metrics'"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Métricas
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'charts' }" 
          @click="switchToCharts"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          Ángulos
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'positions' }" 
          @click="switchToPositions"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          Posición
        </button>
      </div>

      <!-- Metrics Tab -->
      <MetricsTab v-show="activeTab === 'metrics'" :metrics="metrics" />

      <!-- Angles Tab -->
      <div v-show="activeTab === 'charts'" class="tab-content charts-grid">
        <template v-if="metrics && sampledData">
          <AngleChart
            v-for="(metric, pointName) in metrics"
            :key="'chart-' + pointName"
            :title="formatPointName(pointName)"
            :labels="sampledData.labels"
            :dataPoints="sampledData.sampledFrames.map(f => f.angles && f.angles[pointName] != null ? f.angles[pointName] : null)"
            :currentFrameIndex="currentFrameIndex"
            :step="sampledData.step"
            :isPlaying="isPlaying"
            @seek="handleSeek"
          />
        </template>
        <div v-else>
          <p style="font-size: 0.9em; color: #888;">Sin datos de ángulos para graficar.</p>
        </div>
      </div>

      <!-- Positions Tab -->
      <div v-show="activeTab === 'positions'" class="tab-content charts-grid">
        <template v-if="activeTrackedIndices.length > 0 && sampledData">
          <PositionChart
            v-for="idx in activeTrackedIndices"
            :key="'pos-' + idx"
            :title="landmarkName(idx)"
            :labels="sampledData.labels"
            :xData="sampledData.sampledFrames.map(f => { const pt = f.points && (f.points[idx] || f.points[String(idx)]); return pt ? parseFloat(pt[0].toFixed(4)) : null; })"
            :yData="sampledData.sampledFrames.map(f => { const pt = f.points && (f.points[idx] || f.points[String(idx)]); return pt ? parseFloat(pt[1].toFixed(4)) : null; })"
            :zData="sampledData.sampledFrames.map(f => { const pt = f.points && (f.points[idx] || f.points[String(idx)]); return pt ? parseFloat(pt[2].toFixed(4)) : null; })"
            :currentFrameIndex="currentFrameIndex"
            :step="sampledData.step"
            :isPlaying="isPlaying"
            @seek="handleSeek"
          />
        </template>
        <div v-else>
          <p style="font-size: 0.9em; color: #888;">No hay puntos rastreados activos para mostrar posición.</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import Skeleton3D from './components/Skeleton3D.vue';
import toast from '@/lib/toast';
import BackLink from '@/components/BackLink.vue';
import MetricsService from '@/services/metricsService';
import MetricsTab from './components/MetricsTab.vue';
import AngleChart from './components/AngleChart.vue';
import PositionChart from './components/PositionChart.vue';
import ViewerHeader from './components/ViewerHeader.vue';
import PlaybackControls from './components/PlaybackControls.vue';
import { POSE_LANDMARK_IDS } from './utils/constants';
import { formatPointName, landmarkName } from './utils/formatters';
import {
  SERVICE_SOURCE_LABEL, UNAVAILABLE_LABEL, angleModeLabel, fetchExerciseMovement, framesForMode,
} from '@/services/serverMovementService';

export default {
  name: 'View3DViewer',
  components: { 
    BackLink,
    Skeleton3D, 
    MetricsTab, 
    AngleChart, 
    PositionChart,
    ViewerHeader,
    PlaybackControls
  },
  data() {
    return {
      jsonData: null,
      // Aviso cuando el ejercicio todavía no tiene movimiento del servicio.
      emptyMessage: "",
      dataSource: null,
      dataSourceName: '',
      showAllPoints: true,
      isDarkMode: true,
      showAxes: false,
      currentFrameIndex: 0,
      isPlaying: false,
      playbackInterval: null,
      metrics: null,
      activeTab: 'metrics'
    };
  },
  computed: {
    activeTrackedIndices() {
      if (!this.metrics) return [];
      return Object.keys(this.metrics)
        .map(key => POSE_LANDMARK_IDS[key])
        .filter(id => id !== undefined);
    },
    currentFrame() {
      if (!this.jsonData || !this.jsonData.frames) return null;
      return this.jsonData.frames[this.currentFrameIndex];
    },
    totalFrames() {
      return this.jsonData && this.jsonData.frames ? this.jsonData.frames.length : 0;
    },
    currentTimeFormatted() {
      if (!this.currentFrame) return '0.0s';
      return this.currentFrame.t.toFixed(1) + 's';
    },
    totalTimeFormatted() {
      if (!this.jsonData || !this.jsonData.frames || this.totalFrames === 0) return '0.0s';
      return this.jsonData.frames[this.totalFrames - 1].t.toFixed(1) + 's';
    },
    sampledData() {
      if (!this.jsonData || !this.jsonData.frames) return null;
      const frames = this.jsonData.frames;
      const step = Math.max(1, Math.floor(frames.length / 300));
      const sampledFrames = frames.filter((_, i) => i % step === 0);
      const labels = sampledFrames.map(f => f.t ? f.t.toFixed(1) + 's' : '');

      return { step, labels, sampledFrames };
    }
  },
  methods: {
    handleFileChange(file) {
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          this.loadJsonData(data, 'file', file.name);
        } catch (error) {
          console.error("Error parsing JSON:", error);
          toast.error("El archivo no es un JSON válido.");
        }
      };
      reader.readAsText(file);
    },
    loadJsonData(data, source = 'file', name = '') {
      this.jsonData = data;
      this.dataSource = source;
      this.dataSourceName = name;
      this.currentFrameIndex = 0;
      this.activeTab = 'metrics';
      this.calculateMetrics();
    },
    calculateMetrics() {
      if (!this.jsonData || !this.jsonData.frames) return;
      const calculated = {};
      
      const sampleFrame = this.jsonData.frames.find(f => f.angles);
      if (sampleFrame && sampleFrame.angles) {
        const angleKeys = Object.keys(sampleFrame.angles);
        for (const key of angleKeys) {
          const angleData = this.jsonData.frames.map(f => f.angles ? f.angles[key] : null);
          calculated[key] = MetricsService.calculateStats(angleData);
        }
      }
      this.metrics = Object.keys(calculated).length > 0 ? calculated : null;
    },
    togglePlay() {
      this.isPlaying = !this.isPlaying;
      if (this.isPlaying) {
        this.playbackInterval = setInterval(() => {
          if (this.currentFrameIndex < this.totalFrames - 1) {
            this.currentFrameIndex++;
          } else {
            this.pausePlayback();
          }
        }, 33); // Approx 30fps
      } else {
        this.pausePlayback();
      }
    },
    pausePlayback() {
      this.isPlaying = false;
      clearInterval(this.playbackInterval);
    },
    onScrub() {
      if (this.isPlaying) this.pausePlayback();
    },
    resetData() {
      this.pausePlayback();
      this.jsonData = null;
      this.metrics = null;
    },
    toggleFullscreen() {
      const elem = this.$refs.mainContent;
      if (!elem) return;
      
      if (!document.fullscreenElement) {
        if (elem.requestFullscreen) elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
      }
    },
    handleSeek(originalIdx) {
      if (this.isPlaying) this.pausePlayback();
      this.currentFrameIndex = Math.min(originalIdx, this.totalFrames - 1);
    },
    switchToCharts() {
      this.activeTab = 'charts';
    },
    switchToPositions() {
      this.activeTab = 'positions';
    },
    formatPointName,
    landmarkName
  },
  async mounted() {
    const exerciseId = this.$route.params.exercise_id;
    if (exerciseId) {
      // Primero el movimiento medido por el servicio (docs/DECISIONES_TECNICAS.md,
      // V3): si existe, es la fuente. `?mode=3d` muestra los ángulos 3D
      // (visualización); por defecto, el 2D (medición clínica).
      const movement = await fetchExerciseMovement(exerciseId);
      if (movement) {
        const mode = this.$route.query.mode === '3d' ? '3d' : '2d';
        this.loadJsonData({
          exercise_name: movement.exercise_name,
          frames: framesForMode(movement, mode),
        }, 'service', `${SERVICE_SOURCE_LABEL} · ${angleModeLabel(mode)}`);
        return;
      }

      // Sin movimiento del servicio no hay nada que mostrar: el visor nunca
      // toma datos de la previsualización del navegador.
      this.emptyMessage = `${UNAVAILABLE_LABEL}.`;
    }
  },
  beforeUnmount() {
    this.pausePlayback();
  }
};
</script>

<style scoped>
.viewer-3d-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 12px 16px;
  gap: 12px;
  background-color: transparent;
  box-sizing: border-box;
  /* Escape any parent padding/margin */
  width: 100%;
  margin: 0;
  font-family: 'Open Sans', 'Helvetica Neue', Arial, sans-serif;
}

/* Main 3D Viewport */
.main-content {
  flex: 1;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1; /* Creates isolated stacking context; contains View Cube z-index:10 inside */
  background-color: #2b303b;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.12);
  contain: paint;
  clip-path: inset(0 round 12px);
}

/* Bottom Tab Panel */
.bottom-panel {
  background: white;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-top: 10px;
  flex-shrink: 0;
  overflow: hidden;
}

.tab-bar {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 2px solid #f0f0f0;
  padding: 0 16px;
  background: #fafafa;
  border-radius: 12px 12px 0 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 18px;
  border: none;
  background: transparent;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  font-size: 0.88em;
  font-weight: 600;
  color: #888;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.tab-btn:hover { color: #4BC0C0; }
.tab-btn.active { color: #4BC0C0; border-bottom-color: #4BC0C0; }

.tab-content {
  padding: 16px 20px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.canvas-wrapper {
  flex-grow: 1;
  position: relative;
  overflow: hidden;   /* Clips absolute-positioned controls within the canvas */
  transition: background-color 0.3s;
}

.empty-state {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.3s, color 0.3s;
}

.dark-bg {
  background: #2b303b;
  color: #a0aabf;
}

.light-bg {
  background: #f4f7f6;
  color: #333;
}
</style>
