# Manual Técnico — Plataforma de Telerehabilitación (Frontend Administrativo)

> **Versión:** 1.0  
> **Fecha:** Agosto 2026  
> **Audiencia:** Desarrolladores y equipo técnico

---

## Tabla de Contenidos

1. [Descripción General del Sistema](#1-descripción-general-del-sistema)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Estructura del Proyecto](#4-estructura-del-proyecto)
5. [Instalación y Configuración](#5-instalación-y-configuración)
6. [Módulos Principales](#6-módulos-principales)
   - 6.1 [Sistema de Autenticación y Autorización](#61-sistema-de-autenticación-y-autorización)
   - 6.2 [Motor de Análisis de Movimiento (MediaPipe)](#62-motor-de-análisis-de-movimiento-mediapipe)
   - 6.3 [Sistema de Persistencia Local (IndexedDB)](#63-sistema-de-persistencia-local-indexeddb)
   - 6.4 [Servicio de Exportación de Datos](#64-servicio-de-exportación-de-datos)
   - 6.5 [Visor 3D (Three.js)](#65-visor-3d-threejs)
7. [Flujos de Datos Principales](#7-flujos-de-datos-principales)
8. [Decisiones de Arquitectura](#8-decisiones-de-arquitectura)
9. [Optimizaciones de Rendimiento](#9-optimizaciones-de-rendimiento)
10. [API Backend](#10-api-backend)
11. [Despliegue](#11-despliegue)

---

## 1. Descripción General del Sistema

El **telerehabilitation_admin** es una aplicación web SPA (Single Page Application) que funciona como panel administrativo para una plataforma de telerehabilitación. Integra capacidades de inteligencia artificial en el navegador para analizar videos de ejercicios de rehabilitación, detectar la postura del paciente y calcular métricas biomecánicas.

### Diagrama de alto nivel

```
┌─────────────────────────────────────────────────────────────┐
│                      NAVEGADOR (Cliente)                     │
│                                                             │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │  Vue 3   │   │  MediaPipe   │   │   IndexedDB      │    │
│  │  SPA     │──▶│  Pose WASM   │──▶│   (Persistencia)  │    │
│  │          │   │  + WebGL/GPU │   │                    │    │
│  └──────────┘   └──────────────┘   └──────────────────┘    │
│       │                                      │              │
│       │ HTTP/REST                             │ localStorage │
│       ▼                                      ▼              │
│  ┌──────────┐                        ┌──────────────┐       │
│  │  API     │                        │ Preferencias │       │
│  │  Backend │                        │ del usuario  │       │
│  └──────────┘                        └──────────────┘       │
│       │                                                     │
└───────│─────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────┐
│  Django REST     │
│  Framework API   │
│  + PostgreSQL    │
│  + Firebase      │
│  Storage (videos)│
└──────────────────┘
```

---

## 2. Stack Tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| **Vue.js** | 3.x | Framework frontend reactivo (Options API) |
| **Vue Router** | 4.x | Enrutamiento SPA con guards de autenticación |
| **Vue CLI** | 4.5 | Toolchain de build (Webpack) |
| **MediaPipe Tasks Vision** | 0.10.32+ | Detección de pose (PoseLandmarker) en el navegador |
| **Chart.js** | 3.9+ | Gráficas interactivas de datos biomecánicos |
| **Three.js** | 0.184+ | Visor 3D del esqueleto |
| **Firebase** | 12.4+ | Almacenamiento de videos (Firebase Storage) |
| **Sass/SCSS** | 1.28+ | Preprocesador CSS |
| **IndexedDB** | Nativo | Persistencia local de datos de análisis |
| **mdue** | 0.1.2 | Iconos Material Design para Vue |

---

## 3. Arquitectura del Sistema

### 3.1 Patrón de Arquitectura

La aplicación sigue una arquitectura de **Servicios + Componentes**:

```
┌─────────────────────────────────────────────────────┐
│                    VISTA (Vue Components)             │
│                                                       │
│  ┌────────────────┐  ┌──────────────────────────┐    │
│  │  Views (Pages)  │  │  Components (Reutiliz.)   │    │
│  │  ├ login.vue    │  │  ├ ExerciseVideoPlayer    │    │
│  │  ├ exercises/   │  │  ├ ExerciseAnalysisPanel  │    │
│  │  ├ therapies/   │  │  ├ ExerciseCharts         │    │
│  │  ├ routines/    │  │  ├ SkeletonSelectorModal  │    │
│  │  └ patients/    │  │  ├ sidebar, navbar, table │    │
│  └────────────────┘  └──────────────────────────┘    │
│           │                     │                     │
│           ▼                     ▼                     │
│  ┌──────────────────────────────────────────────┐    │
│  │              SERVICIOS (Lógica de Negocio)     │    │
│  │  ├ backgroundAnalysisService.js (Singleton)    │    │
│  │  ├ poseLandmarkerService.js                    │    │
│  │  ├ mediaPipeProvider.js (Singleton)             │    │
│  │  ├ movementHistoryService.js                   │    │
│  │  ├ exerciseChartService.js                     │    │
│  │  ├ exerciseExportService.js                    │    │
│  │  ├ exerciseApiService.js                       │    │
│  │  ├ dbService.js (IndexedDB)                    │    │
│  │  └ metricsService.js                           │    │
│  └──────────────────────────────────────────────┘    │
│           │                                           │
│           ▼                                           │
│  ┌──────────────────────────────────────────────┐    │
│  │          UTILIDADES / LIBRERÍAS               │    │
│  │  ├ geometryUtils.js (cálculos 3D)             │    │
│  │  ├ lib/http.js (cliente HTTP)                  │    │
│  │  └ lib/storage.js (wrapper localStorage)       │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 3.2 Principios de Diseño

- **Responsabilidad Única:** Cada servicio tiene una responsabilidad claramente definida.
- **Singleton para recursos pesados:** `mediaPipeProvider` y `backgroundAnalysisService` son singletons para evitar duplicación de instancias de WebAssembly/GPU.
- **Procesamiento en segundo plano:** El análisis de video se ejecuta independientemente de la UI, usando un `<video>` oculto.
- **Persistencia local:** Los resultados de análisis se almacenan en IndexedDB, permitiendo reanudar tras recarga de página.

---

## 4. Estructura del Proyecto

```
telerehabilitation_admin/
├── public/                      # Archivos estáticos
│   └── index.html
├── src/
│   ├── main.js                  # Punto de entrada de la aplicación
│   ├── App.vue                  # Componente raíz
│   ├── assets/                  # Imágenes y recursos estáticos
│   │   └── login.jpg
│   ├── components/              # Componentes reutilizables
│   │   ├── exercises/
│   │   │   ├── ExerciseVideoPlayer.vue   # Reproductor con detección de pose
│   │   │   ├── ExerciseAnalysisPanel.vue # Panel de control del análisis
│   │   │   └── ExerciseCharts.vue        # Gráficas de datos
│   │   ├── SkeletonSelectorModal.vue     # Selector interactivo de esqueleto
│   │   ├── sidebar.vue                   # Barra lateral de navegación
│   │   ├── navbar.vue                    # Barra superior
│   │   ├── table.vue                     # Tabla genérica reutilizable
│   │   └── listModel.vue                # Modelo de lista genérica
│   ├── lib/                     # Librerías utilitarias
│   │   ├── http.js              # Cliente HTTP (wrapper de fetch)
│   │   └── storage.js           # Wrapper de localStorage
│   ├── router/
│   │   └── index.js             # Definición de rutas y guards
│   ├── services/                # Servicios de lógica de negocio
│   │   ├── backgroundAnalysisService.js  # Motor de análisis en segundo plano
│   │   ├── poseLandmarkerService.js      # Interfaz con MediaPipe PoseLandmarker
│   │   ├── mediaPipeProvider.js          # Singleton proveedor de MediaPipe
│   │   ├── movementHistoryService.js     # Gestión del historial de frames
│   │   ├── dbService.js                  # Operaciones CRUD IndexedDB
│   │   ├── exerciseApiService.js         # Comunicación con API REST
│   │   ├── exerciseChartService.js       # Generación de gráficas Chart.js
│   │   ├── exerciseExportService.js      # Exportación CSV/JSON
│   │   ├── exerciseService.js            # Lógica de ejercicios
│   │   └── metricsService.js             # Cálculo de métricas biomecánicas
│   ├── styles/                  # Hojas de estilo SCSS
│   ├── utils/                   # Utilidades
│   │   └── geometryUtils.js     # Cálculos de ángulos 2D/3D
│   └── views/                   # Páginas (vistas)
│       ├── login.vue
│       └── signedIn/
│           ├── signedIn.vue     # Layout principal autenticado
│           ├── home.vue         # Dashboard
│           ├── profile.vue      # Perfil de usuario
│           ├── change-password.vue
│           ├── therapies/       # CRUD de terapias
│           ├── routines/        # CRUD de rutinas
│           ├── exercises/       # CRUD de ejercicios + análisis
│           ├── 3d_viewer/       # Visor tridimensional
│           ├── my-patients/     # Pacientes del terapeuta
│           ├── therapists/      # Gestión de terapeutas (Admin)
│           ├── patients/        # Gestión de pacientes (Admin)
│           └── admins/          # Gestión de admins (Admin)
├── docs/                        # Documentación
├── package.json
├── babel.config.js
├── vue.config.js
└── .env                         # Variables de entorno
```

---

## 5. Instalación y Configuración

### 5.1 Prerrequisitos

- **Node.js** 16+ (recomendado 18+)
- **npm** 8+
- Acceso a la API backend (Django REST Framework)
- Credenciales de Firebase (para almacenamiento de videos)

### 5.2 Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd telerehabilitation_admin

# Instalar dependencias
npm install
```

### 5.3 Configuración de variables de entorno

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
VUE_APP_API_URL=http://localhost:8000/api
VUE_APP_FIREBASE_API_KEY=<tu-api-key>
VUE_APP_FIREBASE_AUTH_DOMAIN=<tu-auth-domain>
VUE_APP_FIREBASE_PROJECT_ID=<tu-project-id>
VUE_APP_FIREBASE_STORAGE_BUCKET=<tu-storage-bucket>
VUE_APP_FIREBASE_MESSAGING_SENDER_ID=<tu-sender-id>
VUE_APP_FIREBASE_APP_ID=<tu-app-id>
```

### 5.4 Ejecución en desarrollo

```bash
npm run serve
```

La aplicación estará disponible en `http://localhost:8080/`.

### 5.5 Build de producción

```bash
npm run build
```

Los archivos compilados se generan en el directorio `dist/`.

---

## 6. Módulos Principales

### 6.1 Sistema de Autenticación y Autorización

**Archivos:** `views/login.vue`, `router/index.js`, `lib/http.js`, `lib/storage.js`

#### Flujo de autenticación

```
┌──────────┐     POST /auth/users/login/    ┌──────────┐
│  Login   │ ──────────────────────────────▶ │  API     │
│  Form    │                                 │  Django  │
│          │ ◀────────────────────────────── │          │
└──────────┘  { access_token, user, groups } └──────────┘
      │
      ▼
┌──────────────────┐
│ localStorage     │
│  ├ access_token  │
│  ├ user          │
│  ├ groups        │
│  └ permissions   │
└──────────────────┘
```

#### Guards de ruta

El router implementa guards de navegación globales en `beforeEach`:

```javascript
// Verifica autenticación
if (to.meta.requiresAuth) {
  if (!localStorage.getItem("access_token")) {
    next({ name: "login" }); // Redirige a login
  }
}

// Verifica rol de terapeuta
if (to.meta.requestTherapist) {
  if (!groups.includes("Therapist")) {
    next({ path: "/" }); // Redirige a home
  }
}

// Verifica rol de administrador
if (to.meta.requestAdmin) {
  if (!groups.includes("Admin")) {
    next({ path: "/" }); // Redirige a home
  }
}
```

#### Roles del sistema

| Rol | Código | Permisos |
|---|---|---|
| Terapeuta | `Therapist` | Terapias, Rutinas, Ejercicios, Mis Pacientes |
| Administrador | `Admin` | Todo lo anterior + Gestión de Terapeutas, Pacientes, Administradores |

---

### 6.2 Motor de Análisis de Movimiento (MediaPipe)

**Archivos principales:**
- `services/backgroundAnalysisService.js` — Motor de análisis en segundo plano
- `services/poseLandmarkerService.js` — Interfaz con PoseLandmarker
- `services/mediaPipeProvider.js` — Singleton proveedor de instancias MediaPipe
- `components/exercises/ExerciseVideoPlayer.vue` — Detección en tiempo real

#### Arquitectura del motor de análisis

```
┌─────────────────────────────────────────────────────────────┐
│            BackgroundAnalysisService (Singleton)              │
│                                                               │
│  ┌─────────┐    seeked     ┌───────────────┐   addFrame()    │
│  │ <video> │ ──────────▶  │ _processSeek  │ ──────────▶     │
│  │ oculto  │              │   Frame()     │                   │
│  │ pausado │ ◀────────── │               │    ┌──────────┐  │
│  └─────────┘   currentTime│               │──▶│ Movement │  │
│       ▲        = next     └───────────────┘   │ History  │  │
│       │                         │              │ Service  │  │
│  _seekToNextFrame()             │              └──────────┘  │
│       ▲                         ▼                     │       │
│       │                   MediaPipe                   │       │
│       │                   PoseLandmarker              │       │
│       │                   detectForVideo()            │       │
│       │                         │                     ▼       │
│  ┌────────────┐                 │              ┌──────────┐  │
│  │ Message    │                 │              │ IndexedDB│  │
│  │ Channel    │◀── yield ──────┘              │ (dbSvc)  │  │
│  │ (no throt.)│                                └──────────┘  │
│  └────────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Estrategia: Seek Frame-a-Frame

El motor utiliza una estrategia de **seek frame-a-frame** para garantizar que cada frame del video se procese:

1. El video se mantiene **pausado** en todo momento.
2. Se hace `video.currentTime = nextSeekTime` para posicionar el decodificador.
3. Se espera el evento `seeked` (el frame está listo).
4. Se ejecuta `poseLandmarker.detectForVideo()` sobre el frame actual.
5. Se avanza `nextSeekTime += 1/fps`.
6. Se repite hasta alcanzar la duración total.

**Ventaja:** El decodificador nunca puede saltar frames porque el video está pausado.

#### Modelos disponibles

| Modelo | Archivo | Precisión | Velocidad |
|---|---|---|---|
| Lite | `pose_landmarker_lite.task` | Baja | Rápida (~15ms/frame) |
| Full | `pose_landmarker_full.task` | Media | Moderada (~25ms/frame) |
| Heavy | `pose_landmarker_heavy.task` | Alta | Lenta (~40ms/frame) |

#### Cálculo de ángulos

Los ángulos articulares se calculan usando `geometryUtils.js`:

- **2D:** Calcula el ángulo entre tres puntos proyectados en el plano XY.
- **3D:** Calcula el ángulo entre tres puntos usando coordenadas mundiales (`worldLandmarks`).

```javascript
// Fórmula del ángulo 3D (producto punto)
const angle = Math.acos(
  (BA · BC) / (|BA| × |BC|)
) × (180 / Math.PI);
```

#### Landmarks detectados

MediaPipe PoseLandmarker detecta **33 puntos** del cuerpo humano:

```
 0: nose             11: left_shoulder    23: left_hip
 1: left_eye_inner   12: right_shoulder   24: right_hip
 2: left_eye         13: left_elbow       25: left_knee
 3: left_eye_outer   14: right_elbow      26: right_knee
 4: right_eye_inner  15: left_wrist       27: left_ankle
 5: right_eye        16: right_wrist      28: right_ankle
 6: right_eye_outer  17: left_pinky       29: left_heel
 7: left_ear         18: right_pinky      30: right_heel
 8: right_ear        19: left_index       31: left_foot_index
 9: mouth_left       20: right_index      32: right_foot_index
10: mouth_right      21: left_thumb
                     22: right_thumb
```

---

### 6.3 Sistema de Persistencia Local (IndexedDB)

**Archivos:** `services/dbService.js`, `services/movementHistoryService.js`

#### Esquema de almacenamiento

```
IndexedDB: telerehab_db (v1)
└── Object Store: exercise_history
    ├── Key: "exercise_1_history"
    │   └── Value: {
    │         map: { "0.0000": { t, points, angles }, ... },
    │         segments: [0, 1, 2, ...],
    │         duration: 232.108,
    │         isComplete: false,
    │         targetFps: 30
    │       }
    ├── Key: "exercise_2_history"
    │   └── ...
    └── ...
```

#### Estructura de un frame

```json
{
  "t": 1.0333,
  "points": [
    [0.5234, 0.3421, -0.0012, 0.9999],  // [x, y, z, visibility] × 33
    ...
  ],
  "angles": {
    "left_elbow": 145.32,
    "right_knee": 89.45
  }
}
```

#### Estrategia de guardado

- **Guardado periódico:** Cada 15 segundos durante el análisis.
- **Guardado al completar:** Al terminar el análisis.
- **Guardado al pausar/navegar:** Al pausar el análisis o al salir de la página.
- **Guardado al cerrar pestaña:** En el evento `beforeunload`.

#### Instancia compartida

> **Decisión de diseño importante:** El `backgroundAnalysisService` y la vista (`view_exercise.vue`) comparten la **misma instancia** de `MovementHistoryService`. Esto evita que dos copias del historial se sobreescriban mutuamente en IndexedDB.

---

### 6.4 Servicio de Exportación de Datos

**Archivo:** `services/exerciseExportService.js`

#### Formatos de exportación

| Formato | Método | Descripción |
|---|---|---|
| CSV filtrado | `exportCSV()` | Solo puntos rastreados del ejercicio |
| CSV crudo | `exportRawCSV()` | Los 33 landmarks completos |
| JSON de movimiento | `downloadJSON()` | Estructura JSON para procesamiento externo |

#### Estructura del CSV filtrado

```csv
Timestamp,left_elbow_angle,left_elbow_x,left_elbow_y,left_elbow_z,left_elbow_vis,...
0.0000,145.32,0.5234,0.3421,-0.0012,0.9999,...
0.0333,143.87,0.5198,0.3445,-0.0015,0.9998,...
```

#### Downsampling

El servicio incluye capacidad de submuestreo para reducir la densidad de datos:

```javascript
static downsampleHistory(historyArr, targetFps) {
  // Selecciona frames espaciados uniformemente a la tasa objetivo
}
```

---

### 6.5 Visor 3D (Three.js)

**Archivo:** `views/signedIn/3d_viewer/index.vue`

El visor 3D renderiza el esqueleto del paciente usando Three.js, permitiendo:

- Rotación orbital de la cámara.
- Visualización de los 33 landmarks en 3D.
- Conexiones entre puntos (huesos).
- Reproducción temporal de los frames capturados.

---

## 7. Flujos de Datos Principales

### 7.1 Flujo de Análisis de Video

```
1. Usuario hace clic en "Iniciar análisis"
   │
   ▼
2. view_exercise.vue → startAnalysis()
   │  ├ Inicializa BackgroundAnalysisService
   │  ├ Carga el modelo MediaPipe (si no está cargado)
   │  └ Pasa la instancia compartida de MovementHistoryService
   │
   ▼
3. BackgroundAnalysisService.start()
   │  ├ Crea un <video> oculto
   │  ├ Carga el video (loadedmetadata)
   │  ├ Ejecuta frame de calentamiento (warmup)
   │  └ Inicia el loop _seekToNextFrame()
   │
   ▼
4. Loop de procesamiento (por cada frame):
   │  ├ video.currentTime = nextSeekTime
   │  ├ Espera evento 'seeked'
   │  ├ poseLandmarker.detectForVideo(video, timestamp)
   │  ├ Calcula ángulos articulares (geometryUtils)
   │  ├ historyService.addFrame(t, angles, coords)
   │  ├ Ejecuta callbacks: onFrame(), onProgress()
   │  ├ Guarda a IndexedDB cada 15 segundos
   │  └ Avanza: nextSeekTime += seekStep
   │     │
   │     ├── Si visible: cada 150ms cede vía MessageChannel
   │     └── Si oculto: Worker timer mantiene el loop activo
   │
   ▼
5. Al finalizar (nextSeekTime >= duration):
   │  ├ _finishAnalysis()
   │  ├ onComplete() → saveToStorage()
   │  └ Libera el <video> oculto
   │
   ▼
6. Datos disponibles para:
   ├ Gráficas (Chart.js)
   ├ Exportación (CSV/JSON)
   ├ Visor 3D (Three.js)
   └ Envío al servidor (API REST)
```

### 7.2 Flujo de Detección en Tiempo Real

```
1. Video en ExerciseVideoPlayer se reproduce
   │
   ▼
2. requestVideoFrameCallback() captura cada frame
   │
   ▼
3. poseLandmarkerService.detectForVideo()
   │
   ▼
4. Dibuja esqueleto sobre <canvas> superpuesto
   │  ├ Puntos (landmarks)
   │  ├ Conexiones (huesos)
   │  └ Ángulos (texto)
   │
   ▼
5. Emite progress-update con los ángulos calculados
```

---

## 8. Decisiones de Arquitectura

### 8.1 ¿Por qué análisis en el navegador y no en el servidor?

| Criterio | En el navegador | En el servidor |
|---|---|---|
| Latencia | Instantáneo | Requiere subida + cola |
| Costo | Sin costo de GPU | Requiere GPU en servidor |
| Privacidad | Video no sale del equipo | Video se envía al servidor |
| Escalabilidad | Cada usuario aporta su GPU | Limitado por infraestructura |

### 8.2 ¿Por qué IndexedDB y no localStorage?

- **localStorage** tiene límite de ~5-10 MB (string serializado).
- **IndexedDB** puede almacenar cientos de MB de datos estructurados.
- Un análisis de 3 minutos a 30 FPS genera ~15-25 MB de datos de landmarks.

### 8.3 ¿Por qué MessageChannel y no setTimeout?

Chrome ralentiza `setTimeout` a un mínimo de **1 segundo** en pestañas ocultas. Esto destruiría el rendimiento del análisis en background. `MessageChannel.postMessage()` **no tiene esta restricción**, permitiendo velocidad completa incluso con la pestaña oculta.

### 8.4 ¿Por qué instancia compartida de MovementHistoryService?

Inicialmente, el `backgroundAnalysisService` creaba su propia instancia y la vista tenía otra. Ambas escribían en la misma clave de IndexedDB, causando que una sobreescribiera los datos de la otra. La solución fue inyectar la misma instancia desde la vista al servicio.

---

## 9. Optimizaciones de Rendimiento

### 9.1 Prevención de "Page Unresponsive"

**Problema:** El procesamiento intensivo de MediaPipe + serialización a IndexedDB bloqueaba el hilo principal, causando el diálogo "La página no responde" en Chrome.

**Solución:**
- Yielding periódico cada ~150ms al event loop vía `MessageChannel`.
- Reducción del intervalo de guardado a IndexedDB (de cada frame a cada 15 segundos).
- Eliminación de escritura duplicada a IndexedDB.

### 9.2 Prevención de throttling en pestañas ocultas

**Problema:** `setTimeout` se ralentiza a 1 segundo mínimo cuando la pestaña está oculta.

**Solución:**
- Uso de `MessageChannel` para scheduling (no throttled).
- Web Worker timer como fallback para forzar el procesamiento cuando el evento `seeked` no se dispara.

### 9.3 Optimización de memoria

**Problema:** Dos instancias de `MovementHistoryService` duplicaban la RAM usada.

**Solución:**
- Instancia compartida entre el servicio de análisis y la vista.
- Eliminación del `addFrame()` duplicado en `_onBackgroundFrame()`.

### 9.4 Preferencias de usuario persistentes

El modelo de MediaPipe seleccionado se persiste en `localStorage` con la clave `mediaPipeModelPref`, evitando que el usuario tenga que reconfigurarlo en cada sesión.

---

## 10. API Backend

El frontend se comunica con una API REST implementada en Django REST Framework.

### Endpoints principales

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/auth/users/login/` | Inicio de sesión |
| GET | `/therapy/therapies/` | Listar terapias |
| POST | `/therapy/therapies/` | Crear terapia |
| GET | `/therapy/exercises/` | Listar ejercicios |
| GET | `/therapy/exercises/{id}/` | Detalle de ejercicio |
| POST | `/therapy/exercises/` | Crear ejercicio |
| PATCH | `/therapy/exercises/{id}/` | Actualizar ejercicio |
| GET | `/therapy/routines/` | Listar rutinas |
| POST | `/therapy/routines/` | Crear rutina |
| GET | `/therapy/patients/` | Listar pacientes |
| POST | `/therapy/exercise-results/` | Enviar resultados de análisis |
| GET | `/therapy/skeleton-points/` | Listar puntos esqueléticos |

### Autenticación

La API utiliza autenticación por token. El token se envía en el header `Authorization`:

```
Authorization: Token <access_token>
```

---

## 11. Despliegue

### 11.1 Build de producción

```bash
npm run build
```

### 11.2 Archivos generados

El directorio `dist/` contiene:
- `index.html` — Punto de entrada
- `js/` — Bundles de JavaScript (code-split por ruta)
- `css/` — Hojas de estilo compiladas
- Assets estáticos

### 11.3 Configuración del servidor web

El servidor web (Nginx, Apache, etc.) debe configurarse para:
1. Servir los archivos estáticos de `dist/`.
2. Redirigir todas las rutas a `index.html` (SPA fallback).
3. Configurar CORS si el backend está en un dominio diferente.

**Ejemplo Nginx:**

```nginx
server {
    listen 80;
    server_name telerehab.example.com;
    root /var/www/telerehab/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
    }
}
```

### 11.4 Variables de entorno en producción

Las variables `VUE_APP_*` se incrustan durante el build. Para cambiar la URL del API u otras configuraciones, se debe ejecutar `npm run build` con las variables correctas.

```bash
VUE_APP_API_URL=https://api.example.com npm run build
```
