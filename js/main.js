import * as THREE from 'three';
import { createRenderer } from './renderer.js';
import { FirstPersonControls } from './controls.js';
import { createTextures } from './textures.js';
import { buildApartment } from './apartment.js';
import { buildOutdoor } from './outdoor.js';
import { InteractionSystem } from './interaction.js';
import { PuzzleSystem, MirrorEvent } from './puzzle.js';
import { AudioSystem } from './audio.js';
import { HorrorSystem } from './horror.js';

// =============================================
// GAME STATE
// =============================================
const GameState = { TITLE: 'title', INTRO: 'intro', PLAYING: 'playing', CLIMAX: 'climax', ENDING: 'ending' };
let state = GameState.TITLE;

// =============================================
// CONSTANTS & SCENE
// =============================================
const RENDER_WIDTH = 320;
const RENDER_HEIGHT = 240;
const EYE_HEIGHT = 1.6;

const LIGHT = {
  ambient: new THREE.Color(0x333333),
  point: { position: new THREE.Vector3(0, 2.5, -0.9), color: new THREE.Color(0xffddaa), intensity: 3, distance: 12 },
};
const FOG_COLOR = new THREE.Color(0x0a0a0a);
const FOG_NEAR = 3;
const FOG_FAR = 15;
const OUTDOOR_LIGHT = {
  ambient: new THREE.Color(0x111118),
  point: { position: new THREE.Vector3(-3.5, -0.5, -2.9), color: new THREE.Color(0xffcc66), intensity: 2.5, distance: 14 },
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(60, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 20);

const { renderer, renderTarget, quadScene, quadCamera, quadMaterial } = createRenderer(RENDER_WIDTH, RENDER_HEIGHT);
document.body.appendChild(renderer.domElement);

// =============================================
// SYSTEMS
// =============================================
const controls = new FirstPersonControls(camera, renderer.domElement);

const interaction = new InteractionSystem(camera, renderer.domElement);
interaction.setPromptElement(document.getElementById('interact-prompt'));

const puzzle = new PuzzleSystem(scene, camera);
const puzzleHintEl = document.getElementById('puzzle-hint');
let hintTimer = null;

puzzle.showHint = (text, duration = 3000) => {
  if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; }
  puzzleHintEl.textContent = text;
  puzzleHintEl.classList.remove('visible');
  void puzzleHintEl.offsetWidth;
  puzzleHintEl.classList.add('visible');
  hintTimer = setTimeout(() => { puzzleHintEl.classList.remove('visible'); hintTimer = null; }, duration);
};

const audio = new AudioSystem(camera);
const horror = new HorrorSystem(scene, camera, renderer);
horror.createSilhouette();

// =============================================
// SCENE CONTENT
// =============================================
const textures = createTextures();
const wallSegments = buildApartment(scene, textures, LIGHT, { color: FOG_COLOR, near: FOG_NEAR, far: FOG_FAR });
buildOutdoor(scene, textures, OUTDOOR_LIGHT, { color: FOG_COLOR, near: FOG_NEAR, far: FOG_FAR });
controls.setWalls(wallSegments);

const wallMeshes = [];
scene.traverse((child) => {
  if (child.isMesh && child.geometry && child.geometry.type === 'PlaneGeometry') wallMeshes.push(child);
});
interaction.setWalls(wallMeshes);

let tvScreenMesh = null;
scene.traverse((child) => {
  if (!tvScreenMesh && child.isMesh && child.position.x < -1.4 &&
      child.position.z < -2.3 && child.position.z > -2.7 &&
      child.position.y > 0.5 && child.position.y < 1.0 &&
      child.material && child.material.uniforms && child.material.uniforms.uColor) {
    tvScreenMesh = child;
  }
});

// =============================================
// HELPERS
// =============================================
function makeHitbox(w, h, d, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshBasicMaterial({ visible: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

function setHighlight(mesh, on) {
  if (!mesh) return;
  mesh.traverse((child) => {
    if (child.isMesh && child.material && child.material.emissive) {
      if (on) { child.material._origEmissive = child.material.emissive.getHex(); child.material.emissive.setHex(0x222222); }
      else if (child.material._origEmissive !== undefined) child.material.emissive.setHex(child.material._origEmissive);
    }
  });
}

let shakeInterval = null;
let flickerTimers = [];

function flickerLights(duration = 300, factor = 0.2) {
  const targets = [];
  scene.traverse((child) => {
    if (child.isMesh && child.material && child.material.uniforms && child.material.uniforms.uPointLightIntensity)
      targets.push({ u: child.material.uniforms.uPointLightIntensity, orig: child.material.uniforms.uPointLightIntensity.value });
  });
  for (const t of targets) t.u.value = t.orig * factor;
  const timer = setTimeout(() => { for (const t of targets) { if (t.u) t.u.value = t.orig; } flickerTimers = flickerTimers.filter(x => x !== timer); }, duration);
  flickerTimers.push(timer);
}

function doorSlam() {
  if (shakeInterval !== null) { clearInterval(shakeInterval); shakeInterval = null; }
  const ox = camera.position.x, oy = camera.position.y;
  let frame = 0;
  shakeInterval = setInterval(() => {
    frame++;
    const i = 0.03 * (1 - frame / 6);
    camera.position.x = ox + (Math.random() - 0.5) * i;
    camera.position.y = oy + (Math.random() - 0.5) * i;
    if (frame >= 6) { clearInterval(shakeInterval); shakeInterval = null; camera.position.x = ox; camera.position.y = oy; }
  }, 30);
function cancelAllEffects() {
  for (const t of flickerTimers) clearTimeout(t);
  flickerTimers = [];
  if (shakeInterval !== null) { clearInterval(shakeInterval); shakeInterval = null; }
}
function cancelAllEffects() {
  for (const t of flickerTimers) clearTimeout(t);
  flickerTimers = [];
  if (shakeInterval !== null) { clearInterval(shakeInterval); shakeInterval = null; }
  // Restore any lights that may have been dimmed by in-progress flickers
  scene.traverse((child) => {
    if (child.isMesh && child.material && child.material.uniforms && child.material.uniforms.uPointLightIntensity) {
      child.material.uniforms.uPointLightIntensity.value = LIGHT.point.intensity;
    }
  });
}

function cancelAllEffects() {
  for (const t of flickerTimers) clearTimeout(t);
  flickerTimers = [];
  if (shakeInterval !== null) { clearInterval(shakeInterval); shakeInterval = null; }
}

let hallLightOn = true;
let lrLightOn = true;
let tvOn = false;
let bedroomDoorOpen = false;
let bedroomDoorLocked = true;
let lastDoorAttempt = 0;

function recordPuzzleAction(actionId) {
  const now = performance.now();
  if (actionId === 'bedroom_door') {
    if (puzzle.getActionCount('bedroom_door') >= 2) return;
    if (now - lastDoorAttempt < 1500) return;
    lastDoorAttempt = now;
  }
  puzzle.recordAction(actionId);
  horror.notifyAction(actionId);
}

function isPlayerInBedroom(pos) { return pos.x > -1.6 && pos.x < 1.6 && pos.z < -4.8 && pos.z > -8.5 && pos.y < 2.0; }

// =============================================
// INTERACTIVE OBJECTS + MIRROR RULES
// =============================================

const hallSwitchHitbox = makeHitbox(0.2, 0.2, 0.1, -1.22, 1.2, 0.5);
interaction.register(hallSwitchHitbox, () => hallLightOn ? '[E] Turn off hallway light' : '[E] Turn on hallway light', () => {
  hallLightOn = !hallLightOn;
  const i = hallLightOn ? 3 : 0.3;
  LIGHT.point.intensity = i;
  scene.traverse((c) => { if (c.isMesh && c.material && c.material.uniforms && c.material.uniforms.uPointLightIntensity) c.material.uniforms.uPointLightIntensity.value = i; });
  audio.playLightFlicker();
  recordPuzzleAction('hall_light');
});
puzzle.addMirrorRule('hall_light', { type: MirrorEvent.FLICKER, delay: 1.2, fn: (p) => {
  flickerLights(400, 0.15); audio.playCreak();
  if (p.getProgress() <= 2) setTimeout(() => p.showHint('...did the other room just flicker?', 3500), 800);
}});

const hallTableHitbox = makeHitbox(0.7, 0.8, 0.4, -0.9, 0.4, 0.2);
interaction.register(hallTableHitbox, '[E] Examine the table', () => recordPuzzleAction('hall_table'));
puzzle.addMirrorRule('hall_table', { type: MirrorEvent.HINT_TEXT, delay: 1.5, fn: (p) => {
  if (p.getStage() === 'AWARENESS') p.showHint('The objects here feel... rearranged.', 3000);
}});

const lrSwitchHitbox = makeHitbox(0.2, 0.2, 0.1, 1.97, 1.2, -1.5);
interaction.register(lrSwitchHitbox, () => lrLightOn ? '[E] Dim living room light' : '[E] Brighten living room light', () => {
  lrLightOn = !lrLightOn;
  const i = lrLightOn ? 3 : 0.5;
  LIGHT.point.intensity = i;
  scene.traverse((c) => { if (c.isMesh && c.material && c.material.uniforms && c.material.uniforms.uPointLightIntensity) c.material.uniforms.uPointLightIntensity.value = i; });
  audio.playLightFlicker();
  recordPuzzleAction('lr_light');
});
puzzle.addMirrorRule('lr_light', { type: MirrorEvent.FLICKER_DIE, delay: 1.0, fn: (p) => {
  flickerLights(600, 0.05);
  const s = p.getStage();
  if (s === 'UNDERSTANDING') setTimeout(() => p.showHint('It responds. It copies you \u2014 but wrong.', 4000), 700);
  else if (s === 'CONFRONTATION') setTimeout(() => p.showHint('It doesn\'t want you to see.', 3500), 700);
}});

const tvHitbox = makeHitbox(0.6, 0.6, 0.6, -1.55, 0.75, -2.5);
interaction.register(tvHitbox, () => tvOn ? '[E] Turn off TV' : '[E] Turn on TV', () => {
  tvOn = !tvOn;
  if (tvScreenMesh && tvScreenMesh.material && tvScreenMesh.material.uniforms && tvScreenMesh.material.uniforms.uColor)
    tvScreenMesh.material.uniforms.uColor.value = tvOn ? new THREE.Color(0x8888ff) : new THREE.Color(0x333333);
  audio.playLightFlicker();
  recordPuzzleAction('tv');
}, tvScreenMesh, (m) => setHighlight(m, true), (m) => setHighlight(m, false));
puzzle.addMirrorRule('tv', { type: MirrorEvent.TV_STATIC, delay: 0.8, fn: (p) => {
  flickerLights(500, 0.1);
  if (tvScreenMesh && tvScreenMesh.material && tvScreenMesh.material.uniforms && tvScreenMesh.material.uniforms.uColor) {
    tvScreenMesh.material.uniforms.uColor.value = new THREE.Color(0x444444);
    setTimeout(() => { if (tvScreenMesh && tvScreenMesh.material && tvScreenMesh.material.uniforms) tvScreenMesh.material.uniforms.uColor.value = tvOn ? new THREE.Color(0x8888ff) : new THREE.Color(0x333333); }, 500);
  }
  if (p.getStage() === 'CONFRONTATION') setTimeout(() => p.showHint('Something is behind the static...', 3000), 600);
}});

const bookshelfHitbox = makeHitbox(1.1, 1.9, 0.4, -1.2, 0.95, -4.65);
interaction.register(bookshelfHitbox, '[E] Examine the bookshelf', () => recordPuzzleAction('bookshelf'));
puzzle.addMirrorRule('bookshelf', { type: MirrorEvent.AMBIENT_PULSE, delay: 1.0, fn: (p) => {
  flickerLights(250, 0.05); audio.playCreak();
  if (p.getStage() === 'CONFRONTATION') setTimeout(() => p.showHint('Did that shadow just move?', 3000), 400);
}});
horror.registerShiftable(bookshelfHitbox, new THREE.Vector3(0.05, 0, 0.05), 15);

const bedroomDoorHitbox = makeHitbox(1.0, 2.2, 0.3, 0, 1.4, -4.75);
interaction.register(bedroomDoorHitbox, () => {
  if (!bedroomDoorLocked) return bedroomDoorOpen ? '[E] Close bedroom door' : '[E] Open bedroom door';
  if (puzzle.isBedroomUnlocked()) return '[E] Open bedroom door';
  return '[E] Try the bedroom door';
}, () => {
  if (!bedroomDoorLocked) { bedroomDoorOpen = !bedroomDoorOpen; bedroomDoorHitbox.position.z = bedroomDoorOpen ? -4.6 : -4.75; }
  else if (puzzle.isBedroomUnlocked()) { bedroomDoorLocked = false; cancelAllEffects(); flickerLights(500, 0.03); audio.playDoorSlam(); puzzle.showHint('The door swings open on its own.', 3000); }
  else recordPuzzleAction('bedroom_door');
});
puzzle.addMirrorRule('bedroom_door', { type: MirrorEvent.SLAM, delay: 0.3, fn: (p) => {
  flickerLights(200, 0.02); audio.playDoorSlam(); doorSlam();
  const r = 9 - p.getProgress();
  if (p.getStage() === 'CONFRONTATION' && r > 0) p.showHint(`The door won't budge. ${r} more...`, 2500);
  else if (p.getStage() === 'UNDERSTANDING') p.showHint('It won\'t let you through. Not yet.', 3000);
}});

const bedHitbox = makeHitbox(1.5, 0.5, 2.1, 0.7, 0.25, -6.4);
interaction.register(bedHitbox, '[E] Sit on the bed', () => recordPuzzleAction('bed'));
puzzle.addMirrorRule('bed', { type: MirrorEvent.HINT_TEXT, delay: 2.0, fn: (p) => {
  if (p.getStage() === 'RESOLUTION') p.showHint('The door is free. Go.', 3000);
  else if (p.getStage() === 'CONFRONTATION') p.showHint('You feel a presence beneath you. Stand up.', 3000);
}});

const deskHitbox = makeHitbox(1.1, 0.85, 0.6, -0.85, 0.425, -7.5);
interaction.register(deskHitbox, '[E] Examine the desk', () => recordPuzzleAction('desk'));
puzzle.addMirrorRule('desk', { type: MirrorEvent.HINT_TEXT, delay: 1.5, fn: (p) => {
  if (p.getStage() === 'UNDERSTANDING') p.showHint('This place feels inhabited. By something that knows you.', 4000);
  else if (p.getStage() === 'CONFRONTATION') p.showHint('Your reflection in the dark screen \u2014 it\'s not yours.', 4000);
}});

const windowHitbox = makeHitbox(0.2, 1.2, 1.2, -1.95, 1.6, -2.9);
interaction.register(windowHitbox, '[E] Look out the window', () => recordPuzzleAction('window'));
puzzle.addMirrorRule('window', { type: MirrorEvent.SHADOW, delay: 1.0, fn: (p) => {
  flickerLights(300, 0.08);
  if (p.getStage() === 'UNDERSTANDING') setTimeout(() => p.showHint('Across the street \u2014 that figure. It\'s watching.', 4000), 500);
  else if (p.getStage() === 'CONFRONTATION') setTimeout(() => p.showHint('The silhouette moves when you don\'t look directly.', 4000), 500);
}});

// =============================================
// TRIGGERS
// =============================================
horror.addTrigger({
  type: 'location',
  condition: (pos) => isPlayerInBedroom(pos) && puzzle.isBedroomUnlocked() && !horror.encounterTriggered,
  action: (h) => { transitionTo(GameState.CLIMAX); h.triggerFinalEncounter(); audio.playDoorSlam(); },
  once: true, id: 'bedroom_encounter',
});
horror.addTrigger({
  type: 'stage', condition: 'CONFRONTATION',
  action: (h) => { h.triggerFlicker(0.3); audio.playCreak(); },
  once: true, id: 'confrontation_flicker',
});
horror.onGameOver(() => { transitionTo(GameState.ENDING); });

// =============================================
// INTRO SEQUENCE
// =============================================
const INTRO_LINES = [
  { text: 'Another late shift.', duration: 4 },
  { text: 'You take the bus home through empty streets.', duration: 4.5 },
  { text: 'From the window, you see your apartment building.', duration: 4 },
  { text: 'There\'s a figure.\nStanding in the apartment across the street.', duration: 5.5 },
  { text: 'It looks like you.', duration: 4 },
  { text: '', duration: 2 },
];

let introTimer = 0;
let introLineIndex = 0;
let introLineTimer = 0;
let introCamStart = new THREE.Vector3();
let introCamEnd = new THREE.Vector3();
let introComplete = false;
let introTransitionQueued = false;

function startIntro() {
  state = GameState.INTRO;
  introTimer = 0;
  introLineIndex = 0;
  introLineTimer = 0;
  introComplete = false;
  introTransitionQueued = false;
  introCamStart.set(0, 1.6, 5);
  introCamEnd.set(0, 1.6, 0.5);
  camera.position.copy(introCamStart);
  camera.lookAt(0, 1.6, -2);
  document.getElementById('crosshair').classList.add('hidden');
  document.getElementById('interact-prompt').classList.add('hidden');
  document.getElementById('puzzle-hint').classList.add('hidden');
  const overlay = document.getElementById('narrative-overlay');
  overlay.classList.remove('hidden');
  overlay.classList.remove('fade-out');
  document.getElementById('narrative-text').textContent = '';
  document.getElementById('narrative-text').classList.remove('visible');
  if (!audio.initialized) audio.init();
  else audio.resume();
  showNextIntroLine();
}

function showNextIntroLine() {
  if (introLineIndex >= INTRO_LINES.length) { introComplete = true; return; }
  const line = INTRO_LINES[introLineIndex];
  const textEl = document.getElementById('narrative-text');
  textEl.textContent = line.text;
  textEl.classList.toggle('visible', line.text.length > 0);
  introLineTimer = 0;
}

function updateIntro(delta) {
  if (introTransitionQueued) return; // prevent stacked setTimeout
  introTimer += delta;
  introLineTimer += delta;
  const panDuration = INTRO_LINES.slice(0, -1).reduce((s, l) => s + l.duration, 0);
  const panT = Math.min(introTimer / panDuration, 1);
  const ease = panT < 0.5 ? 2 * panT * panT : 1 - Math.pow(-2 * panT + 2, 2) / 2;
  camera.position.lerpVectors(introCamStart, introCamEnd, ease);
  camera.lookAt(0, 1.6, -2);
  const currentLine = INTRO_LINES[introLineIndex];
  if (currentLine && introLineTimer > currentLine.duration) { introLineIndex++; showNextIntroLine(); }
  if (introComplete && !introTransitionQueued) {
    introTransitionQueued = true;
    document.getElementById('narrative-overlay').classList.add('fade-out');
    setTimeout(() => { transitionTo(GameState.PLAYING); }, 1200);
  }
}

// =============================================
// STATE TRANSITIONS
// =============================================
function transitionTo(newState) {
  if (newState === state) return; // guard against same-state re-entry
  switch (state) {
    case GameState.TITLE: {
      const b = document.getElementById('blocker');
      b.classList.add('fade-out');
      setTimeout(() => { b.classList.add('hidden'); b.classList.remove('fade-out'); }, 1600);
      break;
    }
    case GameState.PLAYING:
      controls.unlock();
      document.getElementById('blocker').classList.remove('hidden');
      break;
    case GameState.CLIMAX:
      // Don't unlock controls — game is ending, avoid title screen flash
      break;
  }
  state = newState;
  switch (newState) {
    case GameState.INTRO:
      startIntro();
      break;
    case GameState.PLAYING:
      document.getElementById('blocker').classList.add('hidden');
      document.getElementById('narrative-overlay').classList.add('hidden');
      document.getElementById('crosshair').classList.remove('hidden');
      document.getElementById('interact-prompt').classList.remove('hidden');
      document.getElementById('puzzle-hint').classList.remove('hidden');
      controls.lock();
      if (audio.initialized) audio.resume();
      horror.initialized = true;
      break;
    case GameState.CLIMAX:
      document.getElementById('blocker').classList.add('hidden');
      break;
    case GameState.ENDING:
      document.getElementById('game-over').classList.add('visible');
      setTimeout(() => {
        const go = document.getElementById('game-over');
        go.style.cursor = 'pointer';
        go.addEventListener('click', () => location.reload(), { once: true });
      }, 3000);
      break;
  }
}

// =============================================
// UI EVENTS
// =============================================
document.getElementById('blocker').addEventListener('click', () => {
  if (state === GameState.TITLE) transitionTo(GameState.INTRO);
});

controls.onUnlock(() => {
  // Only show pause UI during active gameplay
  if (state === GameState.PLAYING) {
    document.getElementById('blocker').classList.remove('hidden');
    document.getElementById('crosshair').classList.add('hidden');
    interaction.setEnabled(false);
  }
  audio.suspend();
});

controls.onLock(() => {
  if (state !== GameState.PLAYING && state !== GameState.CLIMAX) return;
  document.getElementById('blocker').classList.add('hidden');
  document.getElementById('crosshair').classList.remove('hidden');
  audio.resume();
  interaction.setEnabled(true);
});

// =============================================
// GAME LOOP
// =============================================
let prevTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = Math.min((now - prevTime) / 1000, 0.1);
  prevTime = now;

  switch (state) {
    case GameState.TITLE:
      break;
    case GameState.INTRO:
      updateIntro(delta);
      break;
    case GameState.PLAYING:
      controls.update(delta);
      interaction.update();
      puzzle.update(delta);
      horror.update(delta);
      if (!audio.suspended) audio.setStage(puzzle.getStage());
      audio.update();
      horror.notifyStage(puzzle.getStage());
      break;
    case GameState.CLIMAX:
      controls.update(delta);
      horror.update(delta);
      audio.setStage(puzzle.getStage());
      audio.update();
      puzzle.update(delta);
      interaction.update();
      break;
    case GameState.ENDING:
      horror.update(delta);
      audio.update();
      break;
  }

  if (quadMaterial) {
    quadMaterial.uniforms.uFlicker.value = horror.getFlickerValue();
    quadMaterial.uniforms.uDistortion.value = horror.getDistortionValue();
    quadMaterial.uniforms.uDesaturation.value = horror.getDesaturationValue();
  }

  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(quadScene, quadCamera);
}

animate();

window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); });
