import * as THREE from 'three';

export function createRenderer(renderWidth, renderHeight) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Low-resolution render target — nearest filter keeps pixels crisp
  const renderTarget = new THREE.WebGLRenderTarget(renderWidth, renderHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
  });

  // Fullscreen quad to blit the low-res texture to screen with PS1 post-processing
  const quadMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: renderTarget.texture },
      uResolution: { value: new THREE.Vector2(renderWidth, renderHeight) },
      uColorDepth: { value: 32.0 },
      uDitherStrength: { value: 1.0 },
      uScanlineStrength: { value: 0.15 },
      uVignetteStrength: { value: 0.3 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform float uColorDepth;
      uniform float uDitherStrength;
      uniform float uScanlineStrength;
      uniform float uVignetteStrength;
      varying vec2 vUv;

      // 4x4 Bayer dither matrix (normalized to 0..1 range)
      float bayer4x4(ivec2 p) {
        mat4 m = mat4(
           0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
          12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
           3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
          15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
        );
        int x = p.x;
        int y = p.y;
        // Index into mat4: m[col][row]
        if (y == 0) { if (x == 0) return m[0][0]; else if (x == 1) return m[1][0]; else if (x == 2) return m[2][0]; else return m[3][0]; }
        else if (y == 1) { if (x == 0) return m[0][1]; else if (x == 1) return m[1][1]; else if (x == 2) return m[2][1]; else return m[3][1]; }
        else if (y == 2) { if (x == 0) return m[0][2]; else if (x == 1) return m[1][2]; else if (x == 2) return m[2][2]; else return m[3][2]; }
        else { if (x == 0) return m[0][3]; else if (x == 1) return m[1][3]; else if (x == 2) return m[2][3]; else return m[3][3]; }
      }

      void main() {
        vec3 color = texture2D(tDiffuse, vUv).rgb;

        // Pixel coordinate in render resolution
        ivec2 pixel = ivec2(vUv * uResolution);

        // Bayer dithering
        float dither = bayer4x4(ivec2(mod(float(pixel.x), 4.0), mod(float(pixel.y), 4.0)));
        dither = (dither - 0.5) * (1.0 / uColorDepth) * uDitherStrength;
        color += dither;

        // Color quantization (PS1 15-bit color = 5 bits/channel = 32 levels)
        color = floor(color * uColorDepth + 0.5) / uColorDepth;

        // CRT scanlines — darken every other row
        float scanline = mod(float(pixel.y), 2.0);
        color *= 1.0 - (scanline * uScanlineStrength);

        // Vignette — darken edges
        vec2 center = vUv - 0.5;
        float vignette = 1.0 - dot(center, center) * uVignetteStrength * 4.0;
        color *= clamp(vignette, 0.0, 1.0);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });

  const quadScene = new THREE.Scene();
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMaterial));
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return { renderer, renderTarget, quadScene, quadCamera };
}
