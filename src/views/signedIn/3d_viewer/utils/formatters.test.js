/* eslint-env jest */
import { POINT_NAMES_ES, formatPointName, landmarkName } from './formatters';

describe('nombres de los puntos del visor 3D', () => {
  test('en español, los 33 de MediaPipe', () => {
    expect(Object.keys(POINT_NAMES_ES)).toHaveLength(33);
    expect(formatPointName('LEFT_HIP')).toBe('Cadera izquierda');
    expect(formatPointName('RIGHT_KNEE')).toBe('Rodilla derecha');
    expect(landmarkName(11)).toBe('Hombro izquierdo');
  });

  test('un nombre desconocido queda legible', () => {
    expect(formatPointName('SOME_POINT')).toBe('Some Point');
    expect(formatPointName('')).toBe('');
    expect(landmarkName(99)).toBe('Punto 99');
  });
});
