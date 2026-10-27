<template>
  <div style="position: relative; width: 100%; height: 100%;">
    <div ref="canvasContainer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
    <div v-if="errorMsg" style="position: absolute; top: 10px; left: 10px; color: red; background: white; padding: 10px; z-index: 100; max-width: 80%; border-radius: 8px;">
      <strong>Error 3D:</strong> {{ errorMsg }}
    </div>

    <!-- View Cube (Estilo AutoCAD) -->
    <div class="view-cube-wrapper">
      <div class="view-cube" :style="{ transform: cubeTransform }">
        <div class="cube-face front" @click="setCameraView('front')">Frente</div>
        <div class="cube-face back" @click="setCameraView('back')">Atrás</div>
        <div class="cube-face right" @click="setCameraView('right')">Der</div>
        <div class="cube-face left" @click="setCameraView('left')">Izq</div>
        <div class="cube-face top" @click="setCameraView('top')">Arriba</div>
        <div class="cube-face bottom" @click="setCameraView('bottom')">Abajo</div>
      </div>
      <button class="home-btn" @click="setCameraView('home')" title="Vista Inicial">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </button>
      
      <!-- Botones de Herramientas -->
      <div class="tool-buttons">
        <button class="tool-btn" :class="{ active: showAllPoints }" @click="$emit('toggle-points')" title="Mostrar esqueleto completo">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </button>
        <button class="tool-btn" :class="{ active: isDarkMode }" @click="$emit('toggle-theme')" title="Modo oscuro (Fondo)">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        </button>
        <button class="tool-btn" :class="{ active: showAxes }" @click="$emit('toggle-axes')" title="Mostrar ejes (X, Y, Z)">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="20" x2="20" y2="20"></line><line x1="4" y1="20" x2="4" y2="4"></line><line x1="4" y1="20" x2="16" y2="8"></line></svg>
        </button>
        <button class="tool-btn" @click="$emit('toggle-fullscreen')" title="Pantalla completa">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { POSE_CONNECTIONS, CAMERA_OFFSETS } from '../utils/constants';

export default {
  name: 'Skeleton3D',
  props: {
    currentFrame: Object,
    trackedIndices: Array,
    showAllPoints: {
      type: Boolean,
      default: true
    },
    isDarkMode: {
      type: Boolean,
      default: true
    },
    showAxes: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      errorMsg: null,
      cubeTransform: 'rotateX(0deg) rotateY(0deg)'
    };
  },
  watch: {
    isDarkMode() {
      this.updateTheme();
    },
    currentFrame: {
      deep: true,
      handler() {
        this.updateSkeleton();
      }
    },
    showAllPoints() {
      this.updateSkeleton();
    },
    showAxes(val) {
      if (this.axesHelper) this.axesHelper.visible = val;
    }
  },
  mounted() {
    // Initialize non-reactive Three.js objects directly on the instance to avoid Vue Proxy interference
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.spheres = [];
    this.lines = [];
    this.gridHelper = null;
    this.axesHelper = null;
    this.resizeObserver = null;

    setTimeout(() => {
      this.initThree();
      this.updateSkeleton();
    }, 100);
  },
  beforeUnmount() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.renderer) {
      this.renderer.dispose();
      try {
        this.$refs.canvasContainer.removeChild(this.renderer.domElement);
      } catch(e) {
        console.warn('Could not remove canvas:', e);
      }
    }
  },
  methods: {
    updateTheme() {
      if (!this.scene) return;
      
      const bgColor = this.isDarkMode ? '#2b303b' : '#f4f7f6';
      this.scene.background = new THREE.Color(bgColor);
      
      if (this.gridHelper) {
        this.scene.remove(this.gridHelper);
      }
      
      const gridColor1 = this.isDarkMode ? 0x555c67 : 0xbbbbbb;
      const gridColor2 = this.isDarkMode ? 0x3d4351 : 0xe0e0e0;
      
      this.gridHelper = new THREE.GridHelper(10, 20, gridColor1, gridColor2);
      this.gridHelper.position.set(0, -1.6, 0);
      this.scene.add(this.gridHelper);
    },
    initThree() {
      try {
        const container = this.$refs.canvasContainer;
        if (!container) return;
        
        let width = container.clientWidth || 800;
        let height = container.clientHeight || 600;
        
        this.scene = new THREE.Scene();
        this.updateTheme(); // Configura fondo y cuadrícula según el modo
        
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.z = 3;
        this.camera.lookAt(0, 0, 0); 
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio || 1);
        container.appendChild(this.renderer.domElement);
        
        // Iluminación Profesional
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x666666, 1.2);
        hemiLight.position.set(0, 5, 0);
        this.scene.add(hemiLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(3, 5, 5);
        this.scene.add(dirLight);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        // Ejes de coordenadas (X=Rojo, Y=Verde, Z=Azul)
        this.axesHelper = new THREE.AxesHelper(3);
        this.axesHelper.position.set(0, -1.58, 0); // Ligeramente por encima de la cuadrícula
        this.axesHelper.visible = this.showAxes;
        this.scene.add(this.axesHelper);
        
        try {
          this.controls = new OrbitControls(this.camera, this.renderer.domElement);
          this.controls.enableDamping = true;
          this.controls.dampingFactor = 0.05;
          
          // Set initial camera view
          this.setCameraView('home');
        } catch(e) {
          console.error("OrbitControls failed", e);
        }

        const geometry = new THREE.SphereGeometry(1, 16, 16);
        for (let i = 0; i < 33; i++) {
          const material = new THREE.MeshStandardMaterial({ color: '#aaaaaa' });
          const sphere = new THREE.Mesh(geometry, material);
          sphere.visible = false; 
          this.scene.add(sphere);
          this.spheres.push(sphere);
        }
        

        
        for (const connection of POSE_CONNECTIONS) {
          const limbGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 8); // Base length 1
          const limbMat = new THREE.MeshStandardMaterial({ color: '#888888' }); // Gray limbs
          const limb = new THREE.Mesh(limbGeo, limbMat);
          limb.visible = false;
          this.scene.add(limb);
          
          this.lines.push({ mesh: limb, indices: connection });
        }
        
        this.resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
            this.onResize(entry.contentRect.width, entry.contentRect.height);
          }
        });
        this.resizeObserver.observe(container);
        
        this.animate();
      } catch (err) {
        this.errorMsg = err.message || err.toString();
        console.error("ThreeJS Init Error:", err);
      }
    },
    updateSkeleton() {
      try {
        if (!this.currentFrame || !this.currentFrame.points || !this.spheres.length) return;
        
        const pts = this.currentFrame.points;
        for (let i = 0; i < 33; i++) {
          const sphere = this.spheres[i];
          // Handle both Array (new format) and Object dictionary (old cached format)
          const pointData = pts[i] || pts[i.toString()]; 
          
          if (pointData && this.shouldShowPoint(i)) {
            sphere.visible = true;
            sphere.position.set((pointData[0] - 0.5) * 3, -(pointData[1] - 0.5) * 3, -pointData[2] * 3);
            
            const isTracked = this.trackedIndices && this.trackedIndices.includes(i);
            sphere.material.color.set(isTracked ? '#FF3366' : '#4BC0C0');
            sphere.scale.setScalar(0.06); // Todos del mismo tamaño
          } else {
            sphere.visible = false;
          }
        }

        const up = new THREE.Vector3(0, 1, 0);

        for (let i = 0; i < this.lines.length; i++) {
          const lineData = this.lines[i];
          const idx1 = lineData.indices[0];
          const idx2 = lineData.indices[1];
          if (this.spheres[idx1].visible && this.spheres[idx2].visible) {
            lineData.mesh.visible = true;
            
            const p1 = this.spheres[idx1].position;
            const p2 = this.spheres[idx2].position;
            
            const distance = p1.distanceTo(p2);
            lineData.mesh.position.copy(p1).lerp(p2, 0.5);
            lineData.mesh.scale.set(1, distance, 1);
            
            // Orient cylinder to connect p1 and p2
            const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
            lineData.mesh.quaternion.setFromUnitVectors(up, dir);
          } else {
            lineData.mesh.visible = false;
          }
        }
      } catch (err) {
        this.errorMsg = "Update error: " + (err.message || err.toString());
      }
    },
    shouldShowPoint(index) {
      if (this.showAllPoints) return true;
      return this.trackedIndices && this.trackedIndices.includes(index);
    },
    onResize(width, height) {
      if (!this.camera || !this.renderer) return;
      if (width === 0 || height === 0) return;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    },
    animate() {
      if (!this.renderer || !this.scene || !this.camera) return;
      this.animationFrameId = requestAnimationFrame(() => this.animate());
      
      if (this.controls) this.controls.update();
      this.updateCube();
      
      this.renderer.render(this.scene, this.camera);
    },
    updateCube() {
      if (!this.camera || !this.controls) return;
      // Calculate spherical coordinates relative to the target
      const target = this.controls.target;
      const x = this.camera.position.x - target.x;
      const y = this.camera.position.y - target.y;
      const z = this.camera.position.z - target.z;
      
      const rotY = Math.atan2(x, z);
      const rotX = Math.atan2(y, Math.sqrt(x*x + z*z));
      
      // Sync the CSS 3D Cube rotation
      this.cubeTransform = `rotateX(${rotX}rad) rotateY(${-rotY}rad)`;
    },
    setCameraView(viewType) {
      if (!this.camera || !this.controls) return;
      
      // Calculate skeleton centroid
      let target = new THREE.Vector3(0, 0, 0);
      let visibleSpheres = 0;
      
      if (this.spheres && this.spheres.length > 0) {
        for (let sphere of this.spheres) {
          if (sphere && sphere.visible) {
            target.add(sphere.position);
            visibleSpheres++;
          }
        }
      }
      
      if (visibleSpheres > 0) {
        target.divideScalar(visibleSpheres);
      } else {
        // Fallback if no skeleton visible
        target.set(0, -0.5, 0);
      }
      
      switch(viewType) {
        case 'home':
          this.camera.position.set(
            target.x + CAMERA_OFFSETS.HOME.x, 
            target.y + CAMERA_OFFSETS.HOME.y, 
            target.z + CAMERA_OFFSETS.HOME.z
          ); 
          break;
        case 'front':
          this.camera.position.set(target.x, target.y, target.z + CAMERA_OFFSETS.CARDINAL); 
          break;
        case 'back':
          this.camera.position.set(target.x, target.y, target.z - CAMERA_OFFSETS.CARDINAL); 
          break;
        case 'right':
          this.camera.position.set(target.x + CAMERA_OFFSETS.CARDINAL, target.y, target.z); 
          break;
        case 'left':
          this.camera.position.set(target.x - CAMERA_OFFSETS.CARDINAL, target.y, target.z); 
          break;
        case 'top':
          this.camera.position.set(target.x, target.y + CAMERA_OFFSETS.CARDINAL, target.z + 0.01); 
          break;
        case 'bottom':
          this.camera.position.set(target.x, target.y - CAMERA_OFFSETS.CARDINAL, target.z + 0.01); 
          break;
      }
      
      this.camera.lookAt(target);
      this.controls.target.copy(target);
      this.controls.update();
    }
  }
};
</script>

<style scoped>
.view-cube-wrapper {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  perspective: 400px;
  z-index: 10;
}

.view-cube {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.05s linear;
}

.cube-face {
  position: absolute;
  width: 60px;
  height: 60px;
  background: rgba(220, 230, 240, 0.85);
  border: 2px solid #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #333;
  cursor: pointer;
  user-select: none;
  box-shadow: inset 0 0 8px rgba(0,0,0,0.1);
  transition: background 0.2s;
}

.cube-face:hover { background: #4BC0C0; color: white; }

.front  { transform: rotateY(  0deg) translateZ(30px); }
.right  { transform: rotateY( 90deg) translateZ(30px); }
.back   { transform: rotateY(180deg) translateZ(30px); }
.left   { transform: rotateY(-90deg) translateZ(30px); }
.top    { transform: rotateX( 90deg) translateZ(30px); }
.bottom { transform: rotateX(-90deg) translateZ(30px); }

.home-btn {
  position: absolute;
  top: 90px;
  right: 0;
  width: 28px;
  height: 28px;
  background: rgba(220, 230, 240, 0.85);
  border: 2px solid #fff;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: #555;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.2s;
}

.home-btn:hover { background: #4BC0C0; color: white; }

.tool-buttons {
  position: absolute;
  top: 145px;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-btn {
  width: 28px;
  height: 28px;
  background: rgba(220, 230, 240, 0.85);
  border: 2px solid #fff;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: #555;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.2s;
}

.tool-btn:hover { background: #e0e6ed; }
.tool-btn.active { background: #4BC0C0; color: white; border-color: #4BC0C0; }
</style>
