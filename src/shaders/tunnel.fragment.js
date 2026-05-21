/**
 * @file tunnel.fragment.js
 * @description Fragment shader para el texturizado procedimental aditivo de los nodos energéticos del túnel.
 */

export const TunnelFragmentShader = `
  uniform sampler2D uPointTexture;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
      vec4 texColor = texture2D(uPointTexture, gl_PointCoord);
      gl_FragColor = vec4(vColor * texColor.rgb, texColor.a * vAlpha);
  }
`;