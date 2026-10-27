<template>
  <!-- En <body>: centrado en la ventana sin depender de los contenedores de la página. -->
  <teleport to="body">
    <transition name="modal">
      <div class="modal-mask" v-if="visible" @click.self="close">
        <div class="modal-wrapper">
          <div class="modal-container">
            <div class="modal-header">
              <div class="header-title-area">
                <h3>Configurador Visual de Ángulos</h3>
                <p class="subtitle">Selecciona los puntos y personaliza sus conexiones adyacentes en tiempo real</p>
              </div>
              <button type="button" class="close-btn" @click="close" aria-label="Cerrar" title="Cerrar">&times;</button>
            </div>

            <div class="modal-body-layout">
              <!-- Columna Izquierda: Esqueleto SVG Interactivo -->
              <div class="column-left">
                <div class="svg-container">
                  <svg viewBox="0 0 100 160" class="skeleton-svg">
                    <!-- Líneas estáticas de fondo (conexiones estándar) -->
                    <line 
                      v-for="(conn, idx) in POSE_CONNECTIONS" 
                      :key="'line-'+idx"
                      :x1="points[conn[0]].x" :y1="points[conn[0]].y"
                      :x2="points[conn[1]].x" :y2="points[conn[1]].y"
                      class="bone-line"
                    />

                    <!-- Líneas de ángulo dinámicas para el punto activo -->
                    <g v-if="activePoint">
                      <!-- Conexión a Izquierdo (Azul) -->
                      <line 
                        v-if="activePoint.left_point_id !== null && points[activePoint.left_point_id]"
                        :x1="points[activePoint.skeleton_point_id].x" :y1="points[activePoint.skeleton_point_id].y"
                        :x2="points[activePoint.left_point_id].x" :y2="points[activePoint.left_point_id].y"
                        class="dynamic-line left-conn-line"
                      />
                      <!-- Conexión a Derecho (Rojo/Naranja) -->
                      <line 
                        v-if="activePoint.right_point_id !== null && points[activePoint.right_point_id]"
                        :x1="points[activePoint.skeleton_point_id].x" :y1="points[activePoint.skeleton_point_id].y"
                        :x2="points[activePoint.right_point_id].x" :y2="points[activePoint.right_point_id].y"
                        class="dynamic-line right-conn-line"
                      />
                    </g>

                    <!-- Círculos de los Puntos -->
                    <circle
                      v-for="(pt, idx) in points"
                      :key="'pt-'+idx"
                      :cx="pt.x" :cy="pt.y"
                      :r="getCircleRadius(idx)"
                      :class="getCircleClass(idx)"
                      @click="handlePointClick(idx)"
                    >
                      <title>{{ getPointName(idx) }}</title>
                    </circle>
                  </svg>
                </div>

                <!-- Mini leyenda de colores -->
                <div class="legend-box" v-if="activePoint">
                  <span class="legend-item"><span class="dot active-dot"></span> Centro</span>
                  <span class="legend-item"><span class="dot left-dot"></span> Izq.</span>
                  <span class="legend-item"><span class="dot right-dot"></span> Der.</span>
                </div>
              </div>

              <!-- Columna Derecha: Panel de Configuración -->
              <div class="column-right">
                <!-- Selector de Pestañas / Puntos Activos -->
                <div class="points-tabs-container">
                  <label class="section-label">Puntos a Rastrear</label>
                  <div class="points-tabs">
                    <button 
                      type="button"
                      v-for="entry in localSelected" 
                      :key="'tab-'+entry.skeleton_point_id"
                      :class="['tab-btn', { 'active': activePointId === entry.skeleton_point_id }]"
                      @click="setActivePoint(entry.skeleton_point_id)"
                    >
                      {{ getPointName(entry.skeleton_point_id) }}
                      <span class="tab-remove" @click.stop="togglePoint(entry.skeleton_point_id)">&times;</span>
                    </button>
                    <span v-if="localSelected.length === 0" class="no-points-placeholder">
                      Haz clic en el esqueleto para añadir puntos
                    </span>
                  </div>
                </div>

                <!-- Detalle de configuración del punto activo -->
                <div class="active-config-panel" v-if="activePoint">
                  <div class="panel-header">
                    <span class="badge">Configurando Ángulo</span>
                    <h4>{{ getPointName(activePoint.skeleton_point_id) }}</h4>
                  </div>

                  <div class="config-cards">
                    <!-- Tarjeta Izquierda -->
                    <div class="config-card left-card">
                      <div class="card-title">
                        <span class="color-indicator left-indicator"></span>
                        Punto Adyacente Izquierdo
                      </div>
                      <select v-model="activePoint.left_point_id" class="styled-select">
                        <option :value="null">— Ninguno / Por defecto —</option>
                        <option 
                          v-for="sp in availablePoints" 
                          :key="'left-'+sp.id" 
                          :value="sp.id"
                        >{{ sp.verbose || sp.label || sp.codename }}</option>
                      </select>
                    </div>

                    <!-- Tarjeta Derecha -->
                    <div class="config-card right-card">
                      <div class="card-title">
                        <span class="color-indicator right-indicator"></span>
                        Punto Adyacente Derecho
                      </div>
                      <select v-model="activePoint.right_point_id" class="styled-select">
                        <option :value="null">— Ninguno / Por defecto —</option>
                        <option 
                          v-for="sp in availablePoints" 
                          :key="'right-'+sp.id" 
                          :value="sp.id"
                        >{{ sp.verbose || sp.label || sp.codename }}</option>
                      </select>
                    </div>
                  </div>

                  <p class="config-tip">
                    <lightbulb-on-outline class="tip-icon" aria-hidden="true" />
                    <span>Las líneas de colores en el esqueleto muestran la articulación actual. Puedes cambiarlas arriba.</span>
                  </p>
                </div>

                <div class="welcome-panel" v-else>
                  <div class="welcome-content">
                    <crosshairs class="icon" aria-hidden="true" />
                    <h4>No hay punto activo</h4>
                    <p>Selecciona un punto en el esqueleto o en la lista de arriba para personalizar su medición de ángulos.</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="close">Cancelar</button>
              <button type="button" class="btn btn-success" @click="confirmSelection">Guardar Configuración</button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { Crosshairs, LightbulbOnOutline } from 'mdue';
import { POSE_CONNECTIONS } from '@/views/signedIn/3d_viewer/utils/constants';

export default {
  name: 'SkeletonSelectorModal',
  components: { Crosshairs, LightbulbOnOutline },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    initialSelected: {
      type: Array,
      default: () => []
    },
    availablePoints: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      localSelected: [], // Array de { skeleton_point_id, left_point_id, right_point_id }
      activePointId: null, // ID del punto seleccionado actualmente para editar
      POSE_CONNECTIONS,
      points: [
        { x: 50, y: 10 }, // 0: nose
        { x: 52, y: 8 },  // 1: left eye inner
        { x: 54, y: 8 },  // 2: left eye
        { x: 56, y: 8 },  // 3: left eye outer
        { x: 48, y: 8 },  // 4: right eye inner
        { x: 46, y: 8 },  // 5: right eye
        { x: 44, y: 8 },  // 6: right eye outer
        { x: 60, y: 10 }, // 7: left ear
        { x: 40, y: 10 }, // 8: right ear
        { x: 53, y: 14 }, // 9: mouth left
        { x: 47, y: 14 }, // 10: mouth right
        { x: 65, y: 30 }, // 11: left shoulder
        { x: 35, y: 30 }, // 12: right shoulder
        { x: 75, y: 55 }, // 13: left elbow
        { x: 25, y: 55 }, // 14: right elbow
        { x: 80, y: 80 }, // 15: left wrist
        { x: 20, y: 80 }, // 16: right wrist
        { x: 83, y: 85 }, // 17: left pinky
        { x: 17, y: 85 }, // 18: right pinky
        { x: 81, y: 87 }, // 19: left index
        { x: 19, y: 87 }, // 20: right index
        { x: 78, y: 84 }, // 21: left thumb
        { x: 22, y: 84 }, // 22: right thumb
        { x: 58, y: 80 }, // 23: left hip
        { x: 42, y: 80 }, // 24: right hip
        { x: 60, y: 110 },// 25: left knee
        { x: 40, y: 110 },// 26: right knee
        { x: 60, y: 140 },// 27: left ankle
        { x: 40, y: 140 },// 28: right ankle
        { x: 62, y: 145 },// 29: left heel
        { x: 38, y: 145 },// 30: right heel
        { x: 56, y: 148 },// 31: left foot index
        { x: 44, y: 148 } // 32: right foot index
      ]
    };
  },
  computed: {
    activePoint() {
      return this.localSelected.find(e => e.skeleton_point_id === this.activePointId) || null;
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.localSelected = this.normalizeInitial(this.initialSelected);
        if (this.localSelected.length > 0) {
          this.activePointId = this.localSelected[0].skeleton_point_id;
        } else {
          this.activePointId = null;
        }
      }
    }
  },
  methods: {
    normalizeInitial(arr) {
      return (arr || []).map(item => {
        if (typeof item === 'number') {
          const defaults = this.getDefaultAdjacents(item);
          return {
            skeleton_point_id: item,
            left_point_id: defaults.left,
            right_point_id: defaults.right
          };
        }
        return {
          skeleton_point_id: item.skeleton_point_id,
          left_point_id: item.left_point_id ?? null,
          right_point_id: item.right_point_id ?? null
        };
      });
    },
    getDefaultAdjacents(pointId) {
      const sp = this.availablePoints.find(p => p.id === pointId);
      return {
        left: sp ? (sp.left_point ?? sp.left_point_id ?? null) : null,
        right: sp ? (sp.right_point ?? sp.right_point_id ?? null) : null
      };
    },
    close() {
      this.$emit('update:visible', false);
    },
    confirmSelection() {
      this.$emit('saved', [...this.localSelected]);
      this.close();
    },
    isSelected(idx) {
      return this.localSelected.some(e => e.skeleton_point_id === idx);
    },
    handlePointClick(idx) {
      // Toggle o seleccionar punto activo
      const isSel = this.isSelected(idx);
      if (!isSel) {
        const defaults = this.getDefaultAdjacents(idx);
        this.localSelected.push({
          skeleton_point_id: idx,
          left_point_id: defaults.left,
          right_point_id: defaults.right
        });
      }
      this.activePointId = idx;
    },
    togglePoint(idx) {
      const pos = this.localSelected.findIndex(e => e.skeleton_point_id === idx);
      if (pos > -1) {
        this.localSelected.splice(pos, 1);
        if (this.activePointId === idx) {
          this.activePointId = this.localSelected.length > 0 ? this.localSelected[0].skeleton_point_id : null;
        }
      }
    },
    setActivePoint(idx) {
      this.activePointId = idx;
    },
    getPointName(idx) {
      const match = this.availablePoints.find(p => p.id === idx || p.value === idx);
      return match ? (match.verbose || match.label) : `Punto ${idx}`;
    },

    // Métodos dinámicos para estilizar los puntos en el SVG
    getCircleRadius(idx) {
      if (this.activePointId === idx) return 4;
      if (this.activePoint && this.activePoint.left_point_id === idx) return 3;
      if (this.activePoint && this.activePoint.right_point_id === idx) return 3;
      if (this.isSelected(idx)) return 3;
      return 1.8;
    },
    getCircleClass(idx) {
      const classes = ['joint-circle'];
      if (this.activePointId === idx) {
        classes.push('active-center');
      } else if (this.activePoint && this.activePoint.left_point_id === idx) {
        classes.push('active-left');
      } else if (this.activePoint && this.activePoint.right_point_id === idx) {
        classes.push('active-right');
      } else if (this.isSelected(idx)) {
        classes.push('selected');
      }
      return classes;
    }
  }
};
</script>

<style scoped>
.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  transition: opacity 0.3s ease;
  align-items: center;
  justify-content: center;
}

/* El wrapper no tenía estilo: en pantallas angostas el modal quedaba corrido
   a la izquierda. Ocupa todo el ancho y centra el contenedor. */
.modal-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
}

.modal-container {
  width: 95%;
  max-width: 820px;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  /* En móviles y tabletas 90vh mide más que la zona visible (la barra del
     navegador la tapa) y el footer quedaba fuera; dvh es la altura visible. */
  max-height: 90dvh;
  font-family: 'Open Sans', sans-serif;
  overflow: hidden;
}

/* Encabezado y footer nunca se encogen: el espacio que falte lo cede el cuerpo. */
.modal-header,
.modal-footer {
  flex-shrink: 0;
}

.modal-header {
  padding: 20px 28px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  background: #f8fafc;
}

.header-title-area h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.3rem;
  font-weight: 700;
}

.header-title-area .subtitle {
  margin: 4px 0 0 0;
  color: #64748b;
  font-size: 0.85rem;
}

.close-btn {
  flex-shrink: 0;
  line-height: 1;
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: #94a3b8;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #475569;
}

/* Layout bidireccional en dos columnas */
.modal-body-layout {
  display: flex;
  flex-direction: row;
  /* Antes height: 520px fijo. Ahora crece hasta 520px y cede lo necesario
     para que el footer siempre quepa (min-height: 0 permite encogerse). */
  flex: 1 1 520px;
  max-height: 520px;
  min-height: 0;
  overflow: hidden;
}

/* Columna Izquierda: Visualización */
.column-left {
  width: 42%;
  border-right: 1px solid #f1f5f9;
  background: #fafbfd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
}

.svg-container {
  width: 100%;
  height: 100%;
  max-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skeleton-svg {
  height: 100%;
  width: auto;
  max-width: 100%;
}

.bone-line {
  stroke: #cbd5e1;
  stroke-width: 0.8;
  stroke-linecap: round;
}

/* Líneas dinámicas de medición de ángulo */
.dynamic-line {
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-dasharray: 3 2;
  animation: dash 1s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}

.left-conn-line {
  stroke: #3b82f6; /* Azul */
}

.right-conn-line {
  stroke: #f97316; /* Naranja */
}

.joint-circle {
  fill: #ffffff;
  stroke: #94a3b8;
  stroke-width: 0.8;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.joint-circle:hover {
  fill: #f1f5f9;
  stroke: #475569;
  r: 3;
}

.joint-circle.selected {
  fill: #0ea5e9;
  stroke: #0284c7;
  stroke-width: 1.5;
}

/* Clases de colores dinámicos del punto activo */
.joint-circle.active-center {
  fill: #10b981; /* Verde */
  stroke: #047857;
  stroke-width: 2;
  filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.6));
}

.joint-circle.active-left {
  fill: #3b82f6; /* Azul */
  stroke: #1d4ed8;
  stroke-width: 2;
  filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.6));
}

.joint-circle.active-right {
  fill: #f97316; /* Naranja */
  stroke: #c2410c;
  stroke-width: 2;
  filter: drop-shadow(0 0 4px rgba(249, 115, 22, 0.6));
}

/* Leyenda de colores */
.legend-box {
  display: flex;
  gap: 12px;
  background: #ffffff;
  padding: 6px 12px;
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  border: 1px solid #e2e8f0;
  margin-top: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.active-dot { background-color: #10b981; }
.left-dot { background-color: #3b82f6; }
.right-dot { background-color: #f97316; }

/* Columna Derecha: Panel de Configuración */
.column-right {
  width: 58%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow-y: auto;
  background: #ffffff;
}

.section-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  display: block;
}

/* Tabs horizontales para los puntos seleccionados */
.points-tabs-container {
  margin-bottom: 24px;
}

.points-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  min-height: 48px;
  align-items: center;
  padding: 8px;
}

.tab-btn {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.tab-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.tab-btn.active {
  background: #0ea5e9;
  color: #ffffff;
  border-color: #0ea5e9;
}

.tab-remove {
  font-weight: bold;
  font-size: 1.1rem;
  opacity: 0.7;
  transition: opacity 0.2s;
  line-height: 1;
}

.tab-remove:hover {
  opacity: 1;
}

.no-points-placeholder {
  color: #94a3b8;
  font-size: 0.85rem;
  font-style: italic;
  padding-left: 8px;
}

/* Panel de Configuración Activa */
.active-config-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-header {
  margin-bottom: 20px;
}

.panel-header h4 {
  margin: 4px 0 0 0;
  font-size: 1.3rem;
  color: #0f172a;
  font-weight: 800;
}

.badge {
  font-size: 0.7rem;
  background: #ecfdf5;
  color: #047857;
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-block;
}

.config-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.25s;
}

.config-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.left-card {
  border-left: 4px solid #3b82f6;
}

.right-card {
  border-left: 4px solid #f97316;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #334155;
  margin-bottom: 12px;
}

.color-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.left-indicator { background-color: #3b82f6; }
.right-indicator { background-color: #f97316; }

.styled-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.styled-select:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
}

.config-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: auto;
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.4;
  background: #f8fafc;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px dashed #e2e8f0;
}

/* Panel de bienvenida / Vacío */
.welcome-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #e2e8f0;
  border-radius: 16px;
  background: #fafbfd;
  padding: 30px;
  text-align: center;
}

.welcome-content .icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
  color: #94a3b8;
}

.tip-icon {
  flex-shrink: 0;
  font-size: 1.2rem;
  color: #f0b54c;
}

.welcome-content h4 {
  margin: 0 0 8px 0;
  color: #334155;
  font-size: 1.05rem;
  font-weight: 700;
}

.welcome-content p {
  margin: 0;
  color: #64748b;
  font-size: 0.85rem;
  line-height: 1.5;
}

/* Footer */
.modal-footer {
  padding: 18px 28px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #f8fafc;
}

.btn {
  /* La regla global .btn (styles/components/_btn.scss) trae height: 100%. */
  height: auto;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-secondary {
  background: #e2e8f0;
  color: #475569;
}

.btn-secondary:hover {
  background: #cbd5e1;
}

.btn-success {
  background: #0ea5e9;
  color: white;
}

.btn-success:hover {
  background: #0284c7;
}

/* Transiciones del Modal */
/* Las columnas incluyen su relleno en el ancho: antes sumaban 100 % + 88 px
   y el esqueleto se montaba sobre "Puntos a rastrear". */
.column-left,
.column-right {
  box-sizing: border-box;
}

/* E7 (docs/DECISIONES_TECNICAS.md): en pantallas angostas (~800 px) una sola columna; el
   cuerpo entero se desplaza y el esqueleto queda arriba con alto fijo. */
@media (max-width: 860px) {
  .modal-header {
    align-items: flex-start;
    gap: 12px;
    padding: 16px 56px 16px 20px;
  }
  /* La X en la esquina superior derecha, fuera del flujo del título. */
  .close-btn {
    position: absolute;
    top: 12px;
    right: 14px;
  }
  .modal-body-layout {
    flex-direction: column;
    flex: 1 1 auto;
    max-height: none;
    overflow-y: auto;
  }
  .column-left {
    width: 100%;
    flex-shrink: 0;
    border-right: none;
    border-bottom: 1px solid #f1f5f9;
    padding: 12px 20px;
  }
  /* El esqueleto usa el ancho disponible, con un tope de alto para que
     quede a la vista la lista de puntos. */
  .svg-container {
    height: auto;
    max-height: none;
  }
  .skeleton-svg {
    width: 100%;
    height: auto;
    max-height: 50vh;
  }
  .column-right {
    width: 100%;
    flex-shrink: 0;
    overflow-y: visible;
    padding: 16px 20px;
  }
}

.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
</style>
