/**
 * @file Stars.js
 * @description Generador cinemático de fondo estelar con shaders orientados a difracción telescópica (Spikes JWST).
 */
import * as THREE from 'three';

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

  // Fragment Shader interno mantenido para portabilidad, 
  // pero preparado para exportación.
  initGeometry(scene) {
    this.geometry = new THREE.BufferGeometry();
    this.positionAttr = new THREE.BufferAttribute(this.starPositions, 3);
    this.positionAttr.setUsage(THREE.DynamicDrawUsage);
    
    this.geometry.setAttribute('position', this.positionAttr);
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.starColors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.starSizes, 1));
    this.geometry.setAttribute('aStarID', new THREE.BufferAttribute(this.starIDs, 1));
    this.geometry.setAttribute('aStarType', new THREE.BufferAttribute(this.starTypes, 1));

    // Se asume que VertexShader y FragmentShader se cargan limpia y estéticamente
    this.material = new THREE.ShaderMaterial({
      uniforms: { 
        uTime: { value: 0.0 }, 
        uCamZ: { value: 0.0 }, 
        uStarLength: { value: this.starLength }, 
        uWinningID: { value: -1.0 }, 
        uFlashProgress: { value: 0.0 }, 
        uExplosionType: { value: -1.0 } 
      },
      fog: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      vertexShader: `
        attribute float aSize; 
        attribute float aStarID; 
        attribute float aStarType;
        uniform float uTime; 
        uniform float uCamZ; 
        uniform float uStarLength; 
        uniform float uWinningID; 
        uniform float uFlashProgress;
        
        varying vec3 vColor; 
        varying float vTwinklePhase; 
        varying float vFade; 
        varying float vFlare; 
        varying float vStarType; 
        varying float vIsChosen;
        varying float vBaseSize;
        varying float vIsBlue;
        
        float hash(float n) { return fract(sin(n) * 43758.5453123); }
        
        void main() {
          vColor = color; 
          vStarType = aStarType; 
          vBaseSize = aSize;
          vTwinklePhase = hash(position.x + position.y + position.z) * 6.2831;
          
          vIsBlue = step(0.1, color.b - color.r);
          float isChosen = step(abs(aStarID - uWinningID), 0.1); 
          vIsChosen = isChosen;
          
          float sizeMultiplier = 1.0;
          if (isChosen > 0.5) { 
            if (aStarType < 0.5) sizeMultiplier = 1.6; 
            else if (aStarType < 1.5) sizeMultiplier = 1.3; 
            else sizeMultiplier = 2.2; 
          }
          vFlare = uFlashProgress * isChosen;
          
          float distToSpawn = abs(position.z - (uCamZ - uStarLength)); 
          vFade = clamp(distToSpawn / 350.0, 0.0, 1.0);
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float distanceScale = 1400.0 / (-mvPosition.z + 200.0);
          
          float finalSize = aSize * distanceScale * mix(1.0, sizeMultiplier, uFlashProgress);
          
          // Suelo de renderizado a 4.5 píxeles para conservar nitidez en estrellas tipo M lejanas
          gl_PointSize = clamp(finalSize, 4.5, 160.0); 
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime; 
        uniform float uFlashProgress;
        
        varying vec3 vColor; 
        varying float vTwinklePhase; 
        varying float vFade; 
        varying float vFlare; 
        varying float vStarType; 
        varying float vIsChosen;
        varying float vBaseSize;
        varying float vIsBlue;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float distSq = dot(uv, uv); 
          
          if (distSq > 0.25) discard;
          
          float dist = sqrt(distSq);
          float isRed = 1.0 - vIsBlue; 

          float dynamicEdge = mix(0.25, 0.42, vFlare); 
          float edgeFade = smoothstep(0.5, dynamicEdge, dist);
          
          float intensityBoost = mix(0.90, 1.0, vIsBlue);

          float coreDensity = mix(16.0, mix(8.0, 12.0, step(1.5, vStarType)), vFlare);
          float core = exp(-dist * coreDensity) * intensityBoost;
          float superCore = exp(-dist * 60.0) * 1.5;

          float intensity = core + superCore;

          if (vBaseSize > 40.0 || vIsChosen > 0.5) {
            float sizeFactor = clamp((vBaseSize - 30.0) / 130.0, 0.0, 1.0);
            float spikeWidth = mix(65.0, 40.0, sizeFactor); 
            float spikeLength = mix(3.5, 2.0, sizeFactor);
            
            if (vIsChosen > 0.5 && vStarType > 0.5 && vStarType < 1.5) { 
              spikeWidth = 35.0; 
              spikeLength = 1.2; 
            }

            const float COS_60 = 0.5; 
            const float SIN_60 = 0.866025;

            float spikeVert = exp(-(abs(uv.x) * spikeWidth + abs(uv.y) * spikeLength));

            vec2 uv60 = vec2(uv.x * COS_60 - uv.y * SIN_60, uv.x * SIN_60 + uv.y * COS_60);
            float spike60 = exp(-(abs(uv60.x) * spikeWidth + abs(uv60.y) * spikeLength));

            vec2 uvMin60 = vec2(uv.x * COS_60 + uv.y * SIN_60, -uv.x * SIN_60 + uv.y * COS_60);
            float spikeMin60 = exp(-(abs(uvMin60.x) * spikeWidth + abs(uvMin60.y) * spikeLength));

            float spikeHoriz = exp(-(abs(uv.y) * spikeWidth + abs(uv.x) * (spikeLength * 1.2))) * 0.35;

            float jwstSpikes = (spikeVert + spike60 + spikeMin60 + spikeHoriz);
            float spikeVisibility = smoothstep(35.0, 80.0, vBaseSize); 
            
            intensity += jwstSpikes * spikeVisibility * mix(0.2, 0.45, vIsBlue) * edgeFade * mix(1.0, 2.5, vFlare);
          }

          if (intensity < 0.002) discard;
          
          float twinkle = 0.92 + 0.08 * sin(uTime * 2.5 + vTwinklePhase); 
          float totalGlow = twinkle + (vFlare * 12.0);

          vec3 physicalExplosionColor = vColor;
          if (vIsChosen > 0.5) {
            if (vStarType < 0.5) { physicalExplosionColor = mix(vColor, vec3(0.95, 0.35, 0.05), uFlashProgress); }
            else if (vStarType < 1.5) { physicalExplosionColor = mix(vColor, vec3(1.0, 0.88, 0.5), uFlashProgress * 0.7); }
            else { physicalExplosionColor = mix(vColor, vec3(0.3, 0.1, 0.9), uFlashProgress); }
          }

          vec3 coreWhite = vec3(1.1); 
          float whiteFactor = mix(0.5, 0.10, isRed * step(vBaseSize, 45.0));
          float whiteMix = clamp((core * whiteFactor) + superCore + (vFlare * 0.6), 0.0, 0.98);
          vec3 finalColor = mix(physicalExplosionColor, coreWhite, whiteMix);
          
          vec3 alphaColor = mix(finalColor * mix(0.65, 1.0, isRed), finalColor * intensity, edgeFade);
          
          float finalAlpha = intensity * mix(0.85, 0.98, vIsBlue) * vFade * edgeFade;
          gl_FragColor = vec4(alphaColor * totalGlow, finalAlpha);
        }
      `
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