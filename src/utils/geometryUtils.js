/**
 * GeometryUtils
 * Utilidades matemáticas para cálculo de ángulos y distancias en 2D y 3D.
 */
export default class GeometryUtils {
  /**
   * Calcula el ángulo 2D proyectado en el vértice p2 formado por los segmentos p1-p2 y p3-p2 (en grados).
   * @param {Object} p1 - Punto 1 { x, y } (coordenadas normalizadas 0-1)
   * @param {Object} p2 - Vértice { x, y } (coordenadas normalizadas 0-1)
   * @param {Object} p3 - Punto 3 { x, y } (coordenadas normalizadas 0-1)
   * @param {number} width - Ancho real o factor de escala X (default 1)
   * @param {number} height - Alto real o factor de escala Y (default 1)
   * @returns {number} Ángulo en grados
   */
  static calculateAngle(p1, p2, p3, width = 1, height = 1) {
    if (!p1 || !p2 || !p3) return 0;
    const v1x = (p1.x - p2.x) * width;
    const v1y = (p1.y - p2.y) * height;
    const v2x = (p3.x - p2.x) * width;
    const v2y = (p3.y - p2.y) * height;
    
    const dotProduct = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    // Clamp para evitar NaN por errores de punto flotante
    const cosAngle = Math.min(1, Math.max(-1, dotProduct / (mag1 * mag2)));
    return Math.acos(cosAngle) * (180 / Math.PI);
  }

  /**
   * Calcula el ángulo 3D real en el vértice p2 formado por los segmentos p1-p2 y p3-p2 (en grados).
   * @param {Object} p1 - Punto 1 { x, y, z }
   * @param {Object} p2 - Vértice { x, y, z }
   * @param {Object} p3 - Punto 3 { x, y, z }
   * @returns {number} Ángulo en grados
   */
  static calculate3DAngle(p1, p2, p3) {
    if (!p1 || !p2 || !p3) return 0;
    const v1x = p1.x - p2.x;
    const v1y = p1.y - p2.y;
    const v1z = p1.z - p2.z;
    
    const v2x = p3.x - p2.x;
    const v2y = p3.y - p2.y;
    const v2z = p3.z - p2.z;
    
    const dotProduct = v1x * v2x + v1y * v2y + v1z * v2z;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    // Clamp para evitar NaN por errores de punto flotante
    const cosAngle = Math.min(1, Math.max(-1, dotProduct / (mag1 * mag2)));
    return Math.acos(cosAngle) * (180 / Math.PI);
  }
}
