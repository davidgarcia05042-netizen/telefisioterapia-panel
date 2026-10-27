import { POSE_LANDMARK_IDS } from './constants';

/**
 * V1 (docs/DECISIONES_TECNICAS.md): nombres en español de los 33 puntos de MediaPipe, los mismos
 * del backend (migración 0006_seed_skeleton_points, campo verbose). Antes el
 * visor mostraba "Left Hip", "Right Knee".
 */
export const POINT_NAMES_ES = {
  NOSE: 'Nariz',
  LEFT_EYE_INNER: 'Ojo izquierdo (esquina interna)',
  LEFT_EYE: 'Ojo izquierdo (centro)',
  LEFT_EYE_OUTER: 'Ojo izquierdo (esquina externa)',
  RIGHT_EYE_INNER: 'Ojo derecho (esquina interna)',
  RIGHT_EYE: 'Ojo derecho (centro)',
  RIGHT_EYE_OUTER: 'Ojo derecho (esquina externa)',
  LEFT_EAR: 'Oreja izquierda',
  RIGHT_EAR: 'Oreja derecha',
  MOUTH_LEFT: 'Comisura izquierda de la boca',
  MOUTH_RIGHT: 'Comisura derecha de la boca',
  LEFT_SHOULDER: 'Hombro izquierdo',
  RIGHT_SHOULDER: 'Hombro derecho',
  LEFT_ELBOW: 'Codo izquierdo',
  RIGHT_ELBOW: 'Codo derecho',
  LEFT_WRIST: 'Muñeca izquierda',
  RIGHT_WRIST: 'Muñeca derecha',
  LEFT_PINKY: 'Meñique izquierdo',
  RIGHT_PINKY: 'Meñique derecho',
  LEFT_INDEX: 'Índice izquierdo (mano)',
  RIGHT_INDEX: 'Índice derecho (mano)',
  LEFT_THUMB: 'Pulgar izquierdo',
  RIGHT_THUMB: 'Pulgar derecho',
  LEFT_HIP: 'Cadera izquierda',
  RIGHT_HIP: 'Cadera derecha',
  LEFT_KNEE: 'Rodilla izquierda',
  RIGHT_KNEE: 'Rodilla derecha',
  LEFT_ANKLE: 'Tobillo izquierdo',
  RIGHT_ANKLE: 'Tobillo derecho',
  LEFT_HEEL: 'Talón izquierdo',
  RIGHT_HEEL: 'Talón derecho',
  LEFT_FOOT_INDEX: 'Índice del pie izquierdo',
  RIGHT_FOOT_INDEX: 'Índice del pie derecho',
};

/**
 * "LEFT_SHOULDER" → "Hombro izquierdo". Un nombre desconocido queda legible
 * ("SOME_POINT" → "Some Point").
 * @param {string} name
 * @returns {string}
 */
export function formatPointName(name) {
  if (!name) return '';
  if (POINT_NAMES_ES[name]) return POINT_NAMES_ES[name];
  return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

/**
 * Busca el nombre (p. ej. "Hombro izquierdo") a partir del ID (p. ej. 11)
 * @param {number} idx
 * @returns {string}
 */
export function landmarkName(idx) {
  const entry = Object.entries(POSE_LANDMARK_IDS).find(([, v]) => v === idx);
  return entry ? formatPointName(entry[0]) : 'Punto ' + idx;
}
