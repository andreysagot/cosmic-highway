/**
 * @file BlackHole.js
 * @description Genera un agujero negro masivo utilizando Lente Gravitacional de Einstein y simulación de corrimiento Doppler térmico.
 */

import * as THREE from 'three';

export class BlackHole {
  constructor(scene) {
    this.bhRadius = 27; //
    this.blackHoleDistance = 4000.0; //
    this.blackHoleScaleFactor = this.blackHoleDistance / 1200.0; //
    this.einsteinRadiusScaled = 34.5 * this.blackHoleScaleFactor; //
    this.blackHoleTiltX = 0.18; //
    
    // Variables de caché para vectores locales
    this.localCamPos = new THREE.Vector3(); //
    this.bhViewDir = new THREE.Vector3(); //
    
    this.initSphereAndHalo(scene);
    this.initAccretionDisk(scene);
  }

  initSphereAndHalo(scene) {
    const bhGeometry = new THREE.SphereGeometry(this.bhRadius * this.blackHoleScaleFactor, 64, 64); // [cite: 133]
    const bhMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: false, depthWrite: true, depthTest: true }); // [cite: 134]
    this.blackHole = new THREE.Mesh(bhGeometry, bhMaterial); // [cite: 135]
    this.blackHole.renderOrder = -1; // [cite: 135]
    scene.add(this.blackHole); // [cite: 135]

    const haloGeo = new THREE.SphereGeometry(this.bhRadius * this.blackHoleScaleFactor, 64, 64); // [cite: 138]
    const haloMat = new THREE.ShaderMaterial({
      uniforms: { uGrosor: { value: 1.2 * this.blackHoleScaleFactor } }, // [cite: 149]
      vertexShader: `uniform float uGrosor; varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); vec3 posAmpliada = position + normal * uGrosor; gl_Position = projectionMatrix * modelViewMatrix * vec4(posAmpliada, 1.0); }`, // [cite: 138]
      fragmentShader: `varying vec3 vNormal; void main() { float perfil = 1.0 - abs(vNormal.z); float anilloNitido = smoothstep(0.3, 0.5, perfil); gl_FragColor = vec4(vec3(1.5, 1.5, 1.4) * anilloNitido, anilloNitido); }`, // [cite: 144]
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false, depthTest: true // [cite: 149]
    });
    this.blackHoleHalo = new THREE.Mesh(haloGeo, haloMat); // [cite: 151]
    this.blackHoleHalo.renderOrder = 0; // [cite: 151]
    this.blackHole.add(this.blackHoleHalo); // [cite: 152]
  }

  initAccretionDisk(scene) {
    const TOTAL_PARTICLES_ACC = 40000; // [cite: 153]
    const accGeometry = new THREE.BufferGeometry(); // [cite: 153]
    const accStaticPositions = new Float32Array(TOTAL_PARTICLES_ACC * 2 * 3); // [cite: 154]
    const accColors = new Float32Array(TOTAL_PARTICLES_ACC * 2 * 3); // [cite: 154]
    const accSizes = new Float32Array(TOTAL_PARTICLES_ACC * 2); // [cite: 155]
    const accPhysicsData = new Float32Array(TOTAL_PARTICLES_ACC * 2 * 3); // [cite: 155]
    const accSecondary = new Float32Array(TOTAL_PARTICLES_ACC * 2); // [cite: 156]
    const accVariation = new Float32Array(TOTAL_PARTICLES_ACC * 2 * 4); // [cite: 156]
    
    const colorCore = new THREE.Color(0xffffff); const colorMid = new THREE.Color(0xff8822); const colorOuter = new THREE.Color(0x550800); const tempColorAcc = new THREE.Color(); // [cite: 157]
    const mixAcc = (start, end, amt) => (1 - amt) * start + amt * end; // [cite: 158]

    for (let i = 0; i < TOTAL_PARTICLES_ACC; i++) {
      const normalizedBand = Math.random(); // [cite: 159]
      const r = (this.bhRadius * 1.4 * this.blackHoleScaleFactor) + Math.pow(normalizedBand, 4.5) * (320.0 * this.blackHoleScaleFactor); // [cite: 160]
      const angle = Math.random() * Math.PI * 2; // [cite: 161]
      const thickness = 0.04 * (r * 0.1); // [cite: 161]
      const yOff = (Math.random() - 0.5) * thickness; // [cite: 162]
      const sizeBase = (mixAcc(1.5, 4.5, 1.0 - normalizedBand) + Math.random() * 1.0) * this.blackHoleScaleFactor; // [cite: 162]
      
      if (normalizedBand < 0.28) tempColorAcc.lerpColors(colorCore, colorMid, normalizedBand / 0.28); // [cite: 163]
      else tempColorAcc.lerpColors(colorMid, colorOuter, (normalizedBand - 0.28) / 0.72); // [cite: 164]

      const distanceFade = 1.0 - Math.pow(Math.min(1.0, Math.max(0.0, (r - this.bhRadius * 1.4 * this.blackHoleScaleFactor) / (320.0 * this.blackHoleScaleFactor))), 2.0); // [cite: 165]
      const rColor = tempColorAcc.r * distanceFade, gColor = tempColorAcc.g * distanceFade, bColor = tempColorAcc.b * distanceFade; // [cite: 166]
      const posX = Math.cos(angle) * r, posY = yOff, posZ = Math.sin(angle) * r; // [cite: 167]
      
      const idx1 = i * 2, idx2 = i * 2 + 1; // [cite: 168]
      const turbulencePhase = Math.random() * Math.PI * 2.0, turbulenceAmp = 0.35 + Math.random() * 0.65; // [cite: 169]
      const flickerPhase = Math.random() * Math.PI * 2.0, radialPhase = Math.random() * Math.PI * 2.0; // [cite: 170]

      // Primary
      accPhysicsData[idx1 * 3] = r; accPhysicsData[idx1 * 3 + 1] = angle; accPhysicsData[idx1 * 3 + 2] = yOff; // [cite: 171]
      accStaticPositions[idx1 * 3] = posX; accStaticPositions[idx1 * 3 + 1] = posY; accStaticPositions[idx1 * 3 + 2] = posZ; // [cite: 172]
      accSizes[idx1] = sizeBase; accColors[idx1 * 3] = rColor; accColors[idx1 * 3 + 1] = gColor; accColors[idx1 * 3 + 2] = bColor; // [cite: 174]
      accSecondary[idx1] = 0.0; accVariation[idx1 * 4] = turbulencePhase; accVariation[idx1 * 4 + 1] = turbulenceAmp; accVariation[idx1 * 4 + 2] = flickerPhase; accVariation[idx1 * 4 + 3] = radialPhase; // [cite: 175]

      // Secondary
      accPhysicsData[idx2 * 3] = r; accPhysicsData[idx2 * 3 + 1] = angle; accPhysicsData[idx2 * 3 + 2] = yOff; // [cite: 177]
      accStaticPositions[idx2 * 3] = posX; accStaticPositions[idx2 * 3 + 1] = posY; accStaticPositions[idx2 * 3 + 2] = posZ; // [cite: 179]
      accSizes[idx2] = sizeBase; accColors[idx2 * 3] = rColor; accColors[idx2 * 3 + 1] = gColor; accColors[idx2 * 3 + 2] = bColor; // [cite: 180]
      accSecondary[idx2] = 1.0; accVariation[idx2 * 4] = turbulencePhase + 1.73; accVariation[idx2 * 4 + 1] = turbulenceAmp; accVariation[idx2 * 4 + 2] = flickerPhase + 0.91; accVariation[idx2 * 4 + 3] = radialPhase + 2.41; // [cite: 181]
    }

    accGeometry.setAttribute('position', new THREE.BufferAttribute(accStaticPositions, 3)); // [cite: 184]
    accGeometry.setAttribute('color', new THREE.BufferAttribute(accColors, 3)); // [cite: 184]
    accGeometry.setAttribute('aSize', new THREE.BufferAttribute(accSizes, 1)); // [cite: 184]
    accGeometry.setAttribute('aPhysics', new THREE.BufferAttribute(accPhysicsData, 3)); // [cite: 184]
    accGeometry.setAttribute('aIsSecondary', new THREE.BufferAttribute(accSecondary, 1)); // [cite: 184]
    accGeometry.setAttribute('aVariation', new THREE.BufferAttribute(accVariation, 4)); // [cite: 185]

    this.accMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0.0 }, uCameraPosition: { value: new THREE.Vector3() }, uViewDir: { value: new THREE.Vector3(0, 0, 1) }, uDiskTiltX: { value: this.blackHoleTiltX } }, // [cite: 185]
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, vertexColors: true, // [cite: 233]
      vertexShader: `
        attribute float aSize; attribute vec3 aPhysics; attribute float aIsSecondary; attribute vec4 aVariation;
        varying vec3 vColor; varying float vBehindFactor; varying float vDopplerFactor; varying float vHeatFlicker; varying float vRadialFade;
        uniform float uTime; uniform vec3 uCameraPosition; uniform vec3 uViewDir; uniform float uDiskTiltX;
        float cnoise(vec2 P) { return fract(sin(dot(P, vec2(127.1, 311.7))) * 43758.5453123); }
        void main() {
          vec3 baseColor = color; float r = aPhysics.x; float initialAngle = aPhysics.y; float yOff = aPhysics.z;
          float turbulencePhase = aVariation.x; float turbulenceAmp = aVariation.y; float flickerPhase = aVariation.z; float radialPhase = aVariation.w;
          float invR = 360.0 / pow(r, 1.45); float orbitSpeed = 0.065 * invR; float currentAngle = initialAngle - (uTime * orbitSpeed * 0.035);
          float radialBreath = sin(uTime * 0.35 + radialPhase + currentAngle) * cos(uTime * 0.12 + turbulencePhase);
          float dynamicR = r + (radialBreath * turbulenceAmp * (1.5 + r * 0.003));
          float noiseInput = currentAngle * 5.0 + dynamicR * 0.05 - uTime * 1.2;
          float shearNoise = sin(noiseInput) * cos(noiseInput * 0.5 + turbulencePhase); float localTurbulence = shearNoise * turbulenceAmp * 1.2;
          float verticalWarp = sin(dynamicR * 0.15 - uTime * 1.8 + initialAngle) * 0.06;
          float dynamicY = yOff + (verticalWarp + cos(currentAngle * 3.0 + uTime) * 0.12) * turbulenceAmp;
          float finalAngle = currentAngle + localTurbulence * 0.02;
          vec3 flatWorldPos = vec3(cos(finalAngle) * dynamicR, dynamicY, sin(finalAngle) * dynamicR);
          float c = cos(uDiskTiltX); float s = sin(uDiskTiltX);
          vec3 physicalWorldPos = vec3(flatWorldPos.x, flatWorldPos.y * c - flatWorldPos.z * s, flatWorldPos.y * s + flatWorldPos.z * c);
          vec3 viewDir = normalize(uViewDir); float dotPosCam = dot(physicalWorldPos, viewDir);
          float behindFactor = smoothstep(-20.0, 20.0, -dotPosCam); vBehindFactor = behindFactor;
          vec3 finalWorldPos = physicalWorldPos; float einsteinRadius = ${this.einsteinRadiusScaled.toFixed(8)};
          if (behindFactor > 0.0) {
            vec3 projOnCam = viewDir * dotPosCam; vec3 perpVector = physicalWorldPos - projOnCam; float perpDist = length(perpVector);
            if (perpDist > 0.001) { 
                vec3 dirPerp = normalize(perpVector); float lensingWarp; float root = sqrt((perpDist * perpDist) + (4.0 * einsteinRadius * einsteinRadius));
                if (aIsSecondary < 0.5) { lensingWarp = 0.5 * (perpDist + root); float deflectionGlow = smoothstep(0.0, einsteinRadius * -1.0, perpDist); lensingWarp = mix(einsteinRadius + (pow(perpDist, 0.1) * 0.03), lensingWarp, deflectionGlow); } 
                else { dirPerp = -dirPerp; lensingWarp = 0.5 * (root - perpDist); lensingWarp *= 1.1; }
                vec3 deformedWorldPos = projOnCam + dirPerp * lensingWarp; finalWorldPos = mix(physicalWorldPos, deformedWorldPos, behindFactor);
            }
          }
          vec3 velocityDir = normalize(vec3(-sin(finalAngle), -cos(finalAngle) * s, cos(finalAngle) * c));
          float dopplerShift = dot(velocityDir, viewDir); float dynamicDoppler = 1.0 / (1.0 - dopplerShift * 0.38); vDopplerFactor = clamp(dynamicDoppler, 0.4, 2.2);
          float normalizedRadius = clamp((r - ${(this.bhRadius * 1.4 * this.blackHoleScaleFactor).toFixed(8)}) / ${(320.0 * this.blackHoleScaleFactor).toFixed(8)}, 0.0, 1.0);
          vRadialFade = 0.25 - normalizedRadius; float microNoise = cnoise(vec2(finalAngle * 10.0, uTime * 3.5));
          float heatFlicker = 0.88 + sin(uTime * 6.0 + flickerPhase) * 0.06 + microNoise * 0.05; vHeatFlicker = clamp(heatFlicker, 0.75, 1.25);
          if (dopplerShift > 0.0) { vec3 blueshiftColor = mix(baseColor, vec3(0.72, 0.89, 1.0), dopplerShift * 0.55); baseColor = blueshiftColor * pow(vDopplerFactor, 1.3); } 
          else { vec3 redshiftColor = mix(baseColor, vec3(0.20, 0.01, 0.0), -dopplerShift * 0.65); baseColor = redshiftColor * pow(vDopplerFactor, 1.1); }
          baseColor *= (mix(0.9, 1.35, vRadialFade) * vHeatFlicker); float asymmetryBoost = smoothstep(0.0, -30.0 * ${this.blackHoleScaleFactor.toFixed(6)}, finalWorldPos.y);
          baseColor *= (1.0 + asymmetryBoost * 0.9); vColor = baseColor;
          if (aIsSecondary > 0.5) vColor *= mix(1.0, 0.45, behindFactor);
          vec4 viewPos = modelViewMatrix * vec4(finalWorldPos, 1.0); float distanceScale = 1450.0 / (-viewPos.z + 1.0);
          float finalSize = aSize * distanceScale * mix(0.75, 1.25, vDopplerFactor); gl_PointSize = clamp(finalSize, 0.6, 48.0); gl_Position = projectionMatrix * viewPos;
        }
      `, // [cite: 185]
      fragmentShader: `
        varying vec3 vColor; varying float vBehindFactor; varying float vDopplerFactor; varying float vHeatFlicker; varying float vRadialFade;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5); float distEnd = length(uv); if (distEnd > 0.5) discard;
          float core = exp(-distEnd * distEnd * mix(45.0, 22.0, vRadialFade)); float innerGlow = exp(-distEnd * distEnd * 150.0); float halo = exp(-distEnd * distEnd * 7.5);
          float rim = smoothstep(0.49, 0.12, distEnd); float glow = core * 1.5 + innerGlow * 0.8 + halo * 0.35 * rim;
          float depthAlpha = mix(0.15, 0.40, vBehindFactor); float radialAlpha = mix(0.45, 1.0, vRadialFade); float opacityAlpha = depthAlpha * vDopplerFactor * radialAlpha * vHeatFlicker;
          vec3 finalColor = vColor * (0.90 + halo * 0.25 + core * 0.25); gl_FragColor = vec4(finalColor * glow, clamp(glow * opacityAlpha * 0.32, 0.0, 1.0));
        }
      ` // [cite: 224]
    });
    this.accretionPoints = new THREE.Points(accGeometry, this.accMaterial); // [cite: 234]
    this.accretionPoints.renderOrder = 0; // [cite: 234]
    scene.add(this.accretionPoints); // [cite: 234]
    
    this.localCamPos = new THREE.Vector3(); // [cite: 238]
    this.bhViewDir = new THREE.Vector3(); // [cite: 239]
  }
  
  update(state, currentCamPos) {
    this.accMaterial.uniforms.uTime.value = state.timeAccumulator; //
    this.blackHole.position.set(0, 120, state.worldTravel - this.blackHoleDistance); //
    this.accretionPoints.position.copy(this.blackHole.position); //
    this.accretionPoints.rotation.z = 0.5;

    this.localCamPos.copy(currentCamPos).sub(this.blackHole.position); //
    this.bhViewDir.copy(this.localCamPos).normalize(); //

    this.accMaterial.uniforms.uCameraPosition.value.copy(this.localCamPos); //
    this.accMaterial.uniforms.uViewDir.value.copy(this.bhViewDir); //
  }
}