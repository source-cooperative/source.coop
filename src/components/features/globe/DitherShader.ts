/**
 * 8x8 Bayer matrix ordered dithering post-processing shader.
 * Converts the rendered scene to a 1-bit dithered black-and-white image.
 */
export const DitherShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: null },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    varying vec2 vUv;

    // 8x8 Bayer matrix (normalized to 0-1)
    float bayer8(vec2 p) {
      ivec2 ip = ivec2(mod(p, 8.0));

      int b[64] = int[64](
         0, 32,  8, 40,  2, 34, 10, 42,
        48, 16, 56, 24, 50, 18, 58, 26,
        12, 44,  4, 36, 14, 46,  6, 38,
        60, 28, 52, 20, 62, 30, 54, 22,
         3, 35, 11, 43,  1, 33,  9, 41,
        51, 19, 59, 27, 49, 17, 57, 25,
        15, 47,  7, 39, 13, 45,  5, 37,
        63, 31, 55, 23, 61, 29, 53, 21
      );

      return float(b[ip.y * 8 + ip.x]) / 64.0;
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      vec2 pixel = vUv * resolution;
      float threshold = bayer8(pixel);
      float dithered = step(threshold, luma);
      gl_FragColor = vec4(vec3(dithered), color.a);
    }
  `,
};
