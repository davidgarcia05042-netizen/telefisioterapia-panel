/**
 * ExerciseExportService
 * Responsabilidad única: generar y descargar archivos de exportación
 * (CSV filtrado por puntos rastreados, CSV crudo de 33 puntos, JSON de movimiento).
 */
export default class ExerciseExportService {

  static LANDMARK_NAMES = [
    'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
    'right_eye_inner', 'right_eye', 'right_eye_outer',
    'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
    'left_index', 'right_index', 'left_thumb', 'right_thumb',
    'left_hip', 'right_hip', 'left_knee', 'right_knee',
    'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
    'left_foot_index', 'right_foot_index',
  ];

  // ─── Helpers privados ──────────────────────────────────────────────────────

  static _sanitizeFilename(name) {
    return name ? name.replace(/\s+/g, '_') : 'ejercicio';
  }

  static _triggerDownload(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ─── Downsampling helper ───────────────────────────────────────────────────

  /**
   * Submuestrea el historial a una tasa de FPS objetivo.
   * @param {Array} historyArr
   * @param {number} targetFps - 0 o undefined para conservar todos
   * @returns {Array}
   */
  static downsampleHistory(historyArr, targetFps) {
    if (!targetFps || targetFps <= 0 || !historyArr || historyArr.length === 0) {
      return historyArr;
    }
    const interval = 1 / targetFps;
    const result = [];
    let nextTargetTime = historyArr[0].t;
    for (const frame of historyArr) {
      // Usar margen de tolerancia de 1ms para imprecisión de floats
      if (frame.t >= nextTargetTime - 0.001) {
        result.push(frame);
        nextTargetTime = frame.t + interval;
      }
    }
    return result;
  }

  // ─── Exportaciones públicas ────────────────────────────────────────────────

  /**
   * CSV con puntos rastreados: tiempo + (X, Y, Z, ángulo) por cada tracked point.
   * @param {Array} historyArr - frames ordenados
   * @param {Array} trackedPoints - puntos configurados en el ejercicio
   * @param {string} exerciseName
   * @param {number} targetFps - FPS de muestreo deseado
   */
  static exportTrackedCSV(historyArr, trackedPoints, exerciseName, targetFps = 0) {
    const sampled = this.downsampleHistory(historyArr, targetFps);
    if (!sampled || sampled.length === 0) return;

    const headers = ['Tiempo (s)'];
    for (const point of trackedPoints) {
      const name = point.verbose.replace(/"/g, '""');
      headers.push(`"${name} X"`, `"${name} Y"`, `"${name} Z"`, `"${name} Ángulo (°)"`);
    }

    const rows = [headers.join(',')];
    for (const frame of sampled) {
      const row = [frame.t.toFixed(3)];
      for (const point of trackedPoints) {
        const coords = frame.points[point.id];
        if (coords) {
          row.push(coords[0].toFixed(4), coords[1].toFixed(4), coords[2].toFixed(4));
        } else {
          row.push('', '', '');
        }
        const angle = frame.angles && frame.angles[point.codename] !== undefined
          ? parseFloat(frame.angles[point.codename]).toFixed(2)
          : '';
        row.push(angle);
      }
      rows.push(row.join(','));
    }

    this._triggerDownload(
      rows.join('\n'),
      'text/csv;charset=utf-8;',
      `datos_movimiento_${this._sanitizeFilename(exerciseName)}.csv`
    );
  }

  /**
   * CSV crudo con los 33 landmarks de MediaPipe: tiempo + (X, Y, Z, visibility) × 33.
   * @param {Array} historyArr - frames ordenados
   * @param {string} exerciseName
   * @param {number} targetFps - FPS de muestreo deseado
   */
  static exportRawCSV(historyArr, exerciseName, targetFps = 0) {
    const sampled = this.downsampleHistory(historyArr, targetFps);
    if (!sampled || sampled.length === 0) return;

    const headers = ['tiempo_s'];
    for (const name of this.LANDMARK_NAMES) {
      headers.push(`${name}_x`, `${name}_y`, `${name}_z`, `${name}_visibility`);
    }

    const rows = [headers.join(',')];
    for (const frame of sampled) {
      const row = [frame.t.toFixed(4)];
      for (let i = 0; i < 33; i++) {
        const pt = frame.points[i];
        if (pt && pt.length >= 4) {
          row.push(pt[0], pt[1], pt[2], pt[3]);
        } else {
          row.push('', '', '', '');
        }
      }
      rows.push(row.join(','));
    }

    this._triggerDownload(
      rows.join('\n'),
      'text/csv;charset=utf-8;',
      `crudo_33puntos_${this._sanitizeFilename(exerciseName)}.csv`
    );
  }

  /**
   * JSON completo con metadatos del ejercicio y todos los frames.
   * @param {object} exercise - { id, name }
   * @param {number} duration - duración del video en segundos
   * @param {Array}  historyArr - frames ordenados
   * @param {number} targetFps - FPS de muestreo deseado
   */
  static exportMovementJSON(exercise, duration, historyArr, targetFps = 0) {
    const sampled = this.downsampleHistory(historyArr, targetFps);
    const data = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      duration,
      frames: sampled,
    };
    this._triggerDownload(
      JSON.stringify(data),
      'application/json',
      `movimiento_${this._sanitizeFilename(exercise.name)}_${Date.now()}.json`
    );
  }
}
