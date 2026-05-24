import * as THREE from 'three';

export function createPS1Material(options = {}) {
  const {
    color = 0xffffff,
    map = null,
    fogColor = new THREE.Color(0x0a0a0a),
    fogNear = 3,
    fogFar = 15,
    light = {
      ambient: new THREE.Color(0x333333),
      point: {
        position: new THREE.Vector3(0, 2.5, 0),
        color: new THREE.Color(0xffddaa),
        intensity: 3,
        distance: 12,
      },
    },
    snapResolution = new THREE.Vector2(160, 120),
  } = options;

  const baseColor = color instanceof THREE.Color ? color : new THREE.Color(color);
  const ambientColor = light.ambient instanceof THREE.Color ? light.ambient : new THREE.Color(light.ambient);
  const pointColor = light.point.color instanceof THREE.Color ? light.point.color : new THREE.Color(light.point.color);
  const fog = fogColor instanceof THREE.Color ? fogColor : new THREE.Color(fogColor);

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: baseColor },
      uMap: { value: map },
      uUseMap: { value: map !== null },
      uAmbientColor: { value: ambientColor },
      uPointLightPos: { value: light.point.position },
      uPointLightColor: { value: pointColor },
      uPointLightIntensity: { value: light.point.intensity },
      uPointLightDistance: { value: light.point.distance },
      uFogColor: { value: fog },
      uFogNear: { value: fogNear },
      uFogFar: { value: fogFar },
      uSnapResolution: { value: snapResolution },
    },

    vertexShader: /* glsl */ `
      uniform vec3 uAmbientColor;
      uniform vec3 uPointLightPos;
      uniform vec3 uPointLightColor;
      uniform float uPointLightIntensity;
      uniform float uPointLightDistance;
      uniform float uFogNear;
      uniform float uFogFar;
      uniform vec2 uSnapResolution;

      varying vec3 vColor;
      varying vec2 vUv;
      varying float vW;
      varying float vFogFactor;

      void main() {
        // MVP transform
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec4 viewPos = viewMatrix * worldPos;
        vec4 clipPos = projectionMatrix * viewPos;

        // Vertex snap — snap NDC to low-res grid
        vec2 ndc = clipPos.xy / clipPos.w;
        ndc = floor(ndc * uSnapResolution + 0.5) / uSnapResolution;
        clipPos.xy = ndc * clipPos.w;

        gl_Position = clipPos;

        // Gouraud lighting — per-vertex diffuse
        vec3 worldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vec3 lightDir = uPointLightPos - worldPos.xyz;
        float dist = length(lightDir);
        lightDir = normalize(lightDir);

        float atten = clamp(1.0 - dist / uPointLightDistance, 0.0, 1.0);
        float NdotL = max(dot(worldNormal, lightDir), 0.0);
        vec3 diffuse = uPointLightColor * uPointLightIntensity * NdotL * atten;

        vColor = uAmbientColor + diffuse;

        // Affine UV prep — multiply by W so fragment can divide to get affine coords
        vUv = uv * clipPos.w;
        vW = clipPos.w;

        // Linear fog from view-space depth
        float fogDepth = -viewPos.z;
        vFogFactor = clamp((uFogFar - fogDepth) / (uFogFar - uFogNear), 0.0, 1.0);
      }
    `,

    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform sampler2D uMap;
      uniform bool uUseMap;
      uniform vec3 uFogColor;

      varying vec3 vColor;
      varying vec2 vUv;
      varying float vW;
      varying float vFogFactor;

      void main() {
        // Affine UV
        vec2 texUv = vUv / vW;

        vec3 color = uColor * vColor;
        if (uUseMap) {
          color *= texture2D(uMap, texUv).rgb;
        }

        // Fog
        color = mix(uFogColor, color, vFogFactor);

        gl_FragColor = vec4(color, 1.0);
      }
    `,

    lights: false,
  });
}
