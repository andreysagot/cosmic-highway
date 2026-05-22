/**
 * @file accretion.fragment.js
 * @description Fragment shader para la renderización térmica del disco de acreción.
 */

export const AccretionFragmentShader = `
  varying vec3 vColor;
  varying float vBehindFactor; 
  varying float vDopplerFactor; 
  varying float vHeatFlicker; 
  varying float vRadialFade;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float distEnd = length(uv); 
    
    if (distEnd > 0.5) discard;
    
    float core = exp(-distEnd * distEnd * mix(45.0, 22.0, vRadialFade));
    float innerGlow = exp(-distEnd * distEnd * 150.0); 
    float halo = exp(-distEnd * distEnd * 7.5);
    float rim = smoothstep(0.49, 0.12, distEnd); 
    float glow = core * 1.5 + innerGlow * 0.8 + halo * 0.35 * rim;
    
    float depthAlpha = mix(0.15, 0.40, vBehindFactor); 
    float radialAlpha = mix(0.45, 1.0, vRadialFade);
    float opacityAlpha = depthAlpha * vDopplerFactor * radialAlpha * vHeatFlicker;
    vec3 finalColor = vColor * (0.90 + halo * 0.25 + core * 0.25);
    
    gl_FragColor = vec4(finalColor * glow, clamp(glow * opacityAlpha * 0.32, 0.0, 1.0));
  }
`;