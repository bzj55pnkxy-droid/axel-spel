import * as THREE from 'three';
import { createPS1Material } from './ps1Material.js';

const ROOM_HEIGHT = 2.8;
const DOOR_WIDTH = 0.9;

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

function addFloor(scene, material, w, d, x, z) {
  const segsW = Math.ceil(w / 0.5);
  const segsD = Math.ceil(d / 0.5);
  const geo = new THREE.PlaneGeometry(w, d, segsW, segsD);
  scaleUVs(geo, w, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0, z);
  scene.add(mesh);
}

function addCeiling(scene, material, w, d, x, z) {
  const segsW = Math.ceil(w / 0.5);
  const segsD = Math.ceil(d / 0.5);
  const geo = new THREE.PlaneGeometry(w, d, segsW, segsD);
  scaleUVs(geo, w, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, ROOM_HEIGHT, z);
  scene.add(mesh);
}

/**
 * Add a wall plane facing inward.
 * @param {number} facing - 0: +Z, 1: -Z, 2: +X, 3: -X
 */
function addWall(scene, material, w, h, cx, cy, cz, facing) {
  const segsW = Math.ceil(w / 0.5);
  const segsH = Math.ceil(h / 0.5);
  const geo = new THREE.PlaneGeometry(w, h, segsW, segsH);
  scaleUVs(geo, w, h);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(cx, cy, cz);
  // Rotate so plane normal faces inward
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

export function buildApartment(scene, textures, lightConfig, fogConfig) {
  const walls = [];
  const hy = ROOM_HEIGHT / 2;
  const halfDoor = DOOR_WIDTH / 2; // 0.45

  // Material helpers
  const mat = (tex, color) => makeMat(tex, color, fogConfig, lightConfig);

  const wallpaperMat = mat(textures.wallpaper, 0xcccccc);
  const wallpaperDarkMat = mat(textures.wallpaperDark, 0xcccccc);
  const tileFloorMat = mat(textures.tileFloor, 0xcccccc);
  const woodFloorMat = mat(textures.woodFloor, 0xcccccc);
  const ceilingMat = mat(textures.ceiling, 0xcccccc);
  const furnitureMat = mat(textures.furniture, 0xaaaaaa);

  // =============================================
  // HALLWAY: x ∈ [-1.25, 1.25], z ∈ [-0.9, 0.9]
  // 2.5m wide × 1.8m deep
  // =============================================
  const hallX = 0, hallZ = 0;
  const hallW = 2.5, hallD = 1.8;
  const hallMinX = -1.25, hallMaxX = 1.25;
  const hallMinZ = -0.9, hallMaxZ = 0.9;

  // Floor & Ceiling
  addFloor(scene, tileFloorMat, hallW, hallD, hallX, hallZ);
  addCeiling(scene, ceilingMat, hallW, hallD, hallX, hallZ);

  // South wall (z = 0.9, facing -Z into hallway) — with entry gap
  const sLeftW = -halfDoor - hallMinX; // 0.45 - (-1.25) = 0.8... wait: -0.45 - (-1.25) = 0.8
  const sRightW = hallMaxX - halfDoor; // 1.25 - 0.45 = 0.8

  addWall(scene, wallpaperMat, sLeftW, ROOM_HEIGHT,
    hallMinX + sLeftW / 2, hy, hallMaxZ, 1); // facing -Z
  addWall(scene, wallpaperMat, sRightW, ROOM_HEIGHT,
    hallMaxX - sRightW / 2, hy, hallMaxZ, 1);

  walls.push({ x1: hallMinX, z1: hallMaxZ, x2: -halfDoor, z2: hallMaxZ });
  walls.push({ x1: halfDoor, z1: hallMaxZ, x2: hallMaxX, z2: hallMaxZ });

  // North wall (z = -0.9, facing +Z) — with doorway to living room
  // Doorway: x ∈ [-0.45, 0.45]
  const nLeftW = -halfDoor - hallMinX; // 0.8
  const nRightW = hallMaxX - halfDoor; // 0.8

  addWall(scene, wallpaperMat, nLeftW, ROOM_HEIGHT,
    hallMinX + nLeftW / 2, hy, hallMinZ, 0); // facing +Z
  addWall(scene, wallpaperMat, nRightW, ROOM_HEIGHT,
    hallMaxX - nRightW / 2, hy, hallMinZ, 0);

  walls.push({ x1: hallMinX, z1: hallMinZ, x2: -halfDoor, z2: hallMinZ });
  walls.push({ x1: halfDoor, z1: hallMinZ, x2: hallMaxX, z2: hallMinZ });

  // West wall (x = -1.25, facing +X)
  addWall(scene, wallpaperMat, hallD, ROOM_HEIGHT,
    hallMinX, hy, hallZ, 2);
  walls.push({ x1: hallMinX, z1: hallMinZ, x2: hallMinX, z2: hallMaxZ });

  // East wall (x = 1.25, facing -X)
  addWall(scene, wallpaperMat, hallD, ROOM_HEIGHT,
    hallMaxX, hy, hallZ, 3);
  walls.push({ x1: hallMaxX, z1: hallMinZ, x2: hallMaxX, z2: hallMaxZ });

  // =============================================
  // LIVING ROOM: x ∈ [-2.0, 2.0], z ∈ [-4.9, -0.9]
  // 4.0m wide × 4.0m deep
  // =============================================
  const lrW = 4.0, lrD = 4.0;
  const lrMinX = -2.0, lrMaxX = 2.0;
  const lrMinZ = -4.9, lrMaxZ = -0.9;
  const lrCX = 0, lrCZ = -2.9;

  addFloor(scene, woodFloorMat, lrW, lrD, lrCX, lrCZ);
  addCeiling(scene, ceilingMat, lrW, lrD, lrCX, lrCZ);

  // South wall (z = -0.9, facing -Z into living room)
  // Shared with hallway north wall — only the extensions beyond hallway width
  // Left extension: x ∈ [-2.0, -1.25]
  const lrSouthLeftW = hallMinX - lrMinX; // 0.75
  const lrSouthRightW = lrMaxX - hallMaxX; // 0.75

  addWall(scene, wallpaperMat, lrSouthLeftW, ROOM_HEIGHT,
    lrMinX + lrSouthLeftW / 2, hy, lrMaxZ, 1);
  addWall(scene, wallpaperMat, lrSouthRightW, ROOM_HEIGHT,
    lrMaxX - lrSouthRightW / 2, hy, lrMaxZ, 1);

  walls.push({ x1: lrMinX, z1: lrMaxZ, x2: hallMinX, z2: lrMaxZ });
  walls.push({ x1: hallMaxX, z1: lrMaxZ, x2: lrMaxX, z2: lrMaxZ });

  // North wall (z = -4.9, facing +Z) — with doorway to bedroom
  // Doorway: x ∈ [-0.45, 0.45]
  const lrNorthLeftW = -halfDoor - lrMinX; // 1.55
  const lrNorthRightW = lrMaxX - halfDoor; // 1.55

  addWall(scene, wallpaperMat, lrNorthLeftW, ROOM_HEIGHT,
    lrMinX + lrNorthLeftW / 2, hy, lrMinZ, 0);
  addWall(scene, wallpaperMat, lrNorthRightW, ROOM_HEIGHT,
    lrMaxX - lrNorthRightW / 2, hy, lrMinZ, 0);

  walls.push({ x1: lrMinX, z1: lrMinZ, x2: -halfDoor, z2: lrMinZ });
  walls.push({ x1: halfDoor, z1: lrMinZ, x2: lrMaxX, z2: lrMinZ });

  // West wall (x = -2.0, facing +X) — split around window opening
  // Window opening: z ∈ [-3.4, -2.4], y ∈ [1.1, 2.1]
  // Left of window (z: -4.9 to -3.4)
  addWall(scene, wallpaperMat, 1.5, ROOM_HEIGHT,
    lrMinX, hy, -4.15, 2);
  // Right of window (z: -2.4 to -0.9)
  addWall(scene, wallpaperMat, 1.5, ROOM_HEIGHT,
    lrMinX, hy, -1.65, 2);
  // Below window (z: -3.4 to -2.4, y: 0 to 1.1)
  addWall(scene, wallpaperMat, 1.0, 1.1,
    lrMinX, 0.55, -2.9, 2);
  // Above window (z: -3.4 to -2.4, y: 2.1 to 2.8)
  addWall(scene, wallpaperMat, 1.0, 0.7,
    lrMinX, 2.45, -2.9, 2);
  walls.push({ x1: lrMinX, z1: lrMinZ, x2: lrMinX, z2: lrMaxZ });

  // East wall (x = 2.0, facing -X)
  addWall(scene, wallpaperMat, lrD, ROOM_HEIGHT,
    lrMaxX, hy, lrCZ, 3);
  walls.push({ x1: lrMaxX, z1: lrMinZ, x2: lrMaxX, z2: lrMaxZ });

  // --- Window frame on west wall ---
  const winW = 1.0, winH = 1.0;
  const winY = 1.6;
  const winX = lrMinX + 0.02;
  const winZ = lrCZ;
  const frameT = 0.05;
  const frameD = 0.08;
  const frameColor = 0x2a1a10;
  const frameMat = mat(textures.doorFrame, frameColor);
  // Top
  addBox(scene, frameMat, frameD, frameT, winW + frameT * 2, winX, winY + winH / 2 + frameT / 2, winZ);
  // Bottom
  addBox(scene, frameMat, frameD, frameT, winW + frameT * 2, winX, winY - winH / 2 - frameT / 2, winZ);
  // Left
  addBox(scene, frameMat, frameD, winH, frameT, winX, winY, winZ - winW / 2 - frameT / 2);
  // Right
  addBox(scene, frameMat, frameD, winH, frameT, winX, winY, winZ + winW / 2 + frameT / 2);

  // =============================================
  // BEDROOM: x ∈ [-1.5, 1.5], z ∈ [-8.4, -4.9]
  // 3.0m wide × 3.5m deep
  // =============================================
  const brW = 3.0, brD = 3.5;
  const brMinX = -1.5, brMaxX = 1.5;
  const brMinZ = -8.4, brMaxZ = -4.9;
  const brCX = 0, brCZ = -6.65;

  addFloor(scene, woodFloorMat, brW, brD, brCX, brCZ);
  addCeiling(scene, ceilingMat, brW, brD, brCX, brCZ);

  // South wall (z = -4.9, facing -Z into bedroom)
  // Shared with living room north wall — extensions beyond doorway
  // Left: x ∈ [-1.5, -2.0] — wait, bedroom is narrower than living room
  // The doorway is at x ∈ [-0.45, 0.45], bedroom extends x ∈ [-1.5, 1.5]
  // Living room north wall already covers x ∈ [-2.0, -0.45] and [0.45, 2.0]
  // We need bedroom south wall for: x ∈ [-1.5, -0.45] and [0.45, 1.5] — but these overlap with living room
  // Actually, the living room north wall at z=-4.9 spans x ∈ [-2.0, -0.45] and [0.45, 2.0]
  // That already covers the bedroom south wall too (bedroom is narrower).
  // We still need collision walls for bedroom bounds at z=-4.9 inside bedroom width but those are already part of the living room walls.
  // But we need the side walls that connect bedroom to living room boundary.

  // North wall (z = -8.4, facing +Z)
  addWall(scene, wallpaperDarkMat, brW, ROOM_HEIGHT,
    brCX, hy, brMinZ, 0);
  walls.push({ x1: brMinX, z1: brMinZ, x2: brMaxX, z2: brMinZ });

  // West wall (x = -1.5, facing +X)
  addWall(scene, wallpaperDarkMat, brD, ROOM_HEIGHT,
    brMinX, hy, brCZ, 2);
  walls.push({ x1: brMinX, z1: brMinZ, x2: brMinX, z2: brMaxZ });

  // East wall (x = 1.5, facing -X)
  addWall(scene, wallpaperDarkMat, brD, ROOM_HEIGHT,
    brMaxX, hy, brCZ, 3);
  walls.push({ x1: brMaxX, z1: brMinZ, x2: brMaxX, z2: brMaxZ });

  // Corner walls between living room and bedroom (z = -4.9)
  // Living room is wider (x ∈ [-2.0, 2.0]) than bedroom (x ∈ [-1.5, 1.5])
  // Need short walls from x = -2.0 to -1.5 and x = 1.5 to 2.0 at z = -4.9
  // Actually those are covered by the living room north wall segments.
  // But we need walls connecting bedroom west wall to living room west wall:
  // Left step: z = -4.9, x ∈ [-2.0, -1.5] — already part of lrNorthLeft wall
  // Right step: z = -4.9, x ∈ [1.5, 2.0] — already part of lrNorthRight wall

  // =============================================
  // FURNITURE
  // =============================================

  // --- Hallway ---
  // Small table against west wall
  addBox(scene, furnitureMat, 0.6, 0.7, 0.3, hallMinX + 0.35, 0.35, 0.2);
  // Shoe rack against east wall
  addBox(scene, furnitureMat, 0.8, 0.3, 0.3, hallMaxX - 0.45, 0.15, 0.3);

  // --- Living Room ---
  // Couch against east wall
  addBox(scene, furnitureMat, 1.6, 0.5, 0.7, lrMaxX - 0.45, 0.25, -2.5);
  // Coffee table in center
  addBox(scene, furnitureMat, 0.8, 0.35, 0.5, 0, 0.175, -2.5);
  // TV stand + CRT TV against west wall
  addBox(scene, furnitureMat, 0.6, 0.5, 0.4, lrMinX + 0.4, 0.25, -2.5);
  addBox(scene, furnitureMat, 0.5, 0.4, 0.4, lrMinX + 0.4, 0.7, -2.5);
  // Bookshelf against north wall
  addBox(scene, furnitureMat, 1.0, 1.8, 0.3, -1.2, 0.9, lrMinZ + 0.2);

  // --- Bedroom ---
  // Bed against east wall
  addBox(scene, furnitureMat, 1.4, 0.45, 2.0, brMaxX - 0.8, 0.225, -6.4);
  // Desk against west wall
  addBox(scene, furnitureMat, 1.0, 0.75, 0.5, brMinX + 0.6, 0.375, -7.5);
  // Chair in front of desk
  const chairMat = mat(textures.furniture, 0x888888);
  addBox(scene, chairMat, 0.4, 0.45, 0.4, brMinX + 0.6, 0.225, -7.0);
  // Chair back
  addBox(scene, chairMat, 0.4, 0.45, 0.05, brMinX + 0.6, 0.65, -7.2);

  return walls;
}
