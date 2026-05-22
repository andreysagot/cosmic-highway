/**
 * @file Stars.js
 * @description Generador cinemático de fondo estelar con shaders orientados a difracción telescópica (Spikes JWST).
 */
import * as THREE from 'three';
import { StarsVertexShader } from '../shaders/stars.vertex.js';
import { StarsFragmentShader } from '../shaders/stars.fragment.js';

export class Stars {
  constructor(scene) {
    this.starCount = 10000; 
    this.starLength = 4000; 
    
    this.flashCycleTimer = 0; 
    this.flashCycleDuration = 5.0 + Math.random() * 10.0; 
    this.winningStarID = -1; 
    this.currentFlashProgress = 0.0; 

    this.initArrays();
    for (let i = 0; i < this.starCount; i++) {
        this.randomizeStar(i, true); 
    }
    
    this.initGeometry(scene);
  }

  /** @private */
  initArrays() {
    this.starPositions = new Float32Array(this.starCount * 3); 
    this.starColors = new Float32Array(this.starCount * 3); 
    this.starSizes = new Float32Array(this.starCount); 
    this.starIDs = new Float32Array(this.starCount); 
    this.starTypes = new Float32Array(this.starCount); 
    this.starZLocal = new Float32Array(this.starCount); 
    this.starXOffset = new Float32Array(this.starCount); 
    this.starYOffset = new Float32Array(this.starCount); 
    this.starSpeedFactor = new Float32Array(this.starCount); 
    
    // Objeto temporal O(1) para evitar allocations
    this.tempStarColor = new THREE.Color(); 
  }

  /** @private */
  getVibrantKelvinColor(k, outColor) {
    if (k >= 30000) outColor.setRGB(0.15, 0.55, 1.00); 
    else if (k >= 15000) outColor.setRGB(0.40, 0.70, 1.00); 
    else if (k >= 9000) outColor.setRGB(0.80, 0.88, 0.95); 
    else if (k >= 7000) outColor.setRGB(0.90, 0.90, 0.82); 
    else if (k >= 5500) outColor.setRGB(0.90, 0.82, 0.62); 
    else if (k >= 4000) outColor.setRGB(0.90, 0.60, 0.32); 
    else outColor.setRGB(0.90, 0.30, 0.12); 
    return outColor; 
  }

  /** @private */
  randomizeStar(i, fullSpread = false) {
    this.starZLocal[i] = fullSpread ? (-Math.random() * this.starLength) : (-this.starLength - Math.random() * 200);

    const getGaussian = () => {
      let u = 0, v = 0;
      while(u === 0) u = Math.random();
      while(v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };

    let x = getGaussian() * 1400;
    let y = getGaussian() * 250;

    const angle = 0.3; 
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    this.starXOffset[i] = x * cosA - y * sinA;
    this.starYOffset[i] = x * sinA + y * cosA; 

    const randClass = Math.random(); 
    let kTemp = 7200, baseSize = 1.0, type = 1; 

    if (randClass < 0.60) { 
      kTemp = 3000; baseSize = 12.0 + Math.random() * 6.0; type = 0; 
    } else if (randClass < 0.85) { 
      kTemp = 4200; baseSize = 22.0 + Math.random() * 8.0; type = 0; 
    } else if (randClass < 0.96) { 
      kTemp = 5600; baseSize = 32.0 + Math.random() * 10.0; type = 1; 
    } else if (randClass < 0.99) { 
      kTemp = 7200; baseSize = 42.0 + Math.random() * 12.0; type = 1; 
    } else { 
      const subRand = Math.random();
      if (subRand < 0.6) {
        kTemp = 9000; baseSize = 55.0 + Math.random() * 15.0; type = 2; 
      } else if (subRand < 0.9) {
        kTemp = 17000; baseSize = 75.0 + Math.random() * 20.0; type = 2; 
      } else {
        kTemp = 35000; baseSize = 100.0 + Math.random() * 25.0; type = 2; 
      }
    }

    this.getVibrantKelvinColor(kTemp, this.tempStarColor); 
    const i3 = i * 3; 
    this.starColors[i3] = this.tempStarColor.r; 
    this.starColors[i3+1] = this.tempStarColor.g; 
    this.starColors[i3+2] = this.tempStarColor.b; 
    
    this.starSizes[i] = baseSize; 
    this.starTypes[i] = type; 
    this.starSpeedFactor[i] = 0.4 + (baseSize / 115.0) * 1.4; 
    this.starIDs[i] = i; 
  }

  initGeometry(scene) {
    this.geometry = new THREE.BufferGeometry();
    
    // Configuración de atributos
    this.positionAttr = new THREE.BufferAttribute(this.starPositions, 3);
    this.positionAttr.setUsage(THREE.DynamicDrawUsage);
    
    this.geometry.setAttribute('position', this.positionAttr);
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.starColors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.starSizes, 1));
    this.geometry.setAttribute('aStarID', new THREE.BufferAttribute(this.starIDs, 1));
    this.geometry.setAttribute('aStarType', new THREE.BufferAttribute(this.starTypes, 1));

    // Material limpio que referencia a los shaders externos
    this.material = new THREE.ShaderMaterial({
      uniforms: { 
        uTime: { value: 0.0 }, 
        uCamZ: { value: 0.0 }, 
        uStarLength: { value: this.starLength }, 
        uWinningID: { value: -1.0 }, 
        uFlashProgress: { value: 0.0 }, 
        uExplosionType: { value: -1.0 } 
      },
      vertexShader: StarsVertexShader,
      fragmentShader: StarsFragmentShader,
      fog: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.frustumCulled = false; 
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
  }

  update(state) {
    this.flashCycleTimer += state.delta; 
    
    if (this.flashCycleTimer >= this.flashCycleDuration) {
      this.flashCycleTimer = 0; 
      this.flashCycleDuration = 5.0 + Math.random() * 10.0; 
      
      const deepStarIndices = []; 
      for (let i = 0; i < this.starCount; i++) { 
        if (this.starZLocal[i] < -800 && this.starZLocal[i] > -2800) deepStarIndices.push(i); 
      } 
      
      if (deepStarIndices.length > 0) {
        this.winningStarID = deepStarIndices[Math.floor(Math.random() * deepStarIndices.length)]; 
        this.material.uniforms.uExplosionType.value = this.starTypes[this.winningStarID]; 
      } else {
        this.winningStarID = -1; 
        this.material.uniforms.uExplosionType.value = -1.0; 
      }
    }

    if (this.winningStarID !== -1 && this.flashCycleTimer < 2.5) {
      this.currentFlashProgress = Math.pow(Math.sin((this.flashCycleTimer / 2.5) * Math.PI), 3.0); 
    } else {
      this.currentFlashProgress = 0.0; 
    }

    this.material.uniforms.uTime.value = state.timeAccumulator; 
    this.material.uniforms.uCamZ.value = state.worldTravel; 
    this.material.uniforms.uWinningID.value = this.winningStarID; 
    this.material.uniforms.uFlashProgress.value = this.currentFlashProgress; 

    const camZLimit = state.worldTravel + 15; 
    const starAdvance = state.distanceStep * 1.1; 
    
    for (let i = 0; i < this.starCount; i++) {
      let zLocal = this.starZLocal[i] + starAdvance * this.starSpeedFactor[i]; 
      let zAbs = state.worldTravel + zLocal; 
      
      if (zAbs > camZLimit) {
        this.randomizeStar(i, false); 
        zLocal = this.starZLocal[i]; 
        zAbs = state.worldTravel + zLocal; 
      } else {
        this.starZLocal[i] = zLocal; 
      }
      
      const idx3 = i * 3; 
      this.starPositions[idx3] = this.starXOffset[i]; 
      this.starPositions[idx3 + 1] = this.starYOffset[i]; 
      this.starPositions[idx3 + 2] = zAbs; 
    }
    
    this.positionAttr.needsUpdate = true; 
  }
}