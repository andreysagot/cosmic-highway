export const StarsVertexShader = `
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
    
    gl_PointSize = clamp(finalSize, 4.5, 160.0); 
    gl_Position = projectionMatrix * mvPosition;
  }
`;