/**
 * @file AudioManager.js
 * @description Maneja la captura de audio por hardware y el análisis de la Transformada Rápida de Fourier (FFT).
 */

import { MathUtils } from '../utils/MathUtils.js';

export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.isAudioInitialized = false;
    this.activeStream = null;
    
    // Debería importarse de AppConfig, pero lo mantenemos aquí por autonomía
    this.BANDS_COUNT = 256;
    this.FFT_SIZE = 512;

    this.AUDIO_BANDS = {
      sub:  { minHz: 20,   maxHz: 60,    value: 0, smooth: 0, velocity: 0, peak: 0, isOpen: false, attackSpeed: 15.0, releaseSpeed: 2.0 },
      bass: { minHz: 60,   maxHz: 250,   value: 0, smooth: 0, velocity: 0, peak: 0, isOpen: false, attackSpeed: 20.0, releaseSpeed: 2.5 },
      low:  { minHz: 250,  maxHz: 500,   value: 0, smooth: 0, velocity: 0, peak: 0, isOpen: false, attackSpeed: 25.0, releaseSpeed: 3.0 },
      mid:  { minHz: 500,  maxHz: 2000,  value: 0, smooth: 0, velocity: 0, peak: 0, isOpen: false, attackSpeed: 30.0, releaseSpeed: 4.0 },
      high: { minHz: 2000, maxHz: 6000,  value: 0, smooth: 0, velocity: 0, peak: 0, isOpen: false, attackSpeed: 45.0, releaseSpeed: 6.0 },
      air:  { minHz: 6000, maxHz: 20000, value: 0, smooth: 0, velocity: 0, peak: 0, isOpen: false, attackSpeed: 55.0, releaseSpeed: 8.0 }
    };

    this.VISUAL_CONFIG = { noiseGateOn: 0.04, noiseGateOff: 0.02, gravity: 0.5, visualPunch: 0.85 };
  }

  /**
   * Solicita permisos e inicializa el contexto de audio del navegador.
   * @returns {Promise<boolean>} Éxito de la inicialización.
   */
  async initAudioCapture() {
    if (this.isAudioInitialized) return true;

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    try {
      const audioOptions = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
      
      if (isMobile || !navigator.mediaDevices.getDisplayMedia) {
        this.activeStream = await navigator.mediaDevices.getUserMedia({ audio: audioOptions });
      } else {
        this.activeStream = await navigator.mediaDevices.getDisplayMedia({ video: { width: 1 }, audio: audioOptions });
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.83;

      const source = this.audioContext.createMediaStreamSource(this.activeStream);
      source.connect(this.analyser);
      
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isAudioInitialized = true;
      return true;

    } catch (err) {
      console.error("Error al inicializar AudioContext:", err);
      alert("Permiso denegado: Se requiere acceso al dispositivo de audio.");
      return false;
    }
  }

  /** @private */
  freqToIndex(freq) {
    if (!this.audioContext || !this.analyser) return 0;
    const nyquist = this.audioContext.sampleRate * 0.5;
    const index = Math.round((freq / nyquist) * this.analyser.frequencyBinCount);
    return Math.min(Math.max(index, 0), this.analyser.frequencyBinCount - 1);
  }

  /** @private */
  getBandAverage(bandKey) {
    if (!this.dataArray) return 0;
    const band = this.AUDIO_BANDS[bandKey];
    let sum = 0, count = 0;
    
    const minIdx = this.freqToIndex(band.minHz);
    const maxIdx = this.freqToIndex(band.maxHz);
    
    for (let i = minIdx; i <= maxIdx; i++) {
      sum += this.dataArray[i];
      count++;
    }
    
    // Multiplicación por inverso es más rápida que división
    const rawAvg = count > 0 ? (sum / count) * 0.00392156862 : 0;
    
    if (band.isOpen) { 
        if (rawAvg < this.VISUAL_CONFIG.noiseGateOff) band.isOpen = false;
    } else { 
        if (rawAvg > this.VISUAL_CONFIG.noiseGateOn) band.isOpen = true;
    }

    if (!band.isOpen) return 0;
    return Math.pow(Math.max(0, (rawAvg - this.VISUAL_CONFIG.noiseGateOff) / (1.0 - this.VISUAL_CONFIG.noiseGateOff)), this.VISUAL_CONFIG.visualPunch);
  }

  /**
   * Actualiza el análisis espectral y procesa la física de las bandas (envolvente ADSR simplificada).
   */
  update(delta) {
    if (!this.isAudioInitialized || !this.analyser) {
        return { volGeneral: 0, bassAvg: 0, highAvg: 0, isReady: false };
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    let total = 0;
    
    // Se procesa la dinámica de fluidos / inercia para cada banda
    for (const key in this.AUDIO_BANDS) {
      const band = this.AUDIO_BANDS[key];
      band.value = this.getBandAverage(key);
      
      const attack = 1.0 - Math.exp(-delta * band.attackSpeed);
      const release = 1.0 - Math.exp(-delta * band.releaseSpeed);
      
      if (band.value > band.smooth) {
        band.smooth += (band.value - band.smooth) * attack;
        band.velocity = 0;
        band.peak = Math.max(band.peak, band.value);
      } else {
        band.velocity += this.VISUAL_CONFIG.gravity * delta;
        band.smooth -= band.velocity * delta;
        band.smooth += (band.value - band.smooth) * release;
      }
      band.smooth = MathUtils.clamp01(band.smooth);
    }

    for (let i = 0; i < this.BANDS_COUNT; i++) {
        total += this.dataArray[i];
    }

    return {
      isReady: true,
      volGeneral: total * 0.00390625,
      bassAvg: this.AUDIO_BANDS.bass.smooth * 255.0,
      highAvg: this.AUDIO_BANDS.high.smooth * 255.0,
      dataArray: this.dataArray,
      audioBands: this.AUDIO_BANDS
    };
  }
}