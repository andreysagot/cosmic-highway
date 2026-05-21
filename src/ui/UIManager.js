/**
 * @file UIManager.js
 * @description Controlador de la interfaz de usuario, eventos del DOM y gestión del modo de pantalla completa.
 */

export class UIManager {
  constructor(onAudioInitRequest, onToggleHighway) {
    this.audioBtn = document.getElementById('audio-btn');
    this.welcomeOverlay = document.getElementById('welcome-overlay');
    this.fsFallbackBtn = document.getElementById('fs-fallback-btn');
    this.highwayToggle = document.getElementById('highway-toggle');
    
    this.hideCursorTimer = null;
    this.onAudioInitRequest = onAudioInitRequest;
    
    this.onToggleHighway = typeof onToggleHighway === 'function' ? onToggleHighway : () => {
      console.warn("UIManager: onToggleHighway callback no proporcionado.");
    };

    this.isAudioInitialized = false;
    this.isHighwayEnabled = true;

    // Binding estricto para prevenir memory leaks
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
      setTimeout(() => this.welcomeOverlay.remove(), 800);
    }
    
    try {
      this.forceFullscreen();
    } catch (e) {
      console.warn("Autoplay fullscreen omitido por el navegador.");
    }
  }

  isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  forceFullscreen() {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(e => console.warn("Fullscreen error:", e));
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    }
  }

  handleFullscreenChange() {
    const controls = document.getElementById('controls-container');
    
    if (!controls) return;

    // Aseguramos que el elemento tenga una transición suave
    controls.style.transition = 'opacity 0.3s ease-in-out';

    if (this.isFullscreen()) {
      // Modo pantalla completa: ocultar controles
      controls.style.opacity = '0';
      controls.style.pointerEvents = 'none'; // Evita que se pueda clickear por error
      this.startCursorHideTimer();
    } else {
      // Modo ventana: mostrar controles
      clearTimeout(this.hideCursorTimer);
      document.documentElement.style.cursor = '';
      
      if (this.isAudioInitialized) {
        controls.style.opacity = '1';
        controls.style.pointerEvents = 'auto';
      }
    }
  }

  startCursorHideTimer() {
    const fsEl = document.documentElement;
    fsEl.style.cursor = '';
    clearTimeout(this.hideCursorTimer);
    this.hideCursorTimer = setTimeout(() => {
      if (this.isFullscreen()) fsEl.style.cursor = 'none';
    }, 2000);
  }
}