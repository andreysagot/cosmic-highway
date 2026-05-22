/**
 * @file App.js
 * @description Punto de entrada principal y bucle maestro de la simulación Cosmic Highway.
 */

import * as THREE from 'three';
import { MathUtils } from '../utils/MathUtils.js';
import { UIManager } from '../ui/UIManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { Engine } from './Engine.js';
import { EntityManager } from './EntityManager.js';
import { AppConfig } from '../config/AppConfig.js';

class App {
  constructor() {
    this.engine = new Engine();
    
    // Inyectamos el callback para cuando se pierda el audio
    this.audioManager = new AudioManager(() => this.handleAudioLost());
    
    this.uiManager = new UIManager(
      () => this.startAudio(),
      (enabled) => {
        this.entityManager.toggleHighway(this.engine.scene, enabled);
      }
    );
    
    this.entityManager = new EntityManager(this.engine.scene);

    this.state = {
      delta: 0,
      timeAccumulator: 0,
      colorTimeAccumulator: 0,
      globalColorPhase: 0.0,
      worldTravel: 10.0,
      roadFlowOffset: 0.0,
      baseSpeed: AppConfig.engine.baseSpeed,
      distanceStep: 0,
      generalEnergyFactor: 0
    };

    this.camState = {
      currentCamPos: new THREE.Vector3(0, 5, 10),
      currentCamTarget: new THREE.Vector3(0, 0, -30),
      pCenter: new THREE.Vector3(),
      pCenterAhead: new THREE.Vector3(),
      desiredCamPos: new THREE.Vector3(),
      desiredCamTarget: new THREE.Vector3(),
      smoothedCamHeight: 5.0,
      smoothedLookHeight: 0.0,
      smoothedCamRoll: 0.0
    };

    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();

    this.clock = new THREE.Clock();
    
    // Iniciamos el bucle inmediatamente para que sirva de fondo animado
    this.animate = this.animate.bind(this);
    this.animate(); 
  }

  async startAudio() {
    const success = await this.audioManager.initAudioCapture();
    if (success) {
      this.uiManager.markAudioInitialized();
      
      // Reiniciamos el reloj para evitar que el delta sea enorme
      // por el tiempo que el usuario pasó mirando el menú de inicio
      this.clock.start(); 
    } else {
      this.uiManager.showWelcomeScreen();
    }
  }

  handleAudioLost() {
    // Cuando perdemos el audio, solo mostramos la UI.
    // El motor seguirá corriendo en modo "inactivo" (con volumen 0)
    // gracias a que el AudioManager devuelve valores nulos de forma segura.
    this.uiManager.showWelcomeScreen();
  }

  updateCamera(audioData) {
    const s = this.state;
    const c = this.camState;
    
    MathUtils.calculatePathGeometry(s.worldTravel + 12, s.timeAccumulator, c.pCenter);
    MathUtils.calculatePathGeometry(s.worldTravel - 70, s.timeAccumulator, c.pCenterAhead);
    
    const volNorm = audioData.volGeneral * 0.00392156862; 
    const lerpFactor = 0.01 + (0.025 * volNorm);

    c.smoothedCamHeight += ((9.5 + (volNorm * 14.0)) - c.smoothedCamHeight) * lerpFactor;
    c.smoothedLookHeight += ((c.pCenterAhead.y + 4.0 + (volNorm * 3.5)) - c.smoothedLookHeight) * lerpFactor;

    c.desiredCamPos.set(c.pCenter.x, c.pCenter.y + c.smoothedCamHeight, c.pCenter.z + 8.0);
    c.desiredCamTarget.set(c.pCenterAhead.x, c.smoothedLookHeight, c.pCenterAhead.z);

    c.currentCamPos.lerp(c.desiredCamPos, lerpFactor);
    c.currentCamTarget.lerp(c.desiredCamTarget, lerpFactor);

    const targetRoll = (c.pCenterAhead.x - c.pCenter.x) * 0.008 * (1.0 + (audioData.bassAvg * 0.00392156862 * 0.8));
    c.smoothedCamRoll += (targetRoll - c.smoothedCamRoll) * lerpFactor;

    this.engine.updateCameraLights(c.currentCamPos, c.currentCamTarget, c.smoothedCamRoll, audioData.bassAvg, audioData.highAvg);
  }

  animate() {
    requestAnimationFrame(this.animate);

    let delta = this.clock.getDelta();
    if (delta > 0.1) delta = 0.016; // Umbral de protección contra tirones de lag

    this.state.delta = delta;
    this.state.timeAccumulator = (this.state.timeAccumulator + delta) % 2000.0;

    // Si no hay audio, esto devuelve 0s de forma segura
    const audioData = this.audioManager.update(delta);

    // Si audioData viene en cero (menú de inicio), la velocidad será solo baseSpeed
    const speed = this.state.baseSpeed + audioData.volGeneral * 0.75;
    this.state.distanceStep = speed * delta;
    this.state.worldTravel += this.state.distanceStep;
    this.state.roadFlowOffset += this.state.distanceStep;
    
    const velocityNorm = MathUtils.clamp01((speed - this.state.baseSpeed) / 15.0);
    this.state.generalEnergyFactor = MathUtils.clamp01(audioData.volGeneral * 0.04 + velocityNorm * 0.4);
    
    this.state.colorTimeAccumulator += delta * (0.25 + (audioData.volGeneral * 0.012));
    this.state.globalColorPhase += delta * (0.06 + audioData.volGeneral * 0.25);

    this.updateCamera(audioData);

    this.entityManager.update(
      this.state,
      audioData,
      this.camState.currentCamPos
    );

    this.engine.render();
  }
}

window.onload = () => new App();