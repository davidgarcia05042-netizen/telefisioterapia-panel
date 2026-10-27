/**
 * Formato único de fechas del panel (G11, docs/DECISIONES_TECNICAS.md): español de Colombia y
 * hora de Bogotá, sin importar la zona del navegador. Antes se mostraban en
 * ISO crudo ("2027-05-05T14:42:00-05:00").
 */
const TIME_ZONE = 'America/Bogota';

const DATE_TIME = new Intl.DateTimeFormat('es-CO', {
  timeZone: TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const DATE_ONLY = new Intl.DateTimeFormat('es-CO', {
  timeZone: TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric',
});

function parse(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/** "05 may 2027, 2:42 p. m." — o `empty` si no hay fecha válida. */
export function formatDateTime(value, empty = '—') {
  const date = parse(value);
  return date ? DATE_TIME.format(date) : empty;
}

/** "05 may 2027" — o `empty` si no hay fecha válida. */
export function formatDate(value, empty = '—') {
  const date = parse(value);
  return date ? DATE_ONLY.format(date) : empty;
}

// Insignia por estado (texto que devuelve el backend): verde terminado, ámbar
// en curso, rojo error. Las clases están en los estilos globales.
const STATUS_CLASSES = {
  'Video procesado': 'status-badge--ok',
  'Finalizado': 'status-badge--ok',
  'Video en procesamiento': 'status-badge--progress',
  'Iniciado': 'status-badge--progress',
  'Error al procesar video': 'status-badge--error',
};

/** Clase de la insignia de un estado; neutra si no se conoce. */
export function statusClass(status) {
  return STATUS_CLASSES[status] || 'status-badge--neutral';
}
