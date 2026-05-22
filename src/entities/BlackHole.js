/**
 * @file BlackHole.js
 * @description Genera un agujero negro masivo utilizando Lente Gravitacional de Einstein y simulación de corrimiento Doppler térmico.
 */

import * as THREE from 'three';
import { AccretionVertexShader } from '../shaders/accretion.vertex.js';
import { AccretionFragmentShader } from '../shaders/accretion.fragment.js';

export class BlackHole {
  constructor(scene) {
    this.bhRadius = 27;
    this.blackHoleDistance = 4000.0;
    this.blackHoleScaleFactor = this.blackHoleDistance / 1200.0;
    this.einsteinRadiusScaled = 34.5 * this.blackHoleScaleFactor;
    this.blackHoleTiltX = 0.18;
    
    this.localCamPos = new THREE.Vector3();
    this.bhViewDir = new THREE.Vector3();
    
    this.initSphereAndHalo(scene);
    this.initAccretionDisk(scene);
  }

  initSphereAndHalo(scene) {
    const bhGeometry = new THREE.SphereGeometry(this.bhRadius * this.blackHoleScaleFactor, 64, 64);
    const bhMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: false, depthWrite: true, depthTest: true });
    this.blackHole = new THREE.Mesh(bhGeometry, bhMaterial);
    this.blackHole.renderOrder = -1;
    scene.add(this.blackHole);

    const haloGeo = new THREE.SphereGeometry(this.bhRadius * this.blackHoleScaleFactor, 64, 64);
    const haloMat = new THREE.ShaderMaterial({
      uniforms: { uGrosor: { value: 1.2 * this.blackHoleScaleFactor } },
      vertexShader: `uniform float uGrosor; varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); vec3 posAmpliada = position + normal * uGrosor; gl_Position = projectionMatrix * modelViewMatrix * vec4(posAmpliada, 1.0); }`,
      fragmentShader: `varying vec3 vNormal; void main() { float perfil = 1.0 - abs(vNormal.z); float anilloNitido = smoothstep(0.3, 0.5, perfil); gl_FragColor = vec4(vec3(1.5, 1.5, 1.4) * anilloNitido, anilloNitido); }`,
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false, depthTest: true
    });
    this.blackHoleHalo = new THREE.Mesh(haloGeo, haloMat);
    this.blackHoleHalo.renderOrder = 0;
    this.blackHole.add(this.blackHoleHalo);
  }

  initAccretionDisk(scene) {
    const TOTAL_PARTICLES_ACC = 40000;
    const accGeometry = new THREE.BufferGeometry();
    const accStaticPositions = new Float32Array(TOTAL_PARTICLES_ACC * 2 * 3);
    const accColors = new Float32Array(TOTAL_PARTICLES_ACC * 2 * 3);
    const accSizes = new Float32Array(TOTAL_PARTICLES_ACC * 2);
    const accPhysicsData = new Float32Array(TOTAL_PARTICLES_ACC * 2 * 3);
    const accSecondary = new Float32Array(TOTAL_PARTICLES_ACC * 2);
    const accVariation = new Float32Array(TOTAL_PARTICLES_ACC * 2 * 4);
    
    const colorCore = new THREE.Color(0xffffff); 
    const colorMid = new THREE.Color(0xff8822); 
    const colorOuter = new THREE.Color(0x550800); 
    const tempColorAcc = new THREE.Color();
    
    const mixAcc = (start, end, amt) => (1 - amt) * start + amt * end;
    
    for (let i = 0; i < TOTAL_PARTICLES_ACC; i++) {
      const normalizedBand = Math.random();
      const r = (this.bhRadius * 1.4 * this.blackHoleScaleFactor) + Math.pow(normalizedBand, 4.5) * (320.0 * this.blackHoleScaleFactor);
      const angle = Math.random() * Math.PI * 2;
      const thickness = 0.04 * (r * 0.1);
      const yOff = (Math.random() - 0.5) * thickness;
      const sizeBase = (mixAcc(1.5, 4.5, 1.0 - normalizedBand) + Math.random() * 1.0) * this.blackHoleScaleFactor;
      
      if (normalizedBand < 0.28) tempColorAcc.lerpColors(colorCore, colorMid, normalizedBand / 0.28);
      else tempColorAcc.lerpColors(colorMid, colorOuter, (normalizedBand - 0.28) / 0.72);
      
      const distanceFade = 1.0 - Math.pow(Math.min(1.0, Math.max(0.0, (r - this.bhRadius * 1.4 * this.blackHoleScaleFactor) / (320.0 * this.blackHoleScaleFactor))), 2.0);
      const rColor = tempColorAcc.r * distanceFade, gColor = tempColorAcc.g * distanceFade, bColor = tempColorAcc.b * distanceFade;
      const posX = Math.cos(angle) * r, posY = yOff, posZ = Math.sin(angle) * r;
      const idx1 = i * 2, idx2 = i * 2 + 1;
      const turbulencePhase = Math.random() * Math.PI * 2.0, turbulenceAmp = 0.35 + Math.random() * 0.65;
      const flickerPhase = Math.random() * Math.PI * 2.0, radialPhase = Math.random() * Math.PI * 2.0;
      
      // Primary
      accPhysicsData[idx1 * 3] = r; accPhysicsData[idx1 * 3 + 1] = angle;
      accPhysicsData[idx1 * 3 + 2] = yOff;
      accStaticPositions[idx1 * 3] = posX; accStaticPositions[idx1 * 3 + 1] = posY;
      accStaticPositions[idx1 * 3 + 2] = posZ;
      accSizes[idx1] = sizeBase; accColors[idx1 * 3] = rColor;
      accColors[idx1 * 3 + 1] = gColor; accColors[idx1 * 3 + 2] = bColor;
      accSecondary[idx1] = 0.0;
      accVariation[idx1 * 4] = turbulencePhase; accVariation[idx1 * 4 + 1] = turbulenceAmp; accVariation[idx1 * 4 + 2] = flickerPhase;
      accVariation[idx1 * 4 + 3] = radialPhase;

      // Secondary
      accPhysicsData[idx2 * 3] = r;
      accPhysicsData[idx2 * 3 + 1] = angle; accPhysicsData[idx2 * 3 + 2] = yOff;
      accStaticPositions[idx2 * 3] = posX;
      accStaticPositions[idx2 * 3 + 1] = posY; accStaticPositions[idx2 * 3 + 2] = posZ;
      accSizes[idx2] = sizeBase;
      accColors[idx2 * 3] = rColor; accColors[idx2 * 3 + 1] = gColor; accColors[idx2 * 3 + 2] = bColor;
      accSecondary[idx2] = 1.0; accVariation[idx2 * 4] = turbulencePhase + 1.73; accVariation[idx2 * 4 + 1] = turbulenceAmp;
      accVariation[idx2 * 4 + 2] = flickerPhase + 0.91; accVariation[idx2 * 4 + 3] = radialPhase + 2.41;
    }

    accGeometry.setAttribute('position', new THREE.BufferAttribute(accStaticPositions, 3));
    accGeometry.setAttribute('color', new THREE.BufferAttribute(accColors, 3));
    accGeometry.setAttribute('aSize', new THREE.BufferAttribute(accSizes, 1));
    accGeometry.setAttribute('aPhysics', new THREE.BufferAttribute(accPhysicsData, 3));
    accGeometry.setAttribute('aIsSecondary', new THREE.BufferAttribute(accSecondary, 1));
    accGeometry.setAttribute('aVariation', new THREE.BufferAttribute(accVariation, 4));

    this.accMaterial = new THREE.ShaderMaterial({
      uniforms: { 
        uTime: { value: 0.0 }, 
        uCameraPosition: { value: new THREE.Vector3() }, 
        uViewDir: { value: new THREE.Vector3(0, 0, 1) }, 
        uDiskTiltX: { value: this.blackHoleTiltX },
        uEinsteinRadius: { value: this.einsteinRadiusScaled },
        uBhRadiusBase: { value: this.bhRadius * 1.4 * this.blackHoleScaleFactor },
        uBhRadiusFade: { value: 320.0 * this.blackHoleScaleFactor },
        uBhScale: { value: this.blackHoleScaleFactor }
      },
      transparent: true, 
      blending: THREE.AdditiveBlending, 
      depthWrite: false, 
      depthTest: true, 
      vertexColors: true,
      vertexShader: AccretionVertexShader,
      fragmentShader: AccretionFragmentShader
    });
    
    this.accretionPoints = new THREE.Points(accGeometry, this.accMaterial);
    this.accretionPoints.renderOrder = 0;
    scene.add(this.accretionPoints);
    
    this.localCamPos = new THREE.Vector3();
    this.bhViewDir = new THREE.Vector3();
  }
  
  update(state, currentCamPos) {
    this.accMaterial.uniforms.uTime.value = state.timeAccumulator;
    this.blackHole.position.set(0, 120, state.worldTravel - this.blackHoleDistance);
    this.accretionPoints.position.copy(this.blackHole.position);
    this.accretionPoints.rotation.z = 0.5;

    this.localCamPos.copy(currentCamPos).sub(this.blackHole.position);
    this.bhViewDir.copy(this.localCamPos).normalize();

    this.accMaterial.uniforms.uCameraPosition.value.copy(this.localCamPos);
    this.accMaterial.uniforms.uViewDir.value.copy(this.bhViewDir);
  }
}