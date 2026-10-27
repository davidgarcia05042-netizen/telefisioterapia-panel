/**
 * ¿El paciente alcanzó el rango esperado de una articulación?
 *
 * Los extremos de una dificultad son METAS a alcanzar, no una zona permitida:
 * una repetición es llegar al máximo y volver al mínimo (RepetitionCounter de
 * la app original). Alcanzó el rango si bajó hasta el mínimo y subió hasta el
 * máximo, con la tolerancia de 5° de la tesis (umbral de error aceptable):
 *
 *   mínimo medido <= mínimo esperado + 5  y  máximo medido >= máximo esperado - 5
 *
 * Moverse más que la meta también la alcanza. Se compara en grados enteros,
 * como se muestran, y lo que faltó se cuenta hasta la meta, no hasta la
 * tolerancia. Es el mismo criterio y los mismos textos que la app del
 * paciente (ExerciseOutcome.kt, checkRange).
 *
 * Sin dependencias: se prueba con jest (rangeGoal.test.js).
 */
export const RANGE_TOLERANCE_DEGREES = 5;

export const REACHED_LABEL = 'Alcanzó el rango';
export const NOT_REACHED_LABEL = 'No alcanzó el rango';

function degrees(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

/**
 * {status, gaps}:
 * - status: 'reached' | 'not_reached' | 'no_range' (sin rango esperado) |
 *   'unmeasured' (el servicio no devolvió ángulos);
 * - gaps: lo que faltó, primero el mínimo y después el máximo, por ejemplo
 *   "Llegó a 54°, meta 30° (faltaron 24°)".
 */
export function rangeGoal(measuredMin, measuredMax, expectedMin, expectedMax) {
  const min = degrees(measuredMin);
  const max = degrees(measuredMax);
  const goalMin = degrees(expectedMin);
  const goalMax = degrees(expectedMax);

  if (min === null && max === null) return { status: 'unmeasured', gaps: [] };
  if (goalMin === null && goalMax === null) return { status: 'no_range', gaps: [] };

  const gaps = [];
  if (goalMin !== null) {
    if (min === null) gaps.push(`Sin medición del mínimo, meta ${goalMin}°`);
    else if (min > goalMin + RANGE_TOLERANCE_DEGREES) {
      gaps.push(`Llegó a ${min}°, meta ${goalMin}° (faltaron ${min - goalMin}°)`);
    }
  }
  if (goalMax !== null) {
    if (max === null) gaps.push(`Sin medición del máximo, meta ${goalMax}°`);
    else if (max < goalMax - RANGE_TOLERANCE_DEGREES) {
      gaps.push(`Llegó a ${max}°, meta ${goalMax}° (faltaron ${goalMax - max}°)`);
    }
  }
  return { status: gaps.length ? 'not_reached' : 'reached', gaps };
}
