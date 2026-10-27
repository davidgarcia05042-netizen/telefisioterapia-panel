import Http from "@/lib/http";

/**
 * Subida de videos a Supabase Storage (docs/DECISIONES_TECNICAS.md, fase 6).
 *
 * El backend emite una URL firmada (POST /storage/upload_url) y el navegador
 * sube el archivo directo a Supabase con un PUT, sin pasar por el backend.
 *
 * Verificado con el proyecto real (2026-10-15):
 *  - El PUT NO lleva clave de Supabase: el token de la URL firmada es la única
 *    credencial. Por eso el panel no usa la clave pública (anon).
 *  - Supabase valida tamaño y tipo del bucket con el Content-Type del PUT. Se
 *    fija a mano con el MISMO valor que se le mandó al backend: algunos
 *    navegadores dejan vacío file.type (p. ej. en .mkv) y el video se
 *    guardaría como application/octet-stream y sería rechazado.
 *
 * Se usa XMLHttpRequest y no fetch porque fetch no informa el progreso de
 * subida, y la vista muestra una barra de progreso.
 */

// Igual a los tipos del bucket y a los formatos del Servicio de Procesamiento.
const VIDEO_TYPES = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-matroska": ".mkv",
  "video/x-msvideo": ".avi",
};

// Igual al límite del bucket y a MAX_VIDEO_SIZE_MB del servicio.
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export function resolveContentType(file) {
  if (VIDEO_TYPES[file.type]) return file.type;
  const extension = (file.name.match(/\.[^.]+$/) || [""])[0].toLowerCase();
  return Object.keys(VIDEO_TYPES).find((type) => VIDEO_TYPES[type] === extension) || null;
}

/** Mensaje legible de una respuesta de error del backend ({error} o {errors}). */
export async function backendErrorMessage(response, fallback) {
  if (!response || response.error || !response.request) {
    return "No se pudo contactar al servidor.";
  }
  try {
    const body = await response.request.json();
    if (body.error) return body.error;
    if (body.errors) return JSON.stringify(body.errors);
    if (body.detail) return body.detail;
  } catch (_) {
    // Cuerpo vacío o no JSON: se usa el mensaje por defecto.
  }
  return `${fallback} (HTTP ${response.request.status}).`;
}

function putFile(uploadUrl, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === "function") {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Supabase rechazó el video (HTTP ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Error de red al subir el video."));
    xhr.send(file);
  });
}

class StorageService {
  /**
   * Sube `file` y devuelve su URL pública, la que luego se envía al backend.
   * @param {File} file
   * @param {"exercise"|"result"} kind  video de referencia o del paciente
   * @param {(percent: number) => void} [onProgress]
   */
  async uploadVideo(file, kind, onProgress) {
    const contentType = resolveContentType(file);
    if (!contentType) {
      throw new Error("Formato de video no soportado (use mp4, mov, webm, mkv o avi).");
    }
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error("El video supera el límite de 50 MB.");
    }

    const http = new Http();
    // Solo viaja la extensión útil: el backend descarta el resto del nombre.
    const response = await http.authPost("/storage/upload_url", {
      kind,
      content_type: contentType,
      filename: file.name,
    });
    if (!response.request || response.request.status !== 200) {
      throw new Error(await backendErrorMessage(response, "No se pudo obtener la URL de subida"));
    }
    const { upload_url: uploadUrl, public_url: publicUrl } = await response.request.json();

    await putFile(uploadUrl, file, contentType, onProgress);
    return publicUrl;
  }
}

export default new StorageService();
