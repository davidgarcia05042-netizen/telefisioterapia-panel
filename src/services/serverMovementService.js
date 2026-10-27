import Http from "@/lib/http";
import MovementHistoryService from "@/services/movementHistoryService";

/**
 * Movimiento medido por el Servicio de Procesamiento (docs/DECISIONES_TECNICAS.md, V3).
 *
 * El backend lo guarda con la estructura de JSON_MOVIMIENTO_ESTRUCTURA.md
 * ({t, points, angles} por frame) más `world_points` y `angles_3d`. Este
 * adaptador lo carga en la estructura de MovementHistoryService para que las
 * gráficas, las exportaciones y el visor 3D lo consuman sin reescribirse.
 *
 * Fuente de verdad: si hay movimiento del servidor, todo se muestra desde él.
 * El análisis del navegador queda como previsualización y nunca lo pisa.
 */

export const SERVICE_SOURCE_LABEL = "Fuente: servicio de procesamiento (MediaPipe Heavy)";
export const PREVIEW_LABEL = "Previsualización en el navegador";
export const UNAVAILABLE_LABEL = "Disponible al terminar el procesamiento";

// Estados que devuelve el backend para el ejercicio y el resultado del paciente.
export const PROCESSING_STATUS = "Video en procesamiento";
export const PROCESSED_STATUS = "Video procesado";
export const ERROR_STATUS = "Error al procesar video";
export const STATUS_POLL_MS = 5000;

/**
 * Consulta el estado cada `intervalMs` mientras siga en procesamiento.
 * `fetchCurrent` devuelve el ejercicio o el resultado (o null si falló la
 * consulta: se reintenta en la siguiente vuelta). Al cambiar el estado llama
 * a `onChange` una vez y se detiene. Devuelve la función que la detiene.
 *
 * El servicio no reporta porcentaje: solo se sabe si terminó o no.
 */
export function pollWhileProcessing(fetchCurrent, onChange, intervalMs = STATUS_POLL_MS) {
  let stopped = false;
  let timer = null;
  const tick = async () => {
    let current = null;
    try {
      current = await fetchCurrent();
    } catch (e) {
      console.warn("No se pudo consultar el estado del procesamiento:", e);
    }
    if (stopped) return;
    if (current && current.status !== PROCESSING_STATUS) {
      stopped = true;
      await onChange(current);
      return;
    }
    timer = setTimeout(tick, intervalMs);
  };
  timer = setTimeout(tick, intervalMs);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

/** Rótulo del conjunto de ángulos: el 2D es la medición clínica validada; el 3D no. */
export function angleModeLabel(angleMode) {
  return angleMode === "3d"
    ? "ángulos 3D (visualización, no validado)"
    : "ángulos 2D (medición clínica)";
}

async function fetchMovement(endpoint) {
  const response = await new Http().authGet(endpoint);
  // 404 = el servicio todavía no midió este video (sin video, procesando o error).
  if (response.status !== 200 || !response.data || !Array.isArray(response.data.frames)) {
    return null;
  }
  return response.data;
}

export function fetchExerciseMovement(exerciseId) {
  return fetchMovement(`/exercises/${exerciseId}/movement/`);
}

export function fetchResultMovement(resultId) {
  return fetchMovement(`/exercise_results/${resultId}/movement`);
}

/**
 * Frames en la forma que usa el panel, con el conjunto de ángulos elegido:
 * `angles` (2D) o `angles_3d` (3D) del servidor pasan a `frame.angles`.
 */
export function framesForMode(movement, angleMode) {
  const key = angleMode === "3d" ? "angles_3d" : "angles";
  return movement.frames.map((frame) => ({
    t: frame.t,
    points: frame.points,
    world_points: frame.world_points,
    angles: frame[key] || {},
  }));
}

/** MovementHistoryService cargado con el movimiento del servidor (no persiste en IndexedDB). */
export function historyFromMovement(movement, exerciseId, angleMode) {
  const history = new MovementHistoryService(exerciseId);
  history.loadFromServer(framesForMode(movement, angleMode), movement.duration);
  return history;
}

/**
 * Porcentaje de frames medidos con el ángulo dentro de [min, max] (1 decimal),
 * o null si no hay rango o no hay ángulos.
 */
export function percentInRange(angles, min, max) {
  if (min == null || max == null) return null;
  const valid = angles.filter((a) => a !== null && a !== undefined && !isNaN(a));
  if (valid.length === 0) return null;
  const inside = valid.filter((a) => a >= min && a <= max).length;
  return Math.round((inside / valid.length) * 1000) / 10;
}

// Mensajes del backend que ya son claros para el terapeuta (processing/results.py,
// callbacks.py y client.py). Cualquier otro texto es el error técnico que el
// servicio reenvía tal cual (una excepción, `processing_timeout`...).
const CLEAR_ERROR_PREFIXES = [
  "El video se procesó", "Articulación sin vecinos", "El servicio no devolvió",
  "El servicio devolvió", "No se pudo contactar", "El servicio de procesamiento",
  "Respuesta ilegible", "Error inesperado al enviar", "sin medición del servicio",
];

/**
 * {message, detail} para mostrar el error de una articulación (P4,
 * docs/DECISIONES_TECNICAS.md): un mensaje claro y, si el original es técnico, ese texto
 * aparte (`detail`) para mostrarlo en letra pequeña.
 */
export function describeJointError(error) {
  const text = String(error || "").trim();
  if (CLEAR_ERROR_PREFIXES.some((prefix) => text.startsWith(prefix))) {
    return { message: text, detail: null };
  }
  return { message: "El servicio no pudo procesar el video.", detail: text || null };
}
