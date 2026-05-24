# Dubbelgångare - Development Plan

## Context
A first-person PS1-style horror game built with Three.js. A university student has been seeing his doppelganger in public. After a late work shift, he spots a figure in the apartment across the street. The game begins as he enters his apartment. The player explores three rooms (hallway, living room, bedroom), solves environmental puzzles based on a mirroring mechanic (the doppelganger echoes your actions), and faces one final encounter.

**Tech**: Three.js (CDN), vanilla JS, no build tools, static files
**Style**: PS1-era retro (low-res, vertex wobble, fog, affine textures)
**Audio**: Ambient only via Web Audio API
**Scope**: ~5 min demo

---

## Development Phases

### Phase 1: Project Setup & Engine Foundation
- HTML/CSS boilerplate, Three.js via CDN
- Basic Three.js scene, camera, renderer
- Low-resolution render target (320x240 upscaled)
- First-person controls (WASD movement + PointerLock mouselook)
- Simple test room (box) to validate everything works

### Phase 2: PS1 Visual Effects
- Custom vertex shader: vertex snapping (low-precision grid)
- Affine texture mapping (no perspective correction)
- Fog / short draw distance
- Color depth reduction / dithering
- Optional CRT scanline overlay

### Phase 3: World Building - The Apartment
- Room geometry: hallway, living room, bedroom
- Doors and doorways connecting rooms
- Wall/floor/ceiling textures (simple, tiling)
- Furniture and props (couch, CRT TV, bed, desk, coat rack, etc.)
- Early 2000s atmosphere (dim lighting, nighttime, window with street view)

### Phase 4: Interaction System
- Raycasting from camera center for object detection
- Crosshair UI element
- E key to interact with targeted objects
- Visual feedback (object highlight or prompt text)
- Interactive objects: light switches, doors, items on tables

### Phase 5: Puzzle System - The Mirroring
- Action tracking: record what the player interacts with
- Mirrored responses: toggling a light causes another to flicker, opening a door causes another to close
- Progression logic: player must use the mirroring pattern to unlock the bedroom
- Subtle teaching: early interactions hint at the mechanic before it's required

### Phase 6: Audio System
- Web Audio API setup with procedural ambient sounds
- Environmental audio: fridge hum, distant traffic, rain on windows, floor creaks
- Spatial audio tied to objects/locations
- Dynamic tension: sounds evolve as player progresses (new sounds appear, existing ones shift)

### Phase 7: Horror Events & Scripting
- Event trigger system (location-based, action-based, time-based)
- Subtle changes: objects shift when not looking, shadows move
- Window silhouette: figure occasionally appears in the apartment across the street
- The final encounter (scripted surprise sequence at the end)
- Screen effects during horror moments (flicker, distortion)

### Phase 8: Game Flow & Polish
- Opening sequence (arriving at apartment, seeing the figure)
- Title screen / start prompt
- Game state machine (intro -> exploration -> puzzle -> climax -> end)
- End screen / credits
- Playtesting and pacing adjustments
