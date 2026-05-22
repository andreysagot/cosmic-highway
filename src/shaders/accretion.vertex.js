/**
 * @file accretion.vertex.js
 * @description Vertex shader para el disco de acreción y lente gravitacional de Einstein.
 */

export const AccretionVertexShader = `
  attribute float aSize; 
  attribute vec3 aPhysics; 
  attribute float aIsSecondary; 
  attribute vec4 aVariation;
  
  varying vec3 vColor; 
  varying float vBehindFactor; 
  varying float vDopplerFactor; 
  varying float vHeatFlicker; 
  varying float vRadialFade;
  
  uniform float uTime; 
  uniform vec3 uCameraPosition; 
  uniform vec3 uViewDir; 
  uniform float uDiskTiltX;
  
  uniform float uEinsteinRadius;
  uniform float uBhRadiusBase;
  uniform float uBhRadiusFade;
  uniform float uBhScale;
  
  float cnoise(vec2 P) { return fract(sin(dot(P, vec2(127.1, 311.7))) * 43758.5453123); }
  
  void main() {
    vec3 baseColor = color; 
    float r = aPhysics.x; 
    float initialAngle = aPhysics.y; 
    float yOff = aPhysics.z;
    float turbulencePhase = aVariation.x;
    float turbulenceAmp = aVariation.y; 
    float flickerPhase = aVariation.z; 
    float radialPhase = aVariation.w;
    
    float invR = 360.0 / pow(r, 1.45);
    float orbitSpeed = 0.065 * invR; 
    float currentAngle = initialAngle - (uTime * orbitSpeed * 0.035);
    
    float radialBreath = sin(uTime * 0.35 + radialPhase + currentAngle) * cos(uTime * 0.12 + turbulencePhase);
    float dynamicR = r + (radialBreath * turbulenceAmp * (1.5 + r * 0.003));
    
    float noiseInput = currentAngle * 5.0 + dynamicR * 0.05 - uTime * 1.2;
    float shearNoise = sin(noiseInput) * cos(noiseInput * 0.5 + turbulencePhase); 
    float localTurbulence = shearNoise * turbulenceAmp * 1.2;
    
    float verticalWarp = sin(dynamicR * 0.15 - uTime * 1.8 + initialAngle) * 0.06;
    float dynamicY = yOff + (verticalWarp + cos(currentAngle * 3.0 + uTime) * 0.12) * turbulenceAmp;
    float finalAngle = currentAngle + localTurbulence * 0.02;
    
    vec3 flatWorldPos = vec3(cos(finalAngle) * dynamicR, dynamicY, sin(finalAngle) * dynamicR);
    float c = cos(uDiskTiltX); 
    float s = sin(uDiskTiltX);
    vec3 physicalWorldPos = vec3(flatWorldPos.x, flatWorldPos.y * c - flatWorldPos.z * s, flatWorldPos.y * s + flatWorldPos.z * c);
    
    vec3 viewDir = normalize(uViewDir); 
    float dotPosCam = dot(physicalWorldPos, viewDir);
    float behindFactor = smoothstep(-20.0, 20.0, -dotPosCam); 
    vBehindFactor = behindFactor;
    
    vec3 finalWorldPos = physicalWorldPos; 
    
    if (behindFactor > 0.0) {
      vec3 projOnCam = viewDir * dotPosCam;
      vec3 perpVector = physicalWorldPos - projOnCam; 
      float perpDist = length(perpVector);
      if (perpDist > 0.001) { 
          vec3 dirPerp = normalize(perpVector);
          float lensingWarp; 
          float root = sqrt((perpDist * perpDist) + (4.0 * uEinsteinRadius * uEinsteinRadius));
          if (aIsSecondary < 0.5) { 
              lensingWarp = 0.5 * (perpDist + root); 
              float deflectionGlow = smoothstep(0.0, uEinsteinRadius * -1.0, perpDist);
              lensingWarp = mix(uEinsteinRadius + (pow(perpDist, 0.1) * 0.03), lensingWarp, deflectionGlow);
          } else { 
              dirPerp = -dirPerp;
              lensingWarp = 0.5 * (root - perpDist); 
              lensingWarp *= 1.1;
          }
          vec3 deformedWorldPos = projOnCam + dirPerp * lensingWarp;
          finalWorldPos = mix(physicalWorldPos, deformedWorldPos, behindFactor);
      }
    }
    
    vec3 velocityDir = normalize(vec3(-sin(finalAngle), -cos(finalAngle) * s, cos(finalAngle) * c));
    float dopplerShift = dot(velocityDir, viewDir); 
    float dynamicDoppler = 1.0 / (1.0 - dopplerShift * 0.38); 
    vDopplerFactor = clamp(dynamicDoppler, 0.4, 2.2);
    
    float normalizedRadius = clamp((r - uBhRadiusBase) / uBhRadiusFade, 0.0, 1.0);
    vRadialFade = 0.25 - normalizedRadius; 
    
    float microNoise = cnoise(vec2(finalAngle * 10.0, uTime * 3.5));
    float heatFlicker = 0.88 + sin(uTime * 6.0 + flickerPhase) * 0.06 + microNoise * 0.05;
    vHeatFlicker = clamp(heatFlicker, 0.75, 1.25);
    
    if (dopplerShift > 0.0) { 
        vec3 blueshiftColor = mix(baseColor, vec3(0.72, 0.89, 1.0), dopplerShift * 0.55);
        baseColor = blueshiftColor * pow(vDopplerFactor, 1.3); 
    } else { 
        vec3 redshiftColor = mix(baseColor, vec3(0.20, 0.01, 0.0), -dopplerShift * 0.65);
        baseColor = redshiftColor * pow(vDopplerFactor, 1.1); 
    }
    
    baseColor *= (mix(0.9, 1.35, vRadialFade) * vHeatFlicker);
    float asymmetryBoost = smoothstep(0.0, -30.0 * uBhScale, finalWorldPos.y);
    baseColor *= (1.0 + asymmetryBoost * 0.9); 
    vColor = baseColor;
    
    if (aIsSecondary > 0.5) vColor *= mix(1.0, 0.45, behindFactor);
    
    vec4 viewPos = modelViewMatrix * vec4(finalWorldPos, 1.0);
    float distanceScale = 1450.0 / (-viewPos.z + 1.0);
    float finalSize = aSize * distanceScale * mix(0.75, 1.25, vDopplerFactor);
    
    gl_PointSize = clamp(finalSize, 0.6, 48.0); 
    gl_Position = projectionMatrix * viewPos;
  }
`;