/**
 * Horror Events & Scripting
 *
 * Event trigger system: location-based, action-based, time-based.
 * Manages the window silhouette, subtle object shifts, final encounter,
 * and screen effects (flicker, distortion).
 */

import * as THREE from 'three';

export const TriggerType = {
  LOCATION: 'location',
  ACTION: 'action',
  TIME: 'time',
  STAGE: 'stage',
};

export class HorrorSystem {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.triggers = [];
    this.gameTime = 0;

    this.screenEffects = { flicker: 0, distortion: 0, desaturation: 0 };
    this._flickerPhase = 0;

    this.silhouetteVisible = false;
    this.silhouetteOpacity = 0;
    this.silhouetteMesh = null;
    this._currentStage = 'AWARENESS';

    this._shiftedObjects = new Map();
    this._gazeTimer = 0;
    this._gazeRaycaster = new THREE.Raycaster();
    this._gazeRaycaster.far = 5;

    this.encounterTriggered = false;
    this.encounterActive = false;
    this.encounterPhase = 0;
    this.encounterTimer = 0;
    this._gameOverPending = false;

    this.initialized = false;
  }

  addTrigger(config) {
    this.triggers.push({
      type: config.type,
      condition: config.condition,
      action: config.action,
      fired: false,
      once: config.once !== false,
      id: config.id || '',
    });
  }

  createSilhouette() {
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false });
    const bodyGeo = new THREE.BoxGeometry(0.3, 0.8, 0.15);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.set(-4.85, 1.5, -3.5);
    const headGeo = new THREE.BoxGeometry(0.18, 0.2, 0.18);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, 0.5, 0);
    body.add(head);
    this.scene.add(body);
    this.silhouetteMesh = body;
    this._silhouetteMaterial = mat;
  }

  registerShiftable(mesh, shiftAmount, shiftInterval = 8) {
    this._shiftedObjects.set(mesh, { original: mesh.position.clone(), shift: shiftAmount.clone(), interval: shiftInterval, shifted: false });
  }

  update(delta) {
    if (!this.initialized) return;
    this.gameTime += delta;
    this._updateTriggers(delta);
    this._updateSilhouette(delta);
    this._updateSubtleShifts(delta);
    this._updateScreenEffects(delta);
    this._updateFinalEncounter(delta);
    this._decayScreenEffects(delta);
    // Defer game over by one frame so shader updates first
    if (this._gameOverPending) {
      this._gameOverPending = false;
      if (this._onGameOver) this._onGameOver();
    }
  }

  _updateTriggers(delta) {
    for (const trigger of this.triggers) {
      if (trigger.fired && trigger.once) continue;
      let fire = false;
      switch (trigger.type) {
        case TriggerType.LOCATION:
          fire = trigger.condition(this.camera.position);
          break;
        case TriggerType.TIME:
          fire = this.gameTime >= trigger.condition;
          break;
      }
      if (fire) { trigger.fired = true; trigger.action(this); }
    }
  }

  notifyAction(actionId) {
    for (const t of this.triggers) {
      if (t.type === TriggerType.ACTION && !t.fired && t.condition === actionId) {
        t.fired = true; t.action(this);
      }
    }
  }

  notifyStage(stage) {
    this._currentStage = stage;
    for (const t of this.triggers) {
      if (t.type === TriggerType.STAGE && !t.fired && t.condition === stage) {
        t.fired = true; t.action(this);
      }
    }
  }

  _updateSilhouette(delta) {
    if (!this.silhouetteMesh) return;
    const stage = this._currentStage;
    let targetOpacity = 0;

    if (stage === 'UNDERSTANDING' || stage === 'CONFRONTATION') {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const lookingWest = forward.x < -0.3;
      const nearWindow = this.camera.position.x < -0.5 && this.camera.position.z < -1.5;
      if (lookingWest && nearWindow && !this.silhouetteVisible && Math.random() < 0.002) {
        this.silhouetteVisible = true;
        this._silhouetteAppearTime = this.gameTime;
      }
      if (this.silhouetteVisible) {
        const elapsed = this.gameTime - (this._silhouetteAppearTime || 0);
        if (elapsed < 1.5) targetOpacity = 0.7 * (1 - elapsed / 1.5);
        else { this.silhouetteVisible = false; targetOpacity = 0; }
      }
    } else if (stage === 'RESOLUTION') {
      if (!this.silhouetteVisible && Math.random() < 0.005) {
        this.silhouetteVisible = true;
        this._silhouetteAppearTime = this.gameTime;
      }
      if (this.silhouetteVisible) {
        const elapsed = this.gameTime - (this._silhouetteAppearTime || 0);
        if (elapsed < 3.0) targetOpacity = 0.85 * (1 - elapsed / 3.0);
        else { this.silhouetteVisible = false; targetOpacity = 0; }
      }
    }

    this.silhouetteOpacity += (targetOpacity - this.silhouetteOpacity) * 2.0 * delta;
    this.silhouetteOpacity = Math.max(0, Math.min(1, this.silhouetteOpacity));
    this._silhouetteMaterial.opacity = this.silhouetteOpacity;
  }

  _updateSubtleShifts(delta) {
    this._gazeRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    let lookingAtShiftable = false;
    for (const [mesh] of this._shiftedObjects) {
      const hits = this._gazeRaycaster.intersectObject(mesh, true);
      if (hits.length > 0 && hits[0].distance < 3) { lookingAtShiftable = true; break; }
    }
    this._gazeTimer += lookingAtShiftable ? -delta : delta;
    this._gazeTimer = Math.max(0, this._gazeTimer);

    for (const [mesh, data] of this._shiftedObjects) {
      if (data.shifted) continue;
      if (this._gazeTimer > data.interval) {
        mesh.position.x += data.shift.x;
        mesh.position.y += data.shift.y;
        mesh.position.z += data.shift.z;
        data.shifted = true;
      }
    }
  }

  _updateScreenEffects(delta) {
    this._flickerPhase += delta * 15;
  }

  _decayScreenEffects(delta) {
    const decay = 3.0 * delta;
    this.screenEffects.flicker = Math.max(0, this.screenEffects.flicker - decay);
    this.screenEffects.distortion = Math.max(0, this.screenEffects.distortion - decay);
    this.screenEffects.desaturation = Math.max(0, this.screenEffects.desaturation - decay);
  }

  triggerFlicker(intensity = 0.5) { this.screenEffects.flicker = intensity; }
  triggerDistortion(intensity = 0.4) { this.screenEffects.distortion = intensity; }

  triggerFinalEncounter() {
    if (this.encounterTriggered) return;
    this.encounterTriggered = true;
    this.encounterActive = true;
    this.encounterPhase = 0;
    this.encounterTimer = 0;
  }

  _updateFinalEncounter(delta) {
    if (!this.encounterActive) return;
    this.encounterTimer += delta;

    switch (this.encounterPhase) {
      case 0:
        this.screenEffects.flicker = Math.max(this.screenEffects.flicker, 0.8);
        this.screenEffects.distortion = Math.max(this.screenEffects.distortion, 0.6);
        if (this.encounterTimer > 1.0) { this.encounterPhase = 1; this.encounterTimer = 0; }
        break;
      case 1:
        this.screenEffects.flicker = Math.max(this.screenEffects.flicker, 0.3);
        this.screenEffects.desaturation = Math.max(this.screenEffects.desaturation, 0.6);
        if (this.encounterTimer > 2.0) { this.encounterPhase = 2; this.encounterTimer = 0; }
        break;
      case 2:
        this.screenEffects.flicker = 1.0;
        this.screenEffects.distortion = 1.0;
        this.screenEffects.desaturation = 0.8;
        if (this.encounterTimer > 0.8) { this.encounterPhase = 3; this.encounterTimer = 0; }
        break;
      case 3:
        this.screenEffects.flicker = 0;
        this.screenEffects.distortion = 0;
        this.screenEffects.desaturation = 1.0;
        this.encounterActive = false;
        this._gameOverPending = true;
        break;
    }
  }

  onGameOver(cb) { this._onGameOver = cb; }

  getFlickerValue() {
    if (this.screenEffects.flicker <= 0) return 0;
    return this.screenEffects.flicker * (0.5 + 0.5 * Math.sin(this._flickerPhase));
  }

  getDistortionValue() { return this.screenEffects.distortion; }
  getDesaturationValue() { return this.screenEffects.desaturation; }
}
