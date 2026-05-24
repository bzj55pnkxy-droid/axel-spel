import * as THREE from 'three';
import { createPS1Material } from './ps1Material.js';

function makeMat(texture, color, fogConfig, lightConfig) {
  return createPS1Material({
    color,
    map: texture,
    fogColor: fogConfig.color,
    fogNear: fogConfig.near,
    fogFar: fogConfig.far,
    light: lightConfig,
  });
}

function scaleUVs(geometry, w, h) {
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
  }
  uv.needsUpdate = true;
}

function addWall(scene, material, w, h, cx, cy, cz, facing) {
  const segsW = Math.ceil(w / 0.5);
  const segsH = Math.ceil(h / 0.5);
  const geo = new THREE.PlaneGeometry(w, h, segsW, segsH);
  scaleUVs(geo, w, h);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(cx, cy, cz);
  const rotations = [0, Math.PI, Math.PI / 2, -Math.PI / 2];
  mesh.rotation.y = rotations[facing];
  scene.add(mesh);
}

function addBox(scene, material, w, h, d, x, y, z) {
  const segs = 2;
  const geo = new THREE.BoxGeometry(w, h, d, segs, segs, segs);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

export function buildOutdoor(scene, textures, lightConfig, fogConfig) {
  const mat = (tex, color) => makeMat(tex, color, fogConfig, lightConfig);

  const brickMat = mat(textures.brickExterior, 0xcccccc);
  const asphaltMat = mat(textures.asphalt, 0xcccccc);
  const skyMat = mat(textures.darkSky, 0xcccccc);
  const litWinMat = mat(textures.litWindow, 0xffddaa);
  const lampPoleMat = mat(textures.doorFrame, 0x888888);
  const lampHeadMat = mat(textures.litWindow, 0xffffcc);

  // --- A. Our building exterior (visible looking down/up from window) ---
  // Below window
  addWall(scene, brickMat, 3.0, 6.7,
    -2.02, -2.25, -2.9, 3); // facing -X
  // Above window
  addWall(scene, brickMat, 3.0, 1.5,
    -2.02, 2.85, -2.9, 3);

  // --- B. Opposite building facade ---
  // Main wall at x=-5.0, facing +X
  addWall(scene, brickMat, 6.0, 9.6,
    -5.0, -0.8, -2.9, 2);
  // Lit windows (slightly proud at x=-4.97)
  // Window A: same floor, offset left
  addWall(scene, litWinMat, 0.5, 0.6,
    -4.97, 1.5, -3.5, 2);
  // Window B: floor below, offset right
  addWall(scene, litWinMat, 0.5, 0.6,
    -4.97, -1.0, -2.2, 2);
  // Window C: same floor, offset right
  addWall(scene, litWinMat, 0.5, 0.6,
    -4.97, 1.5, -1.8, 2);

  // --- C. Street/ground ---
  const streetGeo = new THREE.PlaneGeometry(4.0, 6.0, 8, 12);
  scaleUVs(streetGeo, 4.0, 6.0);
  const streetMesh = new THREE.Mesh(streetGeo, asphaltMat);
  streetMesh.rotation.x = -Math.PI / 2;
  streetMesh.position.set(-3.5, -5.6, -2.9);
  scene.add(streetMesh);

  // --- D. Alley side walls (prevent seeing void) ---
  // Near wall (z=0.1, facing -Z)
  addWall(scene, brickMat, 3.0, 9.6,
    -3.5, -0.8, 0.1, 1);
  // Far wall (z=-5.9, facing +Z)
  addWall(scene, brickMat, 3.0, 9.6,
    -3.5, -0.8, -5.9, 0);

  // --- E. Sky backdrop ---
  // Back plane at x=-7.0, facing +X
  addWall(scene, skyMat, 8.0, 14.0,
    -7.0, 0, -2.9, 2);
  // Top plane at y=5.0, facing down
  const topSkyGeo = new THREE.PlaneGeometry(5.0, 8.0, 10, 16);
  scaleUVs(topSkyGeo, 5.0, 8.0);
  const topSkyMesh = new THREE.Mesh(topSkyGeo, skyMat);
  topSkyMesh.rotation.x = Math.PI / 2;
  topSkyMesh.position.set(-4.5, 5.0, -2.9);
  scene.add(topSkyMesh);

  // --- F. Street lamp ---
  // Pole
  addBox(scene, lampPoleMat, 0.08, 5.0, 0.08, -3.5, -3.1, -2.0);
  // Lamp head
  addBox(scene, lampHeadMat, 0.3, 0.1, 0.1, -3.5, -0.5, -2.0);
}
