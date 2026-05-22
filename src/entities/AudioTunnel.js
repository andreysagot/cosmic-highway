/**
 * @file AudioTunnel.js
 * @description Entidad procedimental que genera y deforma un túnel de partículas interactivo basado en datos FFT de audio.
 */

import * as THREE from 'three';
import { MathUtils } from '../utils/MathUtils.js';
import { AppConfig } from '../config/AppConfig.js';
import { TunnelVertexShader } from '../shaders/tunnel.vertex.js';
import { TunnelFragmentShader } from '../shaders/tunnel.fragment.js';

export class AudioTunnel {
  constructor(scene) {
    const cfg = AppConfig.tunnel;
    this.bandsCount = AppConfig.audio.bandsCount;
    this.depthCount = cfg.depthCount;
    this.totalParticles = this.bandsCount * this.depthCount;
    
    this.tunnelRadius = cfg.radius; 
    this.roadLength = cfg.roadLength; 
    this.roadStep = cfg.roadStep;

    this.smoothedEnergy = new Float32Array(this.bandsCount);
    this.transientEnergy = new Float32Array(this.bandsCount);
    this.laneTonal = new Float32Array(this.bandsCount);
    
    this.isVisible = true;
    this.smoothedGeneralEnergy = 0.0;

    // Spline variables
    this.pathSegments = 32;
    this.pathPoints = [];
    for(let i = 0; i < this.pathSegments; i++) {
        this.pathPoints.push(new THREE.Vector3());
    }
    this.tempVec3 = new THREE.Vector3();

    this.initArrays();
    this.initAudioTexture();
    this.initGeometry(scene);
  }

  initArrays() {
    this.laneT = new Float32Array(this.bandsCount);
    this.laneSubW = new Float32Array(this.bandsCount);
    this.laneBassW = new Float32Array(this.bandsCount);
    this.laneLowW = new Float32Array(this.bandsCount);
    this.laneMidW = new Float32Array(this.bandsCount);
    this.laneHighW = new Float32Array(this.bandsCount);
    this.laneAirW = new Float32Array(this.bandsCount);
    this.laneRightBias = new Float32Array(this.bandsCount);
    this.laneReactiveGain = new Float32Array(this.bandsCount);
    this.laneTransientGain = new Float32Array(this.bandsCount);

    for (let b = 0; b < this.bandsCount; b++) {
      const t = b / (this.bandsCount - 1);
      this.laneT[b] = t;
      this.laneSubW[b]  = MathUtils.triWeight(t, 0.04, 0.08);
      this.laneBassW[b] = MathUtils.triWeight(t, 0.12, 0.12);
      this.laneLowW[b]  = MathUtils.triWeight(t, 0.25, 0.16);
      this.laneMidW[b]  = MathUtils.triWeight(t, 0.45, 0.22);
      this.laneHighW[b] = MathUtils.triWeight(t, 0.68, 0.22);
      this.laneAirW[b]  = MathUtils.triWeight(t, 0.90, 0.18);
      
      const rightBias = MathUtils.smoothstep(0.52, 1.0, t);
      this.laneRightBias[b] = rightBias;
      this.laneReactiveGain[b] = 1.0 + rightBias * 0.75;
      this.laneTransientGain[b] = 1.0 + rightBias * 1.10;
    }
  }

  initAudioTexture() {
    this.audioTextureData = new Uint8Array(this.bandsCount * 4);
    this.audioTexture = new THREE.DataTexture(
      this.audioTextureData, 
      this.bandsCount, 
      1, 
      THREE.RGBAFormat
    );
    this.audioTexture.needsUpdate = true;
  }

  generateProceduralTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.1, 'rgba(200, 240, 255, 0.9)');
    grad.addColorStop(0.4, 'rgba(50, 150, 255, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    
    const pTexture = new THREE.CanvasTexture(canvas);
    pTexture.generateMipmaps = false;
    pTexture.minFilter = THREE.LinearFilter;
    pTexture.magFilter = THREE.LinearFilter;
    return pTexture;
  }

  initGeometry(scene) {
    const positions = new Float32Array(this.totalParticles * 3);
    const aParams1 = new Float32Array(this.totalParticles * 4);
    const aParams2 = new Float32Array(this.totalParticles * 4);

    for (let b = 0; b < this.bandsCount; b++) {
      const t = this.laneT[b];
      const angle = Math.random() * Math.PI * 2.0;
      const laneOffset = Math.random() * this.roadStep;
      const lanePhase = laneOffset * 5.0 + t * 10.0;
      const baseHue = 0.55 + (Math.random() * 0.15);
      
      const rightBias = this.laneRightBias[b];
      const reactGain = this.laneReactiveGain[b];
      const heightGain = 1.0 + rightBias * 0.95;
      const lateralGain = 1.0 + rightBias * 1.20;

      for (let d = 0; d < this.depthCount; d++) {
        const idx = b * this.depthCount + d;
        const idx3 = idx * 3;
        const idx4 = idx * 4;

        positions[idx3]     = Math.cos(angle) * this.tunnelRadius; 
        positions[idx3 + 1] = Math.sin(angle) * this.tunnelRadius;
        positions[idx3 + 2] = -d * this.roadStep;

        aParams1[idx4]     = t;
        aParams1[idx4 + 1] = lanePhase;
        aParams1[idx4 + 2] = Math.random() * AppConfig.tunnel.respawnExtra;
        aParams1[idx4 + 3] = baseHue;

        aParams2[idx4]     = reactGain;
        aParams2[idx4 + 1] = heightGain;
        aParams2[idx4 + 2] = lateralGain;
        aParams2[idx4 + 3] = rightBias;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aParams1', new THREE.BufferAttribute(aParams1, 4));
    geometry.setAttribute('aParams2', new THREE.BufferAttribute(aParams2, 4));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uWorldTravel: { value: 0.0 },
        uRoadFlowOffset: { value: 0.0 },
        uGlobalColorPhase: { value: 0.0 },
        uGeneralEnergy: { value: 0.0 },
        uAudioTexture: { value: this.audioTexture },
        uPointTexture: { value: this.generateProceduralTexture() },
        uRoadLength: { value: this.roadLength },
        uAudioReady: { value: 0.0 },
        uPathSpline: { value: this.pathPoints },
        uPathSegments: { value: this.pathSegments }
      },
      vertexShader: TunnelVertexShader,
      fragmentShader: TunnelFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });

    this.mesh = new THREE.Points(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    scene.add(this.mesh);
  }

  toggle(scene, visible) {
    this.isVisible = visible;
    if (this.isVisible) {
      if (!this.mesh.parent) scene.add(this.mesh);
    } else {
      if (this.mesh.parent) scene.remove(this.mesh);
    }
  }

  processAudioData(delta, audioData) {
    const isPlaying = !!(audioData && audioData.isReady);
    const smoothEnergyRate = 1.0 - Math.exp(-delta * 12.0);
    const transientRiseRate = 1.0 - Math.exp(-delta * 25.0);
    const transientFallRate = 1.0 - Math.exp(-delta * 4.0);
    const tonalRiseRate = 1.0 - Math.exp(-delta * 8.0);
    const tonalFallRate = 1.0 - Math.exp(-delta * 1.5);
    
    const subSmooth = isPlaying ? audioData.audioBands.sub.smooth : 0.0;
    const bassSmooth = isPlaying ? audioData.audioBands.bass.smooth : 0.0;
    const lowSmooth = isPlaying ? audioData.audioBands.low.smooth : 0.0;
    const midSmooth = isPlaying ? audioData.audioBands.mid.smooth : 0.0;
    const highSmooth = isPlaying ? audioData.audioBands.high.smooth : 0.0;
    const airSmooth = isPlaying ? audioData.audioBands.air.smooth : 0.0;

    for (let i = 0; i < this.bandsCount; i++) {
      let raw = 0.0;
      if (isPlaying && audioData.dataArray) {
        raw = audioData.dataArray[i] * 0.00392156862;
        if (isNaN(raw)) raw = 0.0;
        raw = Math.pow(Math.max(0.0, raw), 1.5); 
      }
      
      const t = this.laneT[i];
      const spectralTilt = 1.0 + Math.pow(t, 1.2) * 1.8;
      const adjustedRaw = Math.atan(raw * spectralTilt * this.laneReactiveGain[i] * 2.0) * 0.63661977236;

      const prev = this.smoothedEnergy[i];
      const rise = adjustedRaw > prev ? (adjustedRaw - prev) : (adjustedRaw - prev) * 0.5;
      this.smoothedEnergy[i] = prev + (adjustedRaw - prev) * smoothEnergyRate;
      
      const targetTransient = (rise * 4.0) * this.laneTransientGain[i];
      const tRate = targetTransient > this.transientEnergy[i] ? transientRiseRate : transientFallRate;
      this.transientEnergy[i] += (targetTransient - this.transientEnergy[i]) * tRate;

      let rawTonal = subSmooth * this.laneSubW[i] + bassSmooth * this.laneBassW[i] + 
                     lowSmooth * this.laneLowW[i] + midSmooth * this.laneMidW[i] + 
                     highSmooth * this.laneHighW[i] + airSmooth * this.laneAirW[i];
                     
      rawTonal *= (1.0 + this.laneRightBias[i] * 0.42 + this.laneHighW[i] * 0.16 + this.laneAirW[i] * 0.24);
      const targetTonal = isPlaying ? Math.min(1.0, rawTonal * 0.9 + 0.1) : 0.1; 

      const tonalRate = targetTonal > this.laneTonal[i] ? tonalRiseRate : tonalFallRate;
      this.laneTonal[i] += (targetTonal - this.laneTonal[i]) * tonalRate;

      const idx4 = i * 4;
      this.audioTextureData[idx4]     = this.laneTonal[i] * 255;
      this.audioTextureData[idx4 + 1] = Math.min(1.0, this.transientEnergy[i]) * 255;
    }
    this.audioTexture.needsUpdate = true;
  }

  update(state, audioData) {
    if (!this.isVisible) return;
    this.processAudioData(state.delta, audioData);

    const targetEnergy = state.generalEnergyFactor || 0.0;
    this.smoothedGeneralEnergy += (targetEnergy - this.smoothedGeneralEnergy) * (1.0 - Math.exp(-state.delta * 3.0));

    // Pre-calcular el Spline en CPU
    const roadLoopLength = this.roadLength + AppConfig.tunnel.respawnExtra;
    const roadStartZ = state.worldTravel - this.roadLength;
    const step = roadLoopLength / (this.pathSegments - 1);

    for (let i = 0; i < this.pathSegments; i++) {
        const z = roadStartZ + (i * step);
        MathUtils.calculatePathGeometry(z, state.timeAccumulator, this.tempVec3);
        this.pathPoints[i].copy(this.tempVec3);
    }

    const uniforms = this.mesh.material.uniforms;
    uniforms.uTime.value = state.timeAccumulator;
    uniforms.uWorldTravel.value = state.worldTravel;
    uniforms.uRoadFlowOffset.value = state.roadFlowOffset;
    uniforms.uGlobalColorPhase.value = state.globalColorPhase;
    uniforms.uGeneralEnergy.value = this.smoothedGeneralEnergy; 
    uniforms.uAudioReady.value = audioData && audioData.isReady ? 1.0 : 0.0;
    uniforms.uPathSpline.value = this.pathPoints; // Three.js actualiza el buffer automáticamente
  }
}