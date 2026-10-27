/* eslint-env jest */
import { rangeGoal } from './rangeGoal';

// Los mismos casos que la prueba de la app (ExerciseOutcomeTest.kt): ambos
// lados deben marcar igual.
describe('rangeGoal', () => {
  const reached = { status: 'reached', gaps: [] };

  test('alcanza las metas exactas, con más movimiento o dentro de la tolerancia', () => {
    expect(rangeGoal(30, 120, 30, 120)).toEqual(reached);
    expect(rangeGoal(12, 140, 30, 120)).toEqual(reached);
    expect(rangeGoal(35, 115, 30, 120)).toEqual(reached);
    // Se compara como se muestra: 35,4° es "35°".
    expect(rangeGoal(35.4, 114.6, 30, 120)).toEqual(reached);
  });

  test('moverse menos no alcanza el rango y dice cuánto faltó', () => {
    // Con el criterio de contención esto salía "dentro del rango".
    expect(rangeGoal(54, 100, 30, 120)).toEqual({
      status: 'not_reached',
      gaps: ['Llegó a 54°, meta 30° (faltaron 24°)', 'Llegó a 100°, meta 120° (faltaron 20°)'],
    });
    expect(rangeGoal(54, 120, 37, 120).gaps).toEqual(['Llegó a 54°, meta 37° (faltaron 17°)']);
    // Justo fuera de la tolerancia.
    expect(rangeGoal(36, 114, 30, 120).gaps).toEqual([
      'Llegó a 36°, meta 30° (faltaron 6°)', 'Llegó a 114°, meta 120° (faltaron 6°)',
    ]);
  });

  test('sin rango, sin medición o con una sola meta', () => {
    expect(rangeGoal(35, 118, null, null)).toEqual({ status: 'no_range', gaps: [] });
    expect(rangeGoal(null, null, 30, 120)).toEqual({ status: 'unmeasured', gaps: [] });
    expect(rangeGoal(80, 118, null, 120)).toEqual(reached);
    expect(rangeGoal(35, 90, undefined, 100).gaps).toEqual(['Llegó a 90°, meta 100° (faltaron 10°)']);
    expect(rangeGoal(30, null, 30, 120).gaps).toEqual(['Sin medición del máximo, meta 120°']);
  });

  test('acepta los ángulos como texto, como llegan de la API', () => {
    expect(rangeGoal('54.0', '100.0', '30.0', '120.0').status).toBe('not_reached');
    expect(rangeGoal('32.0', '118.0', '30.0', '120.0')).toEqual(reached);
  });
});
