export const StarsFragmentShader = `
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

    // Cálculo de Spikes (Difracción JWST)
    if (vBaseSize > 40.0 || vIsChosen > 0.5) {
      float sizeFactor = clamp((vBaseSize - 30.0) / 130.0, 0.0, 1.0);
      float spikeWidth = mix(65.0, 40.0, sizeFactor); 
      float spikeLength = mix(3.5, 2.0, sizeFactor);
      
      if (vIsChosen > 0.5 && vStarType > 0.5 && vStarType < 1.5) { 
        spikeWidth = 35.0; spikeLength = 1.2; 
      }

      float spikeVert = exp(-(abs(uv.x) * spikeWidth + abs(uv.y) * spikeLength));
      const float COS_60 = 0.5; const float SIN_60 = 0.866025;
      vec2 uv60 = vec2(uv.x * COS_60 - uv.y * SIN_60, uv.x * SIN_60 + uv.y * COS_60);
      float spike60 = exp(-(abs(uv60.x) * spikeWidth + abs(uv60.y) * spikeLength));
      vec2 uvMin60 = vec2(uv.x * COS_60 + uv.y * SIN_60, -uv.x * SIN_60 + uv.y * COS_60);
      float spikeMin60 = exp(-(abs(uvMin60.x) * spikeWidth + abs(uvMin60.y) * spikeLength));
      
      float jwstSpikes = (spikeVert + spike60 + spikeMin60);
      float spikeVisibility = smoothstep(35.0, 80.0, vBaseSize); 
      intensity += jwstSpikes * spikeVisibility * mix(0.2, 0.45, vIsBlue) * edgeFade * mix(1.0, 2.5, vFlare);
    }

    if (intensity < 0.002) discard;
    
    float twinkle = 0.92 + 0.08 * sin(uTime * 2.5 + vTwinklePhase); 
    vec3 finalColor = vColor;
    if (vIsChosen > 0.5) {
       finalColor = (vStarType < 0.5) ? mix(vColor, vec3(0.95, 0.35, 0.05), uFlashProgress) : 
                    (vStarType < 1.5) ? mix(vColor, vec3(1.0, 0.88, 0.5), uFlashProgress * 0.7) : 
                                        mix(vColor, vec3(0.3, 0.1, 0.9), uFlashProgress);
    }
    
    gl_FragColor = vec4(finalColor * intensity * (twinkle + (vFlare * 12.0)), intensity * mix(0.85, 0.98, vIsBlue) * vFade * edgeFade);
  }
`;