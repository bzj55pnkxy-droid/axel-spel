import * as THREE from 'three';

function applySettings(texture) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addNoise(ctx, w, h, amount = 8) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const offset = (Math.random() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + offset));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + offset));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + offset));
  }
  ctx.putImageData(imageData, 0, 0);
}

function makeCanvas(size = 32) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d') };
}

function makeWallpaper() {
  const { canvas, ctx } = makeCanvas();
  // Muted green/beige base
  ctx.fillStyle = '#7a8a6a';
  ctx.fillRect(0, 0, 32, 32);

  // Subtle vertical stripes every 4px
  for (let x = 0; x < 32; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? '#6e7e5e' : '#828e72';
    ctx.fillRect(x, 0, 2, 32);
  }

  // Faint horizontal accent lines
  ctx.fillStyle = '#747f65';
  ctx.fillRect(0, 15, 32, 1);
  ctx.fillRect(0, 31, 32, 1);

  addNoise(ctx, 32, 32);
  return applySettings(new THREE.CanvasTexture(canvas));
}

function makeWallpaperDark() {
  const { canvas, ctx } = makeCanvas();
  // Darker muted green
  ctx.fillStyle = '#4a5a42';
  ctx.fillRect(0, 0, 32, 32);

  for (let x = 0; x < 32; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? '#404f38' : '#52604a';
    ctx.fillRect(x, 0, 2, 32);
  }

  ctx.fillStyle = '#465540';
  ctx.fillRect(0, 15, 32, 1);
  ctx.fillRect(0, 31, 32, 1);

  addNoise(ctx, 32, 32);
  return applySettings(new THREE.CanvasTexture(canvas));
}

function makeWoodFloor() {
  const { canvas, ctx } = makeCanvas();
  // Dark wood base
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(0, 0, 32, 32);

  // Horizontal planks with slight color variation
  const plankColors = ['#523828', '#604838', '#4e3425', '#583c2c'];
  for (let y = 0; y < 32; y += 8) {
    ctx.fillStyle = plankColors[(y / 8) | 0];
    ctx.fillRect(0, y, 32, 7);
    // Plank gap
    ctx.fillStyle = '#2a1810';
    ctx.fillRect(0, y + 7, 32, 1);
  }

  // Stagger lines to simulate plank offsets
  ctx.fillStyle = '#2a1810';
  ctx.fillRect(16, 0, 1, 8);
  ctx.fillRect(8, 8, 1, 8);
  ctx.fillRect(24, 16, 1, 8);
  ctx.fillRect(12, 24, 1, 8);

  addNoise(ctx, 32, 32);
  return applySettings(new THREE.CanvasTexture(canvas));
}

function makeTileFloor() {
  const { canvas, ctx } = makeCanvas();
  // Linoleum base
  ctx.fillStyle = '#8a8070';
  ctx.fillRect(0, 0, 32, 32);

  // Checkerboard-ish tiles
  for (let y = 0; y < 32; y += 16) {
    for (let x = 0; x < 32; x += 16) {
      const dark = ((x + y) / 16) % 2 === 0;
      ctx.fillStyle = dark ? '#706858' : '#968c7c';
      ctx.fillRect(x, y, 16, 16);
    }
  }

  // Grout lines
  ctx.fillStyle = '#605848';
  ctx.fillRect(0, 15, 32, 1);
  ctx.fillRect(0, 31, 32, 1);
  ctx.fillRect(15, 0, 1, 32);
  ctx.fillRect(31, 0, 1, 32);

  addNoise(ctx, 32, 32);
  return applySettings(new THREE.CanvasTexture(canvas));
}

function makeCeiling() {
  const { canvas, ctx } = makeCanvas();
  // Off-white plaster
  ctx.fillStyle = '#c8c0b8';
  ctx.fillRect(0, 0, 32, 32);

  // Minimal speckle
  for (let i = 0; i < 20; i++) {
    const x = (Math.random() * 32) | 0;
    const y = (Math.random() * 32) | 0;
    ctx.fillStyle = Math.random() > 0.5 ? '#bfb8b0' : '#d0c8c0';
    ctx.fillRect(x, y, 1, 1);
  }

  addNoise(ctx, 32, 32, 5);
  return applySettings(new THREE.CanvasTexture(canvas));
}

function makeDoorFrame() {
  const { canvas, ctx } = makeCanvas();
  // Dark brown wood
  ctx.fillStyle = '#3a2818';
  ctx.fillRect(0, 0, 32, 32);

  // Vertical wood grain
  for (let x = 0; x < 32; x += 3) {
    ctx.fillStyle = x % 6 === 0 ? '#321e12' : '#42301e';
    ctx.fillRect(x, 0, 2, 32);
  }

  addNoise(ctx, 32, 32, 6);
  return applySettings(new THREE.CanvasTexture(canvas));
}

function makeFurniture() {
  const { canvas, ctx } = makeCanvas();
  // Generic dark wood
  ctx.fillStyle = '#4a3828';
  ctx.fillRect(0, 0, 32, 32);

  // Horizontal grain
  for (let y = 0; y < 32; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? '#422e1e' : '#524030';
    ctx.fillRect(0, y, 32, 3);
  }

  addNoise(ctx, 32, 32, 6);
  return applySettings(new THREE.CanvasTexture(canvas));
}

function makeWindowNight() {
  const { canvas, ctx } = makeCanvas();
  // Dark blue/black night sky
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, 32, 32);

  // Slight gradient — lighter at top
  for (let y = 0; y < 16; y++) {
    const v = Math.floor(10 + (16 - y) * 0.8);
    ctx.fillStyle = `rgb(${v}, ${v + 2}, ${v + 8})`;
    ctx.fillRect(0, y, 32, 1);
  }

  addNoise(ctx, 32, 32, 4);
  return applySettings(new THREE.CanvasTexture(canvas));
}

function makeBrickExterior() {
  const { canvas, ctx } = makeCanvas();
  ctx.fillStyle = '#4a3028';
  ctx.fillRect(0, 0, 32, 32);

  // Horizontal mortar lines every 4px, alternate rows offset for stagger
  for (let row = 0; row < 8; row++) {
    const y = row * 4;
    // Brick color variation per row
    const colors = ['#4a3028', '#4e342c', '#462c24', '#503630'];
    ctx.fillStyle = colors[row % colors.length];
    ctx.fillRect(0, y, 32, 3);
    // Mortar line
    ctx.fillStyle = '#2a1a12';
    ctx.fillRect(0, y + 3, 32, 1);
    // Vertical mortar — stagger on alternate rows
    const offset = (row % 2) * 8;
    for (let x = offset; x < 32; x += 16) {
      ctx.fillStyle = '#2a1a12';
      ctx.fillRect(x, y, 1, 3);
    }
  }

  addNoise(ctx, 32, 32, 6);
  return applySettings(new THREE.CanvasTexture(canvas));
}

function makeAsphalt() {
  const { canvas, ctx } = makeCanvas();
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, 32, 32);

  // Random dark speckles for aggregate
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() * 32) | 0;
    const y = (Math.random() * 32) | 0;
    ctx.fillStyle = Math.random() > 0.5 ? '#222222' : '#333333';
    ctx.fillRect(x, y, 1, 1);
  }

  // A few lighter patches
  for (let i = 0; i < 5; i++) {
    const x = (Math.random() * 30) | 0;
    const y = (Math.random() * 30) | 0;
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, 2, 2);
  }

  addNoise(ctx, 32, 32, 10);
  return applySettings(new THREE.CanvasTexture(canvas));
}

function makeLitWindow() {
  const { canvas, ctx } = makeCanvas();
  // Darker frame edge
  ctx.fillStyle = '#aa7733';
  ctx.fillRect(0, 0, 32, 32);
  // Warm yellow base
  ctx.fillStyle = '#cc9944';
  ctx.fillRect(2, 2, 28, 28);
  // Lighter center glow
  ctx.fillStyle = '#ddaa55';
  ctx.fillRect(6, 6, 20, 20);

  addNoise(ctx, 32, 32, 4);
  return applySettings(new THREE.CanvasTexture(canvas));
}

function makeDarkSky() {
  const { canvas, ctx } = makeCanvas();
  // Gradient from bottom to top
  for (let y = 0; y < 32; y++) {
    const t = y / 31;
    const r = Math.floor(8 - t * 4);
    const g = Math.floor(10 - t * 4);
    const b = Math.floor(20 - t * 10);
    ctx.fillStyle = `rgb(${Math.max(4, r)}, ${Math.max(6, g)}, ${Math.max(10, b)})`;
    ctx.fillRect(0, y, 32, 1);
  }

  // A few barely-visible stars
  for (let i = 0; i < 4; i++) {
    const x = (Math.random() * 32) | 0;
    const y = (Math.random() * 16) | 0; // upper half
    ctx.fillStyle = '#181820';
    ctx.fillRect(x, y, 1, 1);
  }

  addNoise(ctx, 32, 32, 3);
  return applySettings(new THREE.CanvasTexture(canvas));
}

export function createTextures() {
  return {
    wallpaper: makeWallpaper(),
    wallpaperDark: makeWallpaperDark(),
    woodFloor: makeWoodFloor(),
    tileFloor: makeTileFloor(),
    ceiling: makeCeiling(),
    doorFrame: makeDoorFrame(),
    furniture: makeFurniture(),
    windowNight: makeWindowNight(),
    brickExterior: makeBrickExterior(),
    asphalt: makeAsphalt(),
    litWindow: makeLitWindow(),
    darkSky: makeDarkSky(),
  };
}
