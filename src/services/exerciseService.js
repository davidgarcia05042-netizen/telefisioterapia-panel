import Http from "@/lib/http";
import StorageService, { backendErrorMessage } from "@/lib/storageService";

class ExerciseService {
  async updateMetadata(exerciseId, payload) {
    const http = new Http();
    return http.authPut(`/exercises/${exerciseId}/`, payload);
  }

  // sube el video de referencia a Supabase y avisa al backend con la URL
  // pública; el backend lo envía al Servicio de Procesamiento
  async uploadVideoThenNotifyBackend(exerciseId, file, points = "", onProgress) {
    const url = await StorageService.uploadVideo(file, "exercise", onProgress);
    const http = new Http();
    return http.authPost(`/exercises/${exerciseId}/video/`, { video: url, points });
  }

  // función de alto nivel que aplica la lógica: metadata + video (opcional) + points
  async saveExercise({ exerciseId, metadata, file = null, points = "", existingVideoUrl = null, onProgress }) {
    // 1) actualizar metadata si existe
    if (metadata) {
      const metaResp = await this.updateMetadata(exerciseId, metadata);
      const status = metaResp.request?.status ?? metaResp.status;
      if (![200, 201].includes(status)) {
        return { ok: false, step: "metadata", response: metaResp };
      }
    }

    // 2) subir video si se proporcionó o actualizar puntos si cambiaron y hay un video existente
    if (file) {
      try {
        const uploadResp = await this.uploadVideoThenNotifyBackend(exerciseId, file, points, onProgress);
        const status = uploadResp.request?.status ?? uploadResp.status;
        if (![200, 201].includes(status)) {
          const message = await backendErrorMessage(uploadResp, "El servidor rechazó el video");
          return { ok: false, step: "video", response: uploadResp, message };
        }
        return { ok: true, step: "video", response: uploadResp };
      } catch (err) {
        return { ok: false, step: "video", error: err, message: err.message };
      }
    } else if (existingVideoUrl && points) {
      try {
        const http = new Http();
        const resp = await http.authPost(`/exercises/${exerciseId}/video/`, { video: existingVideoUrl, points });
        const status = resp.request?.status ?? resp.status;
        if (![200, 201].includes(status)) {
          const message = await backendErrorMessage(resp, "El servidor rechazó los puntos");
          return { ok: false, step: "points", response: resp, message };
        }
        return { ok: true, step: "points", response: resp };
      } catch (err) {
        return { ok: false, step: "points", error: err };
      }
    }

    return { ok: true, step: "metadata-only" };
  }
}

export default new ExerciseService();
