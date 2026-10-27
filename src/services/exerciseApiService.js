import Http from '@/lib/http';

/**
 * ExerciseApiService
 * Responsabilidad única: gestionar todas las llamadas HTTP relacionadas con ejercicios.
 */
export default class ExerciseApiService {
  constructor() {
    this.http = new Http();
  }

  async getExercise(exerciseId) {
    return this.http.authGet(`/exercises/${exerciseId}`);
  }

  async getPointsTracked(exerciseId) {
    return this.http.authGet(`/exercises/${exerciseId}/points_tracked/`);
  }

  async getDifficulties(exerciseId) {
    return this.http.authGet(`/exercises/${exerciseId}/difficulties/`);
  }

  async sendResults(exerciseId, observedResults) {
    const payload = {
      error: false,
      results: {
        points: Object.entries(observedResults).map(([center, data]) => ({
          center,
          max_angle: data.max === -Infinity ? 0 : parseFloat(data.max.toFixed(2)),
          min_angle: data.min === Infinity ? 0 : parseFloat(data.min.toFixed(2)),
        })),
      },
    };
    return this.http.authPost(`/exercises/${exerciseId}/video_results/`, payload);
  }
}
