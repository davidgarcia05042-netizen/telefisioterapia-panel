/* eslint-env jest */
import { countOf, patientName, summarizeRoutines } from './dashboardService';

const paula = { id: 1, patient: { user: { first_name: 'Paula', last_name: 'Prueba', username: 'p1' } } };
const pedro = { id: 2, patient: { user: { first_name: '', last_name: '', username: 'pedro' } } };

// 19 de octubre de 2026, 10:00 en Bogotá (UTC-5).
const NOW = new Date('2026-10-19T15:00:00Z');

function routine(id, startTime, status, name = 'Rodilla fase 1') {
  return { id, routine: { name }, start_time: startTime, status_verbose: status };
}

describe('summarizeRoutines', () => {
  test('cuenta por estado y lo de hoy en la hora de Bogotá', () => {
    const summary = summarizeRoutines([
      { therapyPatient: paula, routines: [
        routine(1, '2026-10-19T08:00:00-05:00', 'Iniciado'),
        routine(2, '2026-10-20T08:00:00-05:00', 'Sin iniciar'),
        routine(3, '2026-10-18T08:00:00-05:00', 'Finalizado'),
      ] },
      // 23:30 del 19 en Bogotá es 04:30 del 20 en UTC: sigue siendo hoy.
      { therapyPatient: pedro, routines: [routine(4, '2026-10-20T04:30:00Z', 'Sin iniciar')] },
    ], NOW);
    expect(summary.today).toBe(2);
    expect(summary.inProgress).toBe(1);
    expect(summary.notStarted).toBe(2);
    expect(summary.finished).toBe(1);
  });

  test('las próximas sin terminar, primero las más cercanas, con paciente y enlace', () => {
    const summary = summarizeRoutines([
      { therapyPatient: paula, routines: [
        routine(2, '2026-10-21T08:00:00-05:00', 'Sin iniciar', 'Hombro'),
        routine(3, '2026-10-18T08:00:00-05:00', 'Finalizado'),
        routine(5, '2026-10-17T08:00:00-05:00', 'Sin iniciar', 'Vencida'),
      ] },
      { therapyPatient: pedro, routines: [routine(4, '2026-10-19T16:00:00-05:00', 'Iniciado', 'Cadera')] },
    ], NOW);
    expect(summary.pending.map((p) => p.id)).toEqual([5, 4, 2]);
    expect(summary.pending[0]).toMatchObject({ patient: 'Paula Prueba', therapyPatientId: 1, overdue: true });
    expect(summary.pending[1]).toMatchObject({ patient: 'pedro', routine: 'Cadera', status: 'Iniciado', overdue: false });
    expect(summarizeRoutines([{ therapyPatient: paula, routines: [routine(2, '2026-10-21T08:00:00-05:00', 'Sin iniciar')] }], NOW, 0).pending).toEqual([]);
  });

  test('sin rutinas o con datos incompletos', () => {
    expect(summarizeRoutines([], NOW)).toEqual({ today: 0, inProgress: 0, finished: 0, notStarted: 0, pending: [] });
    const summary = summarizeRoutines([{ therapyPatient: {}, routines: [{ id: 9, start_time: '2026-10-25T08:00:00-05:00' }] }], NOW);
    expect(summary.pending[0]).toMatchObject({ patient: 'Paciente', routine: 'Rutina', status: 'Sin iniciar' });
  });
});

describe('countOf y patientName', () => {
  test('listas paginadas y sin paginar', () => {
    expect(countOf({ count: 12, results: [1, 2] })).toBe(12);
    expect(countOf({ results: [1, 2, 3] })).toBe(3);
    expect(countOf([1, 2])).toBe(2);
    expect(countOf(null)).toBeNull();
  });

  test('nombre del paciente', () => {
    expect(patientName(paula)).toBe('Paula Prueba');
    expect(patientName(pedro)).toBe('pedro');
    expect(patientName(null)).toBe('Paciente');
  });
});
