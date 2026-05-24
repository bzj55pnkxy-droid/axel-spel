import * as THREE from 'three';

export class FirstPersonControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.moveSpeed = 3.0;
    this.lookSpeed = 0.002;

    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;

    this.isLocked = false;
    this._onLockCbs = [];
    this._onUnlockCbs = [];

    // Wall segments for collision
    this.walls = [];

    this._bind();
  }

  setWalls(segments) {
    this.walls = segments; // array of { x1, z1, x2, z2 }
  }

  _bind() {
    document.addEventListener('keydown', (e) => this._onKey(e, true));
    document.addEventListener('keyup', (e) => this._onKey(e, false));
    document.addEventListener('mousemove', (e) => this._onMouse(e));
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      const cbs = this.isLocked ? this._onLockCbs : this._onUnlockCbs;
      cbs.forEach(cb => cb());
      if (!this.isLocked) {
        this.moveForward = this.moveBackward = this.moveLeft = this.moveRight = false;
      }
    });
  }

  lock() { this.domElement.requestPointerLock(); }
  unlock() { document.exitPointerLock(); }
  onLock(cb) { this._onLockCbs.push(cb); }
  onUnlock(cb) { this._onUnlockCbs.push(cb); }

  _onKey(e, down) {
    if (!this.isLocked && down) return;
    switch (e.code) {
      case 'KeyW': this.moveForward = down; break;
      case 'KeyS': this.moveBackward = down; break;
      case 'KeyA': this.moveLeft = down; break;
      case 'KeyD': this.moveRight = down; break;
    }
  }

  _onMouse(e) {
    if (!this.isLocked) return;
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= (e.movementX || 0) * this.lookSpeed;
    this.euler.x -= (e.movementY || 0) * this.lookSpeed;
    this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  }

  update(delta) {
    if (!this.isLocked) return;

    // Friction
    this.velocity.x *= 1 - 10 * delta;
    this.velocity.z *= 1 - 10 * delta;

    // Acceleration from input
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    const accel = this.moveSpeed * 20 * delta;
    this.velocity.z -= this.direction.z * accel;
    this.velocity.x -= this.direction.x * accel;

    // Move relative to camera yaw
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    this.camera.position.addScaledVector(forward, -this.velocity.z * delta);
    this.camera.position.addScaledVector(right, -this.velocity.x * delta);

    // Wall collision — push player out of wall segments
    const margin = 0.25;
    for (const wall of this.walls) {
      const px = this.camera.position.x;
      const pz = this.camera.position.z;

      // Vector from wall start to end
      const dx = wall.x2 - wall.x1;
      const dz = wall.z2 - wall.z1;
      const lenSq = dx * dx + dz * dz;
      if (lenSq === 0) continue;

      // Project player onto wall segment (clamped to [0,1])
      let t = ((px - wall.x1) * dx + (pz - wall.z1) * dz) / lenSq;
      t = Math.max(0, Math.min(1, t));

      // Closest point on segment
      const cx = wall.x1 + t * dx;
      const cz = wall.z1 + t * dz;

      // Distance from player to closest point
      const ox = px - cx;
      const oz = pz - cz;
      const dist = Math.sqrt(ox * ox + oz * oz);

      if (dist < margin && dist > 0.0001) {
        // Push player out along normal
        const pushX = (ox / dist) * (margin - dist);
        const pushZ = (oz / dist) * (margin - dist);
        this.camera.position.x += pushX;
        this.camera.position.z += pushZ;
      }
    }

    // Lock to eye height
    this.camera.position.y = 1.6;
  }
}
