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
    if (!this.controls) return;

    if (this.isFullscreen()) {
      // Entrando a Fullscreen: iniciamos el timer para ocultar todo
      this.startCursorHideTimer();
    } else {
      // Saliendo de Fullscreen: limpiamos timers y mostramos todo
      clearTimeout(this.hideCursorTimer);
      document.documentElement.style.cursor = '';
      
      if (this.isAudioInitialized) {
        this.controls.style.opacity = '1';
        this.controls.style.pointerEvents = 'auto';
      }
    }
  }

  startCursorHideTimer() {
    const fsEl = document.documentElement;
    
    // 1. Mostrar controles y cursor al mover el mouse
    fsEl.style.cursor = '';
    if (this.controls) {
      this.controls.style.opacity = '1';
      this.controls.style.pointerEvents = 'auto';
    }
    
    // 2. Limpiar timer previo
    clearTimeout(this.hideCursorTimer);
    
    // 3. Crear nuevo timer de 2 segundos
    this.hideCursorTimer = setTimeout(() => {
      if (this.isFullscreen()) {
        // Ocultar cursor
        fsEl.style.cursor = 'none';
        // Ocultar controles
        if (this.controls) {
          this.controls.style.opacity = '0';
          this.controls.style.pointerEvents = 'none';
        }
      }
    }, 2000);
  }
}