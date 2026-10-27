/**
 * Resumen del tablero de inicio (I1, docs/DECISIONES_TECNICAS.md) a partir de lo que la API ya
 * da: los pacientes del terapeuta (/therapist_patient) y las rutinas
 * programadas de cada uno (/scheduled_training?patient_id=). Sin dependencias:
 * se prueba con jest (dashboardService.test.js).
 */

export const NOT_STARTED = 'Sin iniciar';
export const STARTED = 'Iniciado';
export const FINISHED = 'Finalizado';

// Día calendario en Bogotá, para "hoy" sin importar la zona del navegador.
const DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
});

function bogotaDay(value) {
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : DAY.format(date);
}

/** Cantidad de elementos de una respuesta de lista, paginada (count) o no. */
export function countOf(data) {
  if (!data) return null;
  if (typeof data.count === 'number') return data.count;
  if (Array.isArray(data.results)) return data.results.length;
  return Array.isArray(data) ? data.length : null;
}

/** "Paula Prueba", o el usuario si no tiene nombre. */
export function patientName(therapyPatient) {
  const user = therapyPatient && therapyPatient.patient && therapyPatient.patient.user;
  if (!user) return 'Paciente';
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return name || user.username || 'Paciente';
}

/**
 * entries: [{ therapyPatient, routines: [{id, routine, start_time, status_verbose}] }].
 * Devuelve los conteos y las próximas rutinas sin terminar (las más cercanas
 * primero, también las de días pasados que no se terminaron).
 */
export function summarizeRoutines(entries, now = new Date(), limit = 6) {
  const today = bogotaDay(now);
  const summary = { today: 0, inProgress: 0, finished: 0, notStarted: 0, pending: [] };
  for (const { therapyPatient, routines } of entries) {
    for (const routine of routines || []) {
      const status = routine.status_verbose;
      if (status === FINISHED) {
        summary.finished += 1;
        continue;
      }
      if (status === STARTED) summary.inProgress += 1;
      else summary.notStarted += 1;
      if (bogotaDay(routine.start_time) === today) summary.today += 1;
      summary.pending.push({
        id: routine.id,
        therapyPatientId: therapyPatient.id,
        patient: patientName(therapyPatient),
        routine: (routine.routine && routine.routine.name) || 'Rutina',
        start_time: routine.start_time,
        status: status || NOT_STARTED,
        overdue: status !== STARTED && new Date(routine.start_time) < now && bogotaDay(routine.start_time) !== today,
      });
    }
  }
  summary.pending.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  summary.pending = summary.pending.slice(0, limit);
  return summary;
}
