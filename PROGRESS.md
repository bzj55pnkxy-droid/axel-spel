# Dubbelgångare - Progress

## Completed

### Phase 1: Project Setup & Engine Foundation ✅
- `index.html`, `css/style.css`, `js/main.js`, `js/renderer.js`, `js/controls.js`

### Phase 2: PS1 Visual Effects ✅
- `js/ps1Material.js` — Custom shader: vertex snapping, affine UVs, Gouraud shading, fog
- `js/renderer.js` — Bayer dithering, color quantization, CRT scanlines, vignette

### Phase 3: World Building - The Apartment ✅
- `js/textures.js` — 12 procedural textures
- `js/apartment.js` — Hallway, Living Room, Bedroom with furniture
- `js/outdoor.js` — Exterior view from window

### Phase 4: Interaction System ✅
- `js/interaction.js` — Raycasting, wall occlusion, E-key, dynamic prompts, highlights
- 9 interactive objects in `js/main.js`; crosshair + prompt UI

### Phase 5: Puzzle System - The Mirroring ✅
- `js/puzzle.js` — Action tracker, 4-stage progression, mirror rules, hints
- 9 mirror rules, anti-spam door lock, non-stacking effects

### Phase 6: Audio System ✅
- `js/audio.js` — Full procedural audio (drone, room tone, 3 spatial sources, tension, one-shots)

### Phase 7: Horror Events & Scripting ✅
- `js/horror.js` — Event triggers, window silhouette, subtle shifts, final encounter

### Phase 8: Game Flow & Polish ✅
- State machine (TITLE → INTRO → PLAYING → CLIMAX → ENDING) integrated into `js/main.js`
- Title screen, opening narrative sequence, end credits, click-to-restart

## Bug Fixes (2026-05-24)
1. **Audio destroy()**: Added cleanup for dissonant layer LFO oscillators (`lfo`, `lfoGain`) which were never disconnected, causing resource leaks.
2. **Audio one-shot nodes**: Added `setTimeout` cleanup in `playCreak()`, `playDoorSlam()`, `playLightFlicker()` to disconnect audio nodes after playback completes, preventing memory/CPU leaks from stale nodes.
3. **cancelAllEffects()**: Added light intensity restoration when clearing flicker timers, preventing lights from getting stuck at reduced brightness if flicker is cancelled mid-cycle.

## Known Issues
- None currently

## All Phases Complete ✅
Phases 1-8 are fully implemented and verified.
