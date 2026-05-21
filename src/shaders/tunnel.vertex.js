/**
 * @file tunnel.vertex.js
 * @description Vertex shader para el cálculo de posiciones polares deformadas por audio e inercias cósmicas.
 */

export const TunnelVertexShader = `
  uniform float uTime;
  uniform float uWorldTravel;
  uniform float uRoadFlowOffset;
  uniform float uGlobalColorPhase;
  uniform float uGeneralEnergy;
  uniform sampler2D uAudioTexture;
  uniform float uRoadLength;
  uniform float uAudioReady;

  attribute vec4 aParams1;
  attribute vec4 aParams2;

  varying vec3 vColor;
  varying float vAlpha;

  vec3 hsl2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  vec3 calculatePathGeometry(float z, float timeOffset) {
      float macroScale = 0.008; 
      float x = sin(z * macroScale + timeOffset * 0.15) * 25.0
              + cos(z * macroScale * 0.4 + timeOffset * 0.1) * 12.0;
      float y = cos(z * macroScale * 0.6 + timeOffset * 0.12) * 15.0;

      float tNoise = timeOffset * 0.3;
      float n1X = sin(z * 0.015 + tNoise * 0.5) * cos(z * 0.008 - tNoise * 0.2);
      float n1Y = cos(z * 0.018 + tNoise * 0.4) * sin(z * 0.012 + tNoise * 0.3);
      
      x += (n1X * 8.0);
      y += (n1Y * 6.0);
      return vec3(x, y, z);
  }

  void main() {
      float tAmp = aParams1.x;
      float lanePhase = aParams1.y;
      float randomOffset = aParams1.z;
      float baseHue = aParams1.w;

      float reactGain = aParams2.x;
      float heightGain = aParams2.y;
      float lateralGain = aParams2.z;
      float rightBias = aParams2.w;

      vec4 audioData = texture2D(uAudioTexture, vec2(tAmp, 0.5));
      float tonalEnergy = audioData.r;
      float transient = audioData.g;

      float roadLoop = uRoadLength + 60.0; 
      float cameraFrontZ = uWorldTravel + 250.0; 
      float roadStartZ = uWorldTravel - uRoadLength;
      
      float continuousZ = uWorldTravel + position.z + uRoadFlowOffset;
      float distancePastFront = continuousZ - cameraFrontZ;
      
      if (distancePastFront > 0.0) {
          continuousZ -= ceil(distancePastFront / roadLoop) * roadLoop;
      }
      float zPos = continuousZ - randomOffset;

      float transientCurve = pow(clamp(transient, 0.0, 1.0), 1.2);
      float tonalCurve = pow(clamp(tonalEnergy, 0.0, 1.0), 2.0) * reactGain;

      float speedStretch = transientCurve * rightBias * 35.0;
      zPos += speedStretch;

      float lowZone = 1.0 - pow(tAmp, 0.65);
      float midZone = 1.0 - abs(tAmp - 0.5) * 2.0;
      float highZone = pow(tAmp, 1.4);
      float horizonFade = clamp((zPos - roadStartZ) / uRoadLength, 0.0, 1.0);

      vec3 pCenter = calculatePathGeometry(zPos, uTime);

      vec2 dir = normalize(position.xy);
      float baseRadius = length(position.xy);
      
      float waveA = sin(zPos * 0.02 - uTime * 3.0 + lanePhase);
      float waveB = sin(zPos * 0.04 - uTime * 5.0 + lanePhase * 1.5);
      
      float radialBody = waveA * tonalCurve * (5.0 + lowZone * 25.0) +
                         waveB * transientCurve * (2.0 + highZone * 15.0);

      float controlledAudioRadius = radialBody * horizonFade * heightGain;
      float idleWave = sin(zPos * 0.02 + uTime * 1.5 + lanePhase) * 1.5;

      float tubeOffsetX = cos(zPos * 0.015 - uTime * 2.0) * tonalCurve * 15.0;
      float tubeOffsetY = sin(zPos * 0.012 - uTime * 1.7) * tonalCurve * 10.0;

      float finalRadius = baseRadius + controlledAudioRadius + idleWave;

      vec3 finalPos;
      float twist = sin(zPos * 0.002 + uTime * 0.2) * 0.5 * uGeneralEnergy;
      float cTwist = cos(twist);
      float sTwist = sin(twist);
      
      float rawX = (dir.x * finalRadius) + (tubeOffsetX * lateralGain);
      float rawY = (dir.y * finalRadius) + tubeOffsetY;

      finalPos.x = pCenter.x + (rawX * cTwist - rawY * sTwist);
      finalPos.y = pCenter.y + (rawX * sTwist + rawY * cTwist);
      finalPos.z = zPos;

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      gl_PointSize = 1.0 * (400.0 / -mvPosition.z); 

      float dynamicHue = fract(baseHue + uGlobalColorPhase * 0.05 + (tonalCurve * 0.15));
      
      vec3 cVoid = vec3(0.02, 0.0, 0.06);
      vec3 cPlasma = hsl2rgb(vec3(dynamicHue, 0.9, 0.6));
      vec3 cSupernova = vec3(0.9, 1.0, 1.0);

      float flowPhase = (tAmp * 3.0) + ((continuousZ - uWorldTravel) * 0.01) - uGlobalColorPhase;
      float baseGlow = (sin(flowPhase) + 1.0) * 0.5 * 0.3;
      
      vec3 finalC = mix(cVoid, cPlasma, tonalCurve * 1.2 + baseGlow);

      float distToStart = abs(zPos - roadStartZ);
      float transientPunch = transientCurve * (distToStart < 120.0 ? (distToStart / 120.0) : 1.0);
      
      if (transientPunch > 0.1) {
          finalC = mix(finalC, cSupernova, transientPunch * 1.5);
      }
      
      if (abs(controlledAudioRadius) > 5.0) {
          finalC += cPlasma * (abs(controlledAudioRadius) / 25.0) * tonalCurve * 2.5;
      }

      finalC *= (1.0 + (tonalCurve * 0.5) + (transientPunch * 2.0));
      vColor = clamp(finalC, 0.0, 1.0);

      float fogFactor = smoothstep(uRoadLength * 0.3, uRoadLength * 1.0, distToStart);
      vAlpha = 1.0 - pow(fogFactor, 2.5);
  }
`;