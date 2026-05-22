/**
 * @file UIManager.js
 * @description Controlador de la interfaz de usuario, eventos del DOM y gestión del modo de pantalla completa.
 */

import { createIcons } from 'lucide';
import * as icons from 'lucide';

export class UIManager {
  constructor(onAudioInitRequest, onToggleHighway) {
    this.audioBtn = document.getElementById('audio-btn');
    this.welcomeOverlay = document.getElementById('welcome-overlay');
    this.fsFallbackBtn = document.getElementById('fs-fallback-btn');
    this.highwayToggle = document.getElementById('highway-toggle');
    this.controls = document.getElementById('controls-container');

    if (this.controls) {
      this.controls.style.opacity = '1';
      this.controls.style.transition = 'opacity 0.5s ease-in-out';
    }
    
    this.wakeLock = null;
    this.initIcons();
    this.handleFullscreenChange();

    this.hideCursorTimer = null;
    this.onAudioInitRequest = onAudioInitRequest;
    
    this.onToggleHighway = typeof onToggleHighway === 'function' ? onToggleHighway : () => {};

    this.isAudioInitialized = false;
    this.isHighwayEnabled = true;

    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);

    this.initEvents();
  }

  initEvents() {
    if (this.audioBtn) {
      this.audioBtn.addEventListener('click', () => {
        if (typeof this.onAudioInitRequest === 'function') this.onAudioInitRequest();
      }, { passive: true });
    }
    
    if (this.fsFallbackBtn) {
      this.fsFallbackBtn.addEventListener('click', () => this.forceFullscreen(), { passive: true });
    }

    if (this.highwayToggle) {
      this.highwayToggle.addEventListener('change', () => {
        this.isHighwayEnabled = this.highwayToggle.checked;
        this.onToggleHighway(this.isHighwayEnabled);
      }, { passive: true });
    }

    document.addEventListener('fullscreenchange', this.handleFullscreenChange, { passive: true });
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange, { passive: true });
    document.addEventListener('mousemove', this.handleMouseMove, { passive: true });
  }

  handleMouseMove() {
    if (!this.isFullscreen()) return;
    this.startCursorHideTimer();
  }

  markAudioInitialized() {
    this.isAudioInitialized = true;
    if(this.welcomeOverlay) {
      this.welcomeOverlay.classList.add('hidden');
      // En lugar de remove(), lo ocultamos para poder reutilizarlo
      setTimeout(() => {
          this.welcomeOverlay.style.display = 'none';
      }, 800);
    }
    
    try {
      this.forceFullscreen();
    } catch (e) {
      console.warn("Autoplay fullscreen omitido por el navegador.");
    }
  }

  /**
   * Restaura la pantalla de inicio si se pierden los permisos de audio
   */
  showWelcomeScreen() {
    this.isAudioInitialized = false;
    
    // Restaurar el cursor por si quedó oculto
    document.documentElement.style.cursor = 'default';
    
    if (this.welcomeOverlay) {
      this.welcomeOverlay.style.display = 'flex'; // Asegura que vuelva al flujo del DOM
      
      // Pequeño timeout para permitir que el display:flex se aplique antes de animar opacidad
      setTimeout(() => {
        this.welcomeOverlay.classList.remove('hidden');
      }, 50);
    }

    // Salir de pantalla completa si estaba activa
    if (this.isFullscreen()) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }

  initIcons() {
    createIcons({ icons, attrs: { 'stroke-width': 2 } });
  }

  updateIcon(element, iconName) {
    const iTag = element.querySelector('i');
    if (iTag) {
      iTag.setAttribute('data-lucide', iconName);
      createIcons({ icons, attrs: { 'stroke-width': 2 } });
    }
  }

  isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.error(`Error Wake Lock: ${err.name}`);
    }
  }

  async releaseWakeLock() {
    if (this.wakeLock !== null) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }
  }

  async forceFullscreen() {
    const isCurrentlyFullscreen = this.isFullscreen();
    if (!isCurrentlyFullscreen) {
      try {
        await this.requestWakeLock();
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) await docEl.requestFullscreen();
        else if (docEl.webkitRequestFullscreen) await docEl.webkitRequestFullscreen();
      } catch (err) {
        await this.releaseWakeLock();
      }
    } else {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      await this.releaseWakeLock();
    }
  }

  handleFullscreenChange() {
    if (!this.controls) return;

    const fsBtn = document.getElementById('fs-fallback-btn');
    const span = fsBtn?.querySelector('span');
    const isFS = this.isFullscreen();

    const oldIcon = fsBtn?.querySelector('svg');
    if (oldIcon) oldIcon.remove();

    let iconTag = fsBtn?.querySelector('i');
    if (!iconTag) {
        iconTag = document.createElement('i');
        fsBtn.prepend(iconTag);
    }
    
    iconTag.setAttribute('data-lucide', isFS ? 'shrink' : 'expand');
    if (span) span.textContent = isFS ? '' : '';

    createIcons({ icons, attrs: { 'stroke-width': 2 } });
    
    if (!isFS) {
        document.documentElement.style.cursor = 'default';
        this.controls.style.opacity = '1';
        this.controls.style.pointerEvents = 'auto';
    }
  }

  startCursorHideTimer() {
    const fsEl = document.documentElement;
    fsEl.style.cursor = 'default';
    if (this.controls) {
      this.controls.style.opacity = '1';
      this.controls.style.pointerEvents = 'auto';
    }
    
    clearTimeout(this.hideCursorTimer);
    
    this.hideCursorTimer = setTimeout(() => {
      if (this.isFullscreen()) {
        fsEl.style.cursor = 'none';
        if (this.controls) {
          this.controls.style.opacity = '0';
          this.controls.style.pointerEvents = 'none';
        }
      }
    }, 2000);
  }
}