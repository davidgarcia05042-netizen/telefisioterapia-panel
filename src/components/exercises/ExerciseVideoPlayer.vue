<template>
  <div ref="videoContainer" class="player">
    <!--
      E1 (docs/DECISIONES_TECNICAS.md): el video ocupa como máximo ~70 % del alto de la ventana
      y el lienzo de la previsualización se ajusta al video, no al contenedor.
    -->
    <div class="player__stage">
      <!-- Pantalla completa solo con el botón propio: la nativa dejaría fuera el lienzo. -->
      <video
        ref="video"
        class="player__video"
        :src="videoSrc"
        controls
        controlsList="nofullscreen"
        disablePictureInPicture
        crossorigin="anonymous"
        @loadedmetadata="onLoadedMetadata"
        @durationchange="onDurationChange"
        @canplay="onCanPlay"
        @play="onPlay"
        @pause="onPause"
        @ended="onEnded"
        @seeked="onSeeked"
        @dblclick.prevent
      ></video>
      <canvas ref="canvas" class="player__canvas"></canvas>
      <div @click="togglePlayPause" class="player__click-area" title="Pausar / Reanudar"></div>
    </div>
    <!-- Botones apilados sin huecos: los del esqueleto solo existen con la previsualización. -->
    <div class="player__tools">
      <button @click="toggleFullScreen" class="floating-fullscreen-btn"
              :title="isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'"
              :aria-label="isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'">
        <FullscreenExit v-if="isFullscreen" />
        <Fullscreen v-else />
      </button>
      <!-- Esqueleto y conexiones salen de la previsualización en el navegador. -->
      <button v-if="previewEnabled" @click="toggleSkeleton" :class="['floating-skeleton-btn', { active: showSkeleton }]" :title="showSkeleton ? 'Ocultar Esqueleto' : 'Mostrar Esqueleto'">
        <Human />
      </button>
      <button v-if="previewEnabled" @click="toggleAdjacents" :class="['floating-adjacents-btn', { active: showAdjacents }]" :title="showAdjacents ? 'Ocultar Conexiones' : 'Mostrar Conexiones'">
        <RunFast />
      </button>
      <!--
        E2: el botón de modo mostraba el icono "Square" (un cuadro gris que
        parecía roto). Ahora dice el modo al que cambia.
      -->
      <button @click="toggleAngleMode" :class="['floating-mode-btn', { active: angleMode === '3d' }]"
              :title="`Cambiar a ${otherModeLabel}`" :aria-label="`Cambiar a ${otherModeLabel}`">
        {{ angleMode === '3d' ? '2D' : '3D' }}
      </button>
    </div>

    <!-- Indicador del conjunto de ángulos que se muestra -->
    <div class="video-mode-indicator">
      <span>{{ capitalize(angleModeLabel(angleMode)) }}</span>
    </div>
  </div>
</template>

<script>
import { Fullscreen, FullscreenExit, Human, RunFast } from 'mdue';
import PoseLandmarkerService from '@/services/poseLandmarkerService';
import { angleModeLabel } from '@/services/serverMovementService';

export default {
  name: 'ExerciseVideoPlayer',
  components: { Fullscreen, FullscreenExit, Human, RunFast },
  props: {
    videoSrc: { type: String, required: true },
    trackedPoints: { type: Array, required: true, default: () => [] },
    angleMode: { type: String, required: true, default: '3d' },
    // E6: el mismo modelo que usa el servicio.
    mediaPipeModel: { type: String, required: false, default: 'heavy' },
    // Previsualización en el navegador: sin ella el video se reproduce sin
    // cargar MediaPipe ni dibujar el esqueleto.
    previewEnabled: { type: Boolean, default: true }
  },
  emits: ['update:angleMode', 'metadata-loaded', 'progress-update', 'model-changing'],
  data() {
    return {
      showSkeleton: true,
      showAdjacents: false,
      isFullscreen: false
    };
  },
  computed: {
    otherModeLabel() {
      return angleModeLabel(this.angleMode === '3d' ? '2d' : '3d');
    }
  },
  async mounted() {
    this._onFullscreenChange = () => {
      this.isFullscreen = document.fullscreenElement === this.$refs.videoContainer;
    };
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
    if (this.previewEnabled) await this._startPreview();
  },
  beforeUnmount() {
    document.removeEventListener('fullscreenchange', this._onFullscreenChange);
    this.detectionActive = false;
    this.poseService?.destroy();
  },
  watch: {
    angleMode(newMode) {
      this.poseService?.setAngleMode(newMode);
    },
    async previewEnabled(enabled) {
      if (enabled) {
        await this._startPreview();
        return;
      }
      this.stopDetection();
      this.poseService?.destroy();
      this.poseService = null;
      const canvas = this.$refs.canvas;
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    },
    async mediaPipeModel(newModel) {
      if (this.poseService) {
        const wasActive = this.detectionActive;
        this.stopDetection();
        this.$emit('model-changing', true);
        
        // Darle un respiro al DOM para que actualice la UI antes del bloqueo intenso de WebAssembly/GPU
        await new Promise(resolve => setTimeout(resolve, 50));
        
        await this.poseService.initialize(newModel);
        
        this.$emit('model-changing', false);
        if (wasActive) {
          this.startDetection();
        } else {
          this.detectSingleFrame();
        }
      }
    }
  },
  methods: {
    async _startPreview() {
      if (!this.poseService) {
        this.poseService = new PoseLandmarkerService();
        this.poseService.setAngleMode(this.angleMode);
      }
      await this.poseService.initialize(this.mediaPipeModel);
      // Si se desactivó mientras cargaba el modelo, no dibujar.
      if (this.previewEnabled) this.detectSingleFrame();
    },

    // ─── Eventos del Video ──────────────────────────────────────────────
    onLoadedMetadata(e) {
      this.$emit('metadata-loaded', e.target.duration);
    },
    onDurationChange(e) {
      this.$emit('metadata-loaded', e.target.duration);
    },
    onCanPlay(e) {
      this.$emit('metadata-loaded', e.target.duration);
    },
    onPlay() {
      this.startDetection();
    },
    onPause() {
      this.stopDetection();
    },
    onEnded() {
      this.stopDetection();
    },
    onSeeked() {
      this.detectSingleFrame();
    },

    // ─── Controles ──────────────────────────────────────────────────────
    togglePlayPause() {
      const video = this.$refs.video;
      if (!video) return;
      video.paused ? video.play() : video.pause();
    },
    toggleFullScreen() {
      const elem = this.$refs.videoContainer;
      if (!elem) return;
      if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => console.error('Error pantalla completa:', err));
      } else {
        document.exitFullscreen();
      }
    },
    toggleSkeleton() {
      this.showSkeleton = !this.showSkeleton;
      const canvas = this.$refs.canvas;
      const video = this.$refs.video;

      if (!this.showSkeleton) {
        this.stopDetection();
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        if (video) {
          if (!video.paused && !video.ended) {
            this.startDetection();
          } else {
            this.detectSingleFrame();
          }
        }
      }
    },
    toggleAdjacents() {
      this.showAdjacents = !this.showAdjacents;
      if (this.showAdjacents && !this.showSkeleton) {
        this.showSkeleton = true;
      }
      const video = this.$refs.video;
      if (video) {
        if (!video.paused && !video.ended) {
          if (!this.detectionActive) {
            this.startDetection();
          }
        } else {
          this.detectSingleFrame();
        }
      }
    },
    toggleAngleMode() {
      const newMode = this.angleMode === '3d' ? '2d' : '3d';
      this.$emit('update:angleMode', newMode);
      
      this.$nextTick(() => {
        const video = this.$refs.video;
        if (video) {
          if (!video.paused && !video.ended) {
            if (!this.detectionActive) {
              this.startDetection();
            }
          } else {
            this.detectSingleFrame();
          }
        }
      });
    },

    // ─── Detección MediaPipe Foreground ─────────────────────────────────
    startDetection() {
      if (!this.showSkeleton) return;
      const video = this.$refs.video;
      const canvas = this.$refs.canvas;
      if (!video || !canvas || !this.poseService) return;
      if (this.detectionActive) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      this.poseService.createDrawingUtils(canvas.getContext('2d'));
      this.detectionActive = true;

      const processFrame = async () => {
        if (!this.detectionActive || !video || video.paused || video.ended) {
          this.detectionActive = false;
          return;
        }
        try {
          const timestamp = performance.now();
          await this.poseService.detectForVideo(
            video, canvas, timestamp, this.trackedPoints, null, this.showAdjacents
          );
        } catch (e) {
          console.error('Error en renderLoop:', e);
          import('../../services/mediaPipeProvider').then(({ default: provider }) => {
            provider.destroy();
          });
          this.stopDetection();
        }
        if (!this.detectionActive) return;
        
        if (video.requestVideoFrameCallback) {
          video.requestVideoFrameCallback(processFrame);
        } else {
          requestAnimationFrame(processFrame);
        }
      };

      if (video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(processFrame);
      } else {
        requestAnimationFrame(processFrame);
      }
    },
    stopDetection() {
      this.detectionActive = false;
    },
    detectSingleFrame() {
      if (!this.showSkeleton) return;
      const video = this.$refs.video;
      if (!video) return;
      if (video.paused) {
        this._runSingleFrameDetection();
      } else {
        this.startDetection();
      }
    },
    async _runSingleFrameDetection() {
      const video = this.$refs.video;
      const canvas = this.$refs.canvas;
      if (!video || !canvas || !this.poseService) return;
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        this.poseService.createDrawingUtils(canvas.getContext('2d'));
        await this.poseService.detectForVideo(
          video, canvas, performance.now(), this.trackedPoints, null, this.showAdjacents
        );
      } catch (e) {
        console.error('Error en _runSingleFrameDetection:', e);
      }
    },
    
    // Método público para obtener el duration si se necesita por ref
    getDuration() {
      return this.$refs.video?.duration || 0;
    },

    angleModeLabel,

    capitalize(text) {
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
  }
}
</script>

<style scoped lang="scss">
.player {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}
// El escenario mide lo mismo que el video, así el lienzo queda encima exacto.
.player__stage {
  position: relative;
  display: inline-block;
  max-width: 100%;
  line-height: 0;
}
.player__video {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  width: auto;
  height: auto;
  z-index: 1;
}
.player:fullscreen {
  border-radius: 0;
  .player__video { max-height: 100vh; }
}
.player__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}
// Deja libre la franja de los controles nativos del video.
.player__click-area {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(100% - 60px);
  z-index: 5;
  cursor: pointer;
}

.player__tools {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  > button { position: static; }
}

.floating-fullscreen-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.4);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: rgba(0, 0, 0, 0.8);
    transform: scale(1.05);
  }

  svg { font-size: 30px; }
}

.floating-skeleton-btn {
  position: absolute;
  top: 70px;
  right: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.5);
  border: none;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &.active {
    background-color: rgba(75, 192, 192, 0.8);
    color: white;
    &:hover { background-color: rgba(75, 192, 192, 1); }
  }

  &:not(.active):hover {
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    transform: scale(1.05);
  }

  svg { font-size: 30px; }
}

.floating-adjacents-btn {
  position: absolute;
  top: 120px;
  right: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.5);
  border: none;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &.active {
    background-color: rgba(59, 130, 246, 0.8);
    color: white;
    &:hover { background-color: rgba(59, 130, 246, 1); }
  }

  &:not(.active):hover {
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    transform: scale(1.05);
  }

  svg { font-size: 30px; }
}

.floating-mode-btn {
  position: absolute;
  top: 170px;
  right: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.5);
  border: none;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &.active {
    background-color: rgba(16, 185, 129, 0.8);
    color: white;
    &:hover { background-color: rgba(16, 185, 129, 1); }
  }

  &:not(.active):hover {
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    transform: scale(1.05);
  }

  min-width: 46px;
  height: 46px;
  color: white;
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}

.video-mode-indicator {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  background-color: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  pointer-events: none;
  font-family: 'Open Sans', sans-serif;
  letter-spacing: 0.02em;
}
</style>
