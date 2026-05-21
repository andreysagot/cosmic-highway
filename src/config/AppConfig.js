/**
 * @file AppConfig.js
 * @description Configuración centralizada y constantes globales para la simulación de la Autopista Cósmica.
 */

export const AppConfig = Object.freeze({
  audio: {
    bandsCount: 256,
    fftSize: 512
  },
  tunnel: {
    depthCount: 850,
    radius: 45.0,
    roadLength: 650,
    frontMargin: 120,
    respawnExtra: 60,
    get roadStep() {
      return (this.roadLength + this.respawnExtra) / this.depthCount;
    }
  },
  engine: {
    baseSpeed: 11.5,
    maxDprMobile: 1.5,
    maxDprDesktop: 2.0,
    fogColor: 0x010003,
    fogDensity: 0x00025
  }
});