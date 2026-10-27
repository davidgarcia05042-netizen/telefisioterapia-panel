import { reactive } from 'vue';

/**
 * Avisos breves de éxito o error (docs/DECISIONES_TECNICAS.md, F2): reemplazan los alert()
 * nativos y hacen visible lo que antes quedaba solo en la consola.
 * ToastHost.vue (montado en App.vue) los muestra.
 *
 *   import toast from '@/lib/toast';
 *   toast.success('Terapia eliminada.');
 *   toast.error('No se pudo eliminar la terapia.');
 */
const DURATION_MS = { success: 4000, error: 7000 };

export const toastState = reactive({ items: [] });

let nextId = 0;

function push(kind, message) {
  const id = ++nextId;
  toastState.items.push({ id, kind, message });
  setTimeout(() => dismiss(id), DURATION_MS[kind]);
  return id;
}

export function dismiss(id) {
  const index = toastState.items.findIndex((item) => item.id === id);
  if (index !== -1) toastState.items.splice(index, 1);
}

export default {
  success: (message) => push('success', message),
  error: (message) => push('error', message),
};

/** Mensaje para una carga que respondió 404 o falló. */
export const LOAD_ERROR = 'No se pudo cargar la información. Recarga la página o vuelve a intentarlo.';
export const NOT_FOUND = 'No se encontró lo que buscabas: puede que se haya eliminado.';
