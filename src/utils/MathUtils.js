/**
 * @file MathUtils.js
 * @description Funciones utilitarias matemáticas de alto rendimiento para WebGL.
 */

export class MathUtils {
  static mix(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  static clamp01(v) {
    return v < 0 ? 0 : (v > 1 ? 1 : v);
  }

  static smoothstep(min, max, v) {
    const x = v <= min ? 0 : (v >= max ? 1 : (v - min) / (max - min));
    return x * x * (3 - 2 * x);
  }

  static triWeight(t, center, width) {
    const v = 1.0 - Math.abs(t - center) / width;
    return v > 0 ? v : 0;
  }

  /**
   * Calcula la topología espacial de la curva geométrica en un punto Z específico.
   * @param {number} z - Posición de profundidad en el eje Z.
   * @param {number} timeOffset - Acumulador de tiempo global.
   * @param {THREE.Vector3} out - Objeto Vector3 de salida (evita allocations O(1)).
   * @returns {THREE.Vector3}
   */
  static calculatePathGeometry(z, timeOffset, out) {
    const macroScale = 0.012; 
    let x = Math.sin(z * macroScale + timeOffset * 0.25) * 20.0 
          + Math.cos(z * macroScale * 0.5 + timeOffset * 0.12) * 8.0; 
    let y = Math.cos(z * macroScale * 0.7 + timeOffset * 0.15) * 10.0; 

    const tNoise = timeOffset * 0.2; 
    const n1X = Math.sin(z * 0.027 + tNoise * 0.73 + 1.5) * Math.cos(z * 0.011 - tNoise * 0.31); 
    const n2X = Math.sin(z * 0.063 - tNoise * 1.15 + 4.2) * Math.sin(z * 0.035 + tNoise * 0.61); 
    const n1Y = Math.cos(z * 0.021 + tNoise * 0.52 + 2.7) * Math.sin(z * 0.014 + tNoise * 0.44); 
    
    x += (n1X * 6.5) + (n2X * 2.0); 
    y += (n1Y * 4.5); 

    out.set(x, y, z); 
    return out; 
  }
}