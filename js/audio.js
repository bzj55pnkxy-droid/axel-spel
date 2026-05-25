/**
 * Audio System — Procedural ambient horror audio via Web Audio API.
 *
 * Layers:
 *   1. Ambient drone — constant low-frequency hum with brown noise texture
 *   2. Room tone — subtle mid-frequency resonance that shifts with puzzle stage
 *   3. Spatial sources — positioned in 3D space via PannerNode (HRTF):
 *      - Fridge hum (living room, east side)
 *      - Rain/wind (outside the window)
 *      - Electrical buzz (hallway ceiling)
 *   4. Dynamic tension — new layers appear and existing ones shift as the
 *      puzzle progresses (dissonant overtones, volume increases)
 *   5. One-shot effects — floor creaks, door slams, light flickers
 *
 * All sounds are synthesized procedurally — no audio files needed.
 */

import * as THREE from 'three';

export class AudioSystem {
  constructor(camera) {
    this.camera = camera;
    this.ctx = null;
    this.masterGain = null;
    this.initialized = false;
    this.suspended = false;
    this.sources = {};
    this._stage = 'AWARENESS';
    this._listener = null;
  }

  _ctxRunning() {
    return this.ctx && this.ctx.state === 'running';
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);
      this._listener = this.ctx.listener;
      this._syncListener();
    } catch (e) {
      console.warn('Web Audio API not available:', e.message);
      return;
    }

    // Start each layer independently so one failure doesn't kill the rest
    try { this._startAmbientDrone(); } catch (e) { console.warn('Ambient drone failed:', e.message); }
    try { this._startRoomTone(); } catch (e) { console.warn('Room tone failed:', e.message); }
    try { this._startSpatialSources(); } catch (e) { console.warn('Spatial sources failed:', e.message); }

    this.initialized = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    this.suspended = false;
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
    this.suspended = true;
  }

  destroy() {
    if (!this.initialized) return;
    try {
      for (const key of Object.keys(this.sources)) {
        const s = this.sources[key];
        if (s.source) {
          try { if (s.source.stop) s.source.stop(); } catch (e) { /* */ }
          try { if (s.source.disconnect) s.source.disconnect(); } catch (e) { /* */ }
        }
        if (s.gain) {
          try { s.gain.disconnect(); } catch (e) { /* */ }
        }
        if (s.panner) {
          try { s.panner.disconnect(); } catch (e) { /* */ }
        }
        // Clean up dissonant layer LFO oscillators
        if (key === 'dissonant') {
          if (s.lfo) {
            try { s.lfo.stop(); } catch (e) { /* */ }
            try { s.lfo.disconnect(); } catch (e) { /* */ }
          }
          if (s.lfoGain) {
            try { s.lfoGain.disconnect(); } catch (e) { /* */ }
          }
        }
      }
      this.sources = {};
      if (this.masterGain) this.masterGain.disconnect();
      this.ctx.close();
    } catch (e) { /* */ }
    this.initialized = false;
    this.ctx = null;
  }

  // --- Listener sync ---

  _syncListener() {
    if (!this._listener || !this.camera) return;
    const pos = this.camera.position;
    if (this._listener.positionX) {
      this._listener.positionX.value = pos.x;
      this._listener.positionY.value = pos.y;
      this._listener.positionZ.value = pos.z;
    } else {
      this._listener.setPosition(pos.x, pos.y, pos.z);
    }
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    if (this._listener.forwardX) {
      this._listener.forwardX.value = forward.x;
      this._listener.forwardY.value = forward.y;
      this._listener.forwardZ.value = forward.z;
      this._listener.upX.value = 0;
      this._listener.upY.value = 1;
      this._listener.upZ.value = 0;
    } else {
      this._listener.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
    }
  }

  // --- Ambient drone ---

  _startAmbientDrone() {
    const ctx = this.ctx;
    if (!ctx) return;

    const freqs = [55, 55.7];
    const groupGain = ctx.createGain();
    groupGain.gain.value = 0.08;
    groupGain.connect(this.masterGain);

    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      osc.connect(g);
      g.connect(groupGain);
      osc.start();
    }

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 30;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.04;
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start();

    const noise = this._makeNoiseNode(0.015);
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 200;
    noise.connect(nf);
    nf.connect(this.masterGain);
    noise.start();

    this.sources.ambientDrone = { groupGain, subGain };
  }

  // --- Room tone ---

  _startRoomTone() {
    const ctx = this.ctx;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 110;
    const gain = ctx.createGain();
    gain.gain.value = 0.02;
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 165.5;
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.0;
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start();

    this.sources.roomTone = { osc, gain, osc2, gain2 };
  }

  // --- Spatial sources ---

  _startSpatialSources() {
    this._createSpatialSource('fridge', 1.6, 0.8, -2.5, {
      type: 'sawtooth', freq: 60, gain: 0.03,
      filterFreq: 120, filterType: 'lowpass',
      refDistance: 1, maxDistance: 8,
    });
    this._createSpatialSource('rain', -1.9, 1.6, -2.9, {
      type: 'noise', gain: 0.02,
      filterFreq: 800, filterType: 'bandpass', filterQ: 0.5,
      refDistance: 2, maxDistance: 10,
    });
    this._createSpatialSource('electrical', 0, 2.5, 0.5, {
      type: 'sine', freq: 120, gain: 0.01,
      filterFreq: 240, filterType: 'lowpass',
      refDistance: 1, maxDistance: 6,
    });
  }

  _createSpatialSource(name, x, y, z, opts) {
    const ctx = this.ctx;
    if (!ctx) return;

    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = opts.refDistance || 1;
    panner.maxDistance = opts.maxDistance || 10;
    panner.rolloffFactor = opts.rolloff || 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;

    const gain = ctx.createGain();
    gain.gain.value = opts.gain || 0.03;

    let source;
    if (opts.type === 'noise') {
      source = this._makeNoiseNode(1.0);
    } else {
      source = ctx.createOscillator();
      source.type = opts.type || 'sine';
      source.frequency.value = opts.freq || 60;
    }

    source.connect(gain);

    if (opts.filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = opts.filterType || 'lowpass';
      filter.frequency.value = opts.filterFreq;
      if (opts.filterQ !== undefined) filter.Q.value = opts.filterQ;
      gain.connect(filter);
      filter.connect(panner);
    } else {
      gain.connect(panner);
    }

    panner.connect(this.masterGain);
    if (source.start) source.start();

    this.sources[name] = { panner, gain, source };
  }

  // --- Noise generator (brown noise with loop crossfade) ---

  _makeNoiseNode(amplitude) {
    const ctx = this.ctx;
    const seconds = 4;
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + (0.02 * white)) / 1.02;
      data[i] = last * 3.5;
    }
    const fadeLen = 1024;
    for (let i = 0; i < fadeLen; i++) {
      const t = i / fadeLen;
      const endIdx = bufferSize - fadeLen + i;
      const endVal = data[endIdx];
      const startVal = data[i];
      data[endIdx] = endVal * (1 - t) + startVal * t;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = amplitude;
    source.connect(gain);
    return { _source: source, _gain: gain, connect(n) { gain.connect(n); }, disconnect() { gain.disconnect(); }, start() { source.start(); }, stop() { source.stop(); } };
  }

  // --- Dynamic tension ---

  setStage(stage) {
    if (stage === this._stage) return;
    this._stage = stage;
    this._applyTension();
  }

  _applyTension() {
    if (!this._ctxRunning()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const rt = this.sources.roomTone;
    if (!rt) return;

    switch (this._stage) {
      case 'AWARENESS':
        rt.gain.gain.setTargetAtTime(0.02, now, 2);
        rt.gain2.gain.setTargetAtTime(0.0, now, 2);
        break;
      case 'UNDERSTANDING':
        rt.gain.gain.setTargetAtTime(0.03, now, 3);
        rt.gain2.gain.setTargetAtTime(0.015, now, 3);
        rt.osc2.frequency.setTargetAtTime(166.0, now, 2);
        break;
      case 'CONFRONTATION':
        rt.gain.gain.setTargetAtTime(0.05, now, 2);
        rt.gain2.gain.setTargetAtTime(0.035, now, 2);
        rt.osc2.frequency.setTargetAtTime(170.0, now, 3);
        this._ensureDissonantLayer(true);
        break;
      case 'RESOLUTION':
        rt.gain.gain.setTargetAtTime(0.01, now, 1);
        rt.gain2.gain.setTargetAtTime(0.0, now, 1);
        this._ensureDissonantLayer(false);
        break;
    }
  }

  _ensureDissonantLayer(enable) {
    if (enable && !this.sources.dissonant) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 220;
      const gain = ctx.createGain();
      gain.gain.value = 0.0;
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.3;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 3;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      this.sources.dissonant = { osc, gain, lfo, lfoGain };
    }
    const d = this.sources.dissonant;
    if (d && this._ctxRunning()) {
      const now = this.ctx.currentTime;
      d.gain.gain.setTargetAtTime(enable ? 0.025 : 0.0, now, 1.5);
    }
  }

  // --- One-shot effects (all guard against suspended context) ---

  playCreak() {
    if (!this._ctxRunning()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.3);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 800 + Math.random() * 400;
    f.Q.value = 5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    src.connect(f);
    f.connect(g);
    g.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.3);
    // Disconnect nodes after playback completes
    setTimeout(() => {
      try { src.disconnect(); f.disconnect(); g.disconnect(); } catch (e) { /* */ }
    }, 350);
  }

  playDoorSlam() {
    if (!this._ctxRunning()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    // Thump
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.15, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(tg);
    tg.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
    // Noise burst
    const len = Math.floor(ctx.sampleRate * 0.15);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 2000;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.08, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(f);
    f.connect(ng);
    ng.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.15);
    // Disconnect nodes after playback completes
    setTimeout(() => {
      try { osc.disconnect(); tg.disconnect(); src.disconnect(); f.disconnect(); ng.disconnect(); } catch (e) { /* */ }
    }, 250);
  }

  playLightFlicker() {
    if (!this._ctxRunning()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 120;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 240;
    f.Q.value = 10;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.04, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(f);
    f.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
    // Disconnect nodes after playback completes
    setTimeout(() => {
      try { osc.disconnect(); f.disconnect(); g.disconnect(); } catch (e) { /* */ }
    }, 200);
  }

  // --- Update ---

  update() {
    if (!this.initialized || this.suspended) return;
    this._syncListener();
  }
}
