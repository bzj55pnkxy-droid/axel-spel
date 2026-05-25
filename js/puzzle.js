/**
 * Puzzle system — The Mirroring mechanic.
 *
 * The doppelganger "mirrors" the player's actions in a twisted, horror-tinged
 * way. The player must discover the pattern to progress toward the bedroom.
 *
 * Mirror pattern: actions in one room cause reversed effects in another.
 *   - Hallway light on → living room light flickers
 *   - Living room light on → bedroom lamp flickers
 *   - TV on → living room light briefly dies
 *   - Opening bedroom door → it slams back (until puzzle solved)
 *
 * Progression: AWARENESS → UNDERSTANDING → CONFRONTATION → RESOLUTION
 * After enough interactions, the bedroom is "unlocked".
 */

export const MirrorEvent = {
  FLICKER: 'flicker',
  FLICKER_DIE: 'flickerDie',
  SLAM: 'slam',
  SHADOW: 'shadow',
  TV_STATIC: 'tvStatic',
  AMBIENT_PULSE: 'ambientPulse',
  HINT_TEXT: 'hintText',
};

const THRESHOLDS = {
  UNDERSTANDING: 3,
  CONFRONTATION: 6,
  RESOLUTION: 9,
};

export class PuzzleSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.actionLog = [];
    this.mirrorLog = [];
    this.progress = 0;
    this.stage = 'AWARENESS';

    this.activeEffects = [];
    this.ambientTimer = 0;
    this.lastAmbientMirror = 0;

    this.bedroomUnlocked = false;

    this.mirrorRules = new Map();
    this.flags = {};

    this._onHint = null;
  }

  onHint(cb) {
    this._onHint = cb;
  }

  showHint(text, duration = 3000) {
    if (this._onHint) this._onHint(text, duration);
  }

  addMirrorRule(actionId, config) {
    this.mirrorRules.set(actionId, config);
  }

  recordAction(actionId) {
    const now = performance.now();
    this.actionLog.push({ actionId, timestamp: now });
    this._advanceProgress();
    this._triggerMirror(actionId);
  }

  _advanceProgress() {
    this.progress = this.actionLog.length;
    if (this.progress >= THRESHOLDS.RESOLUTION) {
      this.stage = 'RESOLUTION';
      this.bedroomUnlocked = true;
    } else if (this.progress >= THRESHOLDS.CONFRONTATION) {
      this.stage = 'CONFRONTATION';
    } else if (this.progress >= THRESHOLDS.UNDERSTANDING) {
      this.stage = 'UNDERSTANDING';
    }
  }

  _triggerMirror(actionId) {
    const rule = this.mirrorRules.get(actionId);
    if (!rule) return;

    const delayMs = (rule.delay || 1.0) * 1000;

    this.activeEffects.push({
      fireAt: performance.now() + delayMs,
      actionId,
      rule,
      fired: false,
    });
  }

  getStage() { return this.stage; }
  getProgress() { return this.progress; }
  isBedroomUnlocked() { return this.bedroomUnlocked; }
  getFlags() { return this.flags; }

  setFlag(key, value) {
    this.flags[key] = value;
  }

  getActionCount(actionId) {
    return this.actionLog.filter(a => a.actionId === actionId).length;
  }

  getLastMirror() {
    if (this.mirrorLog.length === 0) return null;
    return this.mirrorLog[this.mirrorLog.length - 1];
  }

  update(delta) {
    delta = Math.min(delta, 0.5); // clamp to avoid tab-switch spikes
    const now = performance.now();

    for (const effect of this.activeEffects) {
      if (!effect.fired && now >= effect.fireAt) {
        effect.fired = true;
        this._fireMirrorEffect(effect.actionId, effect.rule);
      }
    }

    this.activeEffects = this.activeEffects.filter(e => !e.fired);

    this.ambientTimer += delta;
    const ambientInterval = this.stage === 'CONFRONTATION' ? 15 : 30;
    if ((this.stage === 'CONFRONTATION' || this.stage === 'UNDERSTANDING') &&
        this.ambientTimer - this.lastAmbientMirror > ambientInterval) {
      this.lastAmbientMirror = this.ambientTimer;
      this._ambientPulse();
    }
  }

  _fireMirrorEffect(actionId, rule) {
    if (rule.fn) rule.fn(this);

    this.mirrorLog.push({
      type: rule.type,
      actionId,
      timestamp: performance.now(),
    });

    if (this.mirrorLog.length > 50) {
      this.mirrorLog = this.mirrorLog.slice(-30);
    }
  }

  _ambientPulse() {
    this.scene.traverse((child) => {
      if (child.isMesh && child.material && child.material.uniforms &&
          child.material.uniforms.uPointLightIntensity) {
        const orig = child.material.uniforms.uPointLightIntensity.value;
        child.material.uniforms.uPointLightIntensity.value = orig * 0.7;
        setTimeout(() => {
          if (child.material && child.material.uniforms) {
            child.material.uniforms.uPointLightIntensity.value = orig;
          }
        }, 150);
      }
    });
  }
}
