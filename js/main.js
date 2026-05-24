import * as THREE from 'three';
import { createRenderer } from './renderer.js';
import { FirstPersonControls } from './controls.js';
import { createTextures } from './textures.js';
import { buildApartment } from './apartment.js';
import { buildOutdoor } from './outdoor.js';

// --- Constants ---
const RENDER_WIDTH = 320;
const RENDER_HEIGHT = 240;
const EYE_HEIGHT = 1.6;

// --- Light data (used by PS1 shader, not Three.js lights) ---
const LIGHT = {
  ambient: new THREE.Color(0x333333),
  point: {
    position: new THREE.Vector3(0, 2.5, -0.9),
    color: new THREE.Color(0xffddaa),
    intensity: 3,
    distance: 12,
  },
};
const FOG_COLOR = new THREE.Color(0x0a0a0a);
const FOG_NEAR = 3;
const FOG_FAR = 15;

const OUTDOOR_LIGHT = {
  ambient: new THREE.Color(0x111118),
  point: {
    position: new THREE.Vector3(-3.5, -0.5, -2.9),
    color: new THREE.Color(0xffcc66),
    intensity: 2.5,
    distance: 14,
  },
};

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(60, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 20);
camera.position.set(0, EYE_HEIGHT, 0.5);

// --- Renderer ---
const { renderer, renderTarget, quadScene, quadCamera } = createRenderer(RENDER_WIDTH, RENDER_HEIGHT);
document.body.appendChild(renderer.domElement);

// --- Controls ---
const controls = new FirstPersonControls(camera, renderer.domElement);

// --- Build Apartment ---
const textures = createTextures();
const walls = buildApartment(scene, textures, LIGHT, { color: FOG_COLOR, near: FOG_NEAR, far: FOG_FAR });
buildOutdoor(scene, textures, OUTDOOR_LIGHT, { color: FOG_COLOR, near: FOG_NEAR, far: FOG_FAR });
controls.setWalls(walls);

// --- UI ---
const blocker = document.getElementById('blocker');
blocker.addEventListener('click', () => controls.lock());
controls.onLock(() => blocker.classList.add('hidden'));
controls.onUnlock(() => blocker.classList.remove('hidden'));

// --- Game Loop ---
let prevTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = (now - prevTime) / 1000;
  prevTime = now;
  controls.update(delta);

  // Render scene to low-res target
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);

  // Blit upscaled to screen
  renderer.setRenderTarget(null);
  renderer.render(quadScene, quadCamera);
}

animate();

// --- Resize ---
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});