/**
 * @file Engine.js
 * @description Encapsula el núcleo de renderizado de WebGL, inicialización de cámaras, niebla y la gestión lumínica del entorno.
 */

import * as THREE from 'three';
import Stats from 'stats.js';
import { AppConfig } from '../config/AppConfig.js';

export class Engine {
  constructor() {
    const cfg = AppConfig.engine;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(cfg.fogColor, cfg.fogDensity);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      5500
    );
    this.camera.position.set(0, 5, 10);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    this.maxDpr = isMobile ? AppConfig.engine.maxDprMobile : AppConfig.engine.maxDprDesktop;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.maxDpr));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.initLights();
    this.initResizeHandler();
    this.initStats();
    this.initContextListeners();
  }

  /** @private */
  initStats() {
    this.stats = new Stats();
    this.stats.showPanel(0);
    const dom = this.stats.dom;
    dom.style.position = 'fixed';
    dom.style.top = '20px';
    dom.style.left = '20px';
    dom.style.zIndex = '9999';
    dom.style.borderRadius = '6px';
    dom.style.opacity = '0.9';
    document.body.appendChild(dom);
  }

  /** @private */
  initLights() {
    this.leftLight = new THREE.PointLight(0x6688ff, 420, 260);
    this.rightLight = new THREE.PointLight(0xffffff, 520, 320);
    this.scene.add(this.leftLight);
    this.scene.add(this.rightLight);
  }

  /** @private */
  initResizeHandler() {
    this.resizeRAF = null;
    this.onResize = () => {
      if (this.resizeRAF) cancelAnimationFrame(this.resizeRAF);
      
      this.resizeRAF = requestAnimationFrame(() => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.maxDpr));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.resizeRAF = null;
      });
    };
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  /** @private */
  initContextListeners() {
    this.onContextLost = (e) => {
      e.preventDefault();
      console.warn('WebGL context lost. Pausing simulation loops.');
    };
    this.onContextRestored = () => {
      console.warn('WebGL context restored. Re-uploading GPU buffers.');
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost, false);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored, false);
  }

  /**
   * Actualiza las transformaciones de la cámara y las intensidades reactivas de las luces.
   */
  updateCameraLights(currentCamPos, currentCamTarget, roll, bassAvg, highAvg) {
    this.camera.position.copy(currentCamPos);
    this.camera.lookAt(currentCamTarget);
    this.camera.rotation.z = roll;

    // Reposicionamiento de los PointLights relativos a la cámara
    const lightZ = currentCamPos.z - 25;
    this.leftLight.position.set(currentCamPos.x - 20, currentCamPos.y + 4, lightZ);
    this.rightLight.position.set(currentCamPos.x + 20, currentCamPos.y + 4, lightZ);

    this.leftLight.intensity = 200 + bassAvg * 7;
    this.rightLight.intensity = 200 + highAvg * 14;
  }

  render() {
    this.stats.begin();
    this.renderer.render(this.scene, this.camera);
    this.stats.end();
  }
}