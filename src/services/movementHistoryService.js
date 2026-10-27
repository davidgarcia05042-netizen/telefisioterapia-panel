/**
 * MovementHistoryService
 * Responsabilidad única: gestionar el historial de frames de movimiento
 * y su persistencia en localStorage.
 */
export default class MovementHistoryService {
  constructor(exerciseId) {
    this.exerciseId = exerciseId;
    this._map = {};
    this._processedSegments = new Set();
    this.targetFps = 30; // Default
  }

  // ─── Acceso al historial ───────────────────────────────────────────────────

  getHistoryArray() {
    return Object.values(this._map).sort((a, b) => a.t - b.t);
  }

  hasFrames() {
    return Object.keys(this._map).length > 0;
  }

  /**
   * Devuelve el último timestamp analizado (en segundos) para poder reanudar
   * el análisis desde ahí tras un refresco de página.
   * @returns {number} - 0 si no hay frames previos
   */
  getLastAnalyzedTime() {
    const frames = this.getHistoryArray(); // ya vienen ordenados por t
    if (frames.length === 0) return 0;
    return frames[frames.length - 1].t;
  }

  // ─── Actualización de frames ───────────────────────────────────────────────

  /**
   * Registra un nuevo frame y devuelve el progreso actualizado (0-100).
   * @param {number} currentTime - currentTime del video en segundos
   * @param {object} angles - { [codename]: angleDegrees }
   * @param {Array}  coords - array de 33 landmarks [[x,y,z,vis], ...]
   * @param {number} videoDuration - duración total del video
   * @returns {{ progress: number, isFirstResult: boolean }}
   */
  addFrame(currentTime, angles, coords, videoDuration) {
    const key = currentTime.toFixed(4);
    const wasEmpty = !this.hasFrames();

    this._map[key] = {
      t: parseFloat(currentTime.toFixed(4)),
      points: coords,
      angles,
    };

    const segment = Math.floor(currentTime * 10);
    this._processedSegments.add(segment);

    if (videoDuration && (!this.videoDuration || this.videoDuration !== videoDuration)) {
      this.videoDuration = videoDuration;
    }

    let progress = 0;
    const duration = this.videoDuration;
    if (duration) {
      const totalSegments = Math.ceil(duration * 10);
      progress = Math.min(100, Math.round((this._processedSegments.size / totalSegments) * 100));
    }

    return { progress, isFirstResult: wasEmpty && Object.keys(angles).length > 0 };
  }

  /**
   * Calcula el progreso inicial a partir de los segmentos ya almacenados.
   * @param {number} videoDuration
   * @returns {number} progreso 0-100
   */
  calculateProgress(videoDuration) {
    if (this.isComplete) return 100;
    const duration = videoDuration || this.videoDuration;
    if (!duration) return 0;
    const totalSegments = Math.ceil(duration * 10);
    return totalSegments > 0 ? Math.min(100, Math.round((this._processedSegments.size / totalSegments) * 100)) : 0;
  }

  // ─── Datos del servidor (docs/DECISIONES_TECNICAS.md, V3) ───────────────────────

  /**
   * Carga frames medidos por el Servicio de Procesamiento.
   *
   * Un historial con datos del servidor NUNCA se guarda ni se borra en
   * IndexedDB (ver saveToStorage/reset): esa clave es la de la previsualización
   * del navegador, y así ninguna de las dos fuentes pisa a la otra.
   * @param {Array} frames - [{t, points, angles, world_points}]
   * @param {number} duration - duración del video en segundos
   */
  loadFromServer(frames, duration) {
    this.isServerData = true;
    this._map = {};
    this._processedSegments = new Set();
    for (const frame of frames) {
      this._map[frame.t.toFixed(4)] = frame;
      this._processedSegments.add(Math.floor(frame.t * 10));
    }
    this.videoDuration = duration;
    this.isComplete = true;
    // 0 = sin submuestreo en las exportaciones: se exporta todo lo medido.
    this.targetFps = 0;
  }

  // ─── Persistencia localStorage ─────────────────────────────────────────────

  async saveToStorage() {
    if (this.isServerData) return;
    try {
      const payload = {
        map: this._map,
        segments: Array.from(this._processedSegments),
        duration: this.videoDuration,
        isComplete: this.isComplete,
        targetFps: this.targetFps,
      };
      const key = `exercise_${this.exerciseId}_history`;
      const { setHistory } = await import('./dbService');
      await setHistory(key, payload);
    } catch (e) {
      console.error('Error guardando historial de movimiento en IndexedDB:', e);
    }
  }

  async loadFromStorage() {
    const key = `exercise_${this.exerciseId}_history`;
    
    let cachedData = null;
    try {
      const { getHistory } = await import('./dbService');
      cachedData = await getHistory(key);
    } catch (err) {
      console.warn('[HistoryService] Error leyendo de IndexedDB, intentando localStorage:', err);
    }

    if (!cachedData) {
      const localCached = localStorage.getItem(key);
      if (localCached) {
        try {
          cachedData = JSON.parse(localCached);
          const { setHistory } = await import('./dbService');
          await setHistory(key, cachedData);
          localStorage.removeItem(key);
        } catch (e) {
          console.error('[HistoryService] Error migrando de localStorage:', e);
        }
      }
    }

    if (!cachedData) {
      return false;
    }

    try {
      const parsed = cachedData;
      if (parsed) {
        if (parsed.duration) {
          this.videoDuration = parsed.duration;
        }
        if (parsed.isComplete !== undefined) {
          this.isComplete = parsed.isComplete;
        } else {
          this.isComplete = false;
        }
        if (parsed.targetFps !== undefined) {
          this.targetFps = parsed.targetFps;
        } else {
          this.targetFps = 30;
        }
        if (parsed.map) {
          this._map = parsed.map;
          if (parsed.segments) {
            this._processedSegments = new Set(parsed.segments);
          } else {
            // Reconstruir segmentos por compatibilidad
            this._processedSegments = new Set();
            Object.values(this._map).forEach(frame => {
              if (frame && typeof frame.t === 'number') {
                const segment = Math.floor(frame.t * 10);
                this._processedSegments.add(segment);
              }
            });
          }
        } else {
          // Formato antiguo directo
          this._map = parsed;
          this._processedSegments = new Set();
          Object.values(this._map).forEach(frame => {
            if (frame && typeof frame.t === 'number') {
              const segment = Math.floor(frame.t * 10);
              this._processedSegments.add(segment);
            }
          });
        }
        return true;
      }
    } catch (e) {
      console.error('Error cargando historial de resguardo:', e);
    }
    return false;
  }

  /**
   * Descarta todos los frames en memoria y elimina el caché de localStorage e IndexedDB.
   */
  async reset() {
    if (this.isServerData) return;
    const key = `exercise_${this.exerciseId}_history`;
    this._map = {};
    this._processedSegments = new Set();
    this.videoDuration = undefined;
    this.isComplete = false;
    localStorage.removeItem(key);
    try {
      const { deleteHistory } = await import('./dbService');
      await deleteHistory(key);
    } catch (e) {
      console.error('Error borrando historial en IndexedDB:', e);
    }
  }
}
