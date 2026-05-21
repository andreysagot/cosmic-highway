/**
 * @file UIManager.js
 * @description Controlador de la interfaz de usuario, eventos del DOM y gestión del modo de pantalla completa.
 */

import { createIcons } from 'lucide';
import * as icons from 'lucide'; // Esto importa toda la librería como un objeto 'icons'

export class UIManager {
  constructor(onAudioInitRequest, onToggleHighway) {
    this.audioBtn = document.getElementById('audio-btn');
    this.welcomeOverlay = document.getElementById('welcome-overlay');
    this.fsFallbackBtn = document.getElementById('fs-fallback-btn');
    this.highwayToggle = document.getElementById('highway-toggle');
    this.controls = document.getElementById('controls-container');

    if (this.controls) {
      this.controls.style.opacity = '1'; // Inician visibles
      this.controls.style.transition = 'opacity 0.5s ease-in-out'; // Transición suave
    }
    
    this.wakeLock = null;
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

  // Solicitar bloqueo de pantalla
  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake Lock activo: Pantalla encendida');
      }
    } catch (err) {
      console.error(`Error al activar Wake Lock: ${err.name}, ${err.message}`);
    }
  }

  // Liberar bloqueo de pantalla
  async releaseWakeLock() {
    if (this.wakeLock !== null) {
      await this.wakeLock.release();
      this.wakeLock = null;
      console.log('Wake Lock liberado');
    }
  }

  async forceFullscreen() {
    if (!this.isFullscreen()) {
      // ENTRANDO: Solicitamos Wake Lock primero
      await this.requestWakeLock();
      
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) await docEl.requestFullscreen();
      else if (docEl.webkitRequestFullscreen) await docEl.webkitRequestFullscreen();
    } else {
      // SALIENDO: Liberamos Wake Lock
      await this.releaseWakeLock();
      
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    }
  }

  handleFullscreenChange() {
    if (!this.controls) return;

    const fsBtn = document.getElementById('fs-fallback-btn');
    const span = fsBtn?.querySelector('span');
    
    // 1. ELIMINAR el icono viejo para asegurar un render fresco
    const oldIcon = fsBtn?.querySelector('i, svg');
    if (oldIcon) oldIcon.remove();

    // 2. CREAR un nuevo elemento <i> para el nuevo icono
    const newIcon = document.createElement('i');
    newIcon.setAttribute('data-lucide', this.isFullscreen() ? 'shrink' : 'expand');
    fsBtn.prepend(newIcon); // Lo ponemos al principio del botón

    // 3. Actualizar texto
    if (span) span.textContent = this.isFullscreen() ? '' : '';

    // 4. Renderizar iconos
    createIcons({
      icons, // El objeto que importamos como * as icons
      attrs: { 'stroke-width': 2 }
    });
  }

  startCursorHideTimer() {
    const fsEl = document.documentElement;
    
    // 1. Siempre mostrar al mover el mouse
    fsEl.style.cursor = 'default'; // Restaurar cursor
    if (this.controls) {
      this.controls.style.opacity = '1';
      this.controls.style.pointerEvents = 'auto';
    }
    
    // 2. Limpiar timer previo para evitar conflictos
    clearTimeout(this.hideCursorTimer);
    
    // 3. Iniciar nuevo ciclo de 2 segundos
    this.hideCursorTimer = setTimeout(() => {
      if (this.isFullscreen()) {
        fsEl.style.cursor = 'none'; // Ocultar cursor
        if (this.controls) {
          this.controls.style.opacity = '0';
          this.controls.style.pointerEvents = 'none';
        }
      }
    }, 2000);
  }
}