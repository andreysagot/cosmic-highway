/**
 * @file EntityManager.js
 * @description Orquestador del ciclo de vida y despacho de actualizaciones de los componentes visuales interactivos de la escena.
 */

import { 
  AudioTunnel, 
  Stars, 
  BlackHole
} from '../entities/index.js';

export class EntityManager {
  /**
   * @param {THREE.Scene} scene - Instancia de la escena global.
   */
  constructor(scene) {
    this.entities = {
      audioTunnel: new AudioTunnel(scene),
      stars: new Stars(scene),
      blackHole: new BlackHole(scene)
    };
  }

  /**
   * Propaga el bucle de renderizado a todos los objetos bajo gestión.
   */
  update(state, audioData, cameraPos) {
    this.entities.audioTunnel.update(state, audioData);
    this.entities.stars.update(state);
    this.entities.blackHole.update(state, cameraPos);
  }

  /**
   * Modifica el estado de renderizado del túnel.
   */
  toggleHighway(scene, enabled) {
    this.entities.audioTunnel.toggle(scene, enabled);
  }
}