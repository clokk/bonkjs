# Bonk Engine - AI Collaboration Context

## What This Is

A 2D game toolkit for AI collaboration. TypeScript-first. Bonk sandwiches the game — runtime tools below (Layer 1), dev tools above (Layer 3) — so Claude has maximum creative freedom in the middle (Layer 2).

**Core thesis:** The game code IS the scene. No JSON intermediary, no scene hierarchy. Claude decides the architecture per game.

## Project Structure

```
bonk-engine/
├── src/
│   ├── runtime/       # Game, Time, Scheduler, EventSystem, Transform
│   ├── render/        # Renderer, PixiRenderer, Sprite, AnimatedSprite, Camera
│   ├── physics/       # PhysicsWorld, MatterPhysicsWorld, CollisionLayers, RigidBody
│   ├── input/         # Input
│   ├── audio/         # AudioManager, AudioSource
│   ├── math/          # vec2
│   ├── ui/            # UIManager, UIElement, primitives, layout
│   ├── types.ts       # Shared types (Vector2, AxisConfig, TransformJson, etc.)
│   ├── index.ts       # Public API barrel export
│   └── main.ts        # Example game
└── docs/              # Architecture & API docs
```

## Conventions

### Naming
- TypeScript strict mode everywhere
- PascalCase for classes, camelCase for functions/variables
- `Vector2 = [number, number]` tuple convention throughout

### Code Style
- Prefer composition over inheritance
- No forced base classes — games structure code however they want
- Use generators for async game logic (coroutines)

## How Games Use Bonk

```typescript
import { Game, Sprite, Camera, RigidBody, Input, Time, Transform } from 'bonk-engine';

const game = new Game({ physics: { gravity: [0, 980] } });
const canvas = await game.init({ width: 800, height: 600 });
document.getElementById('app')?.appendChild(canvas);

const player = new Transform({ position: [400, 300] });
const sprite = new Sprite(game.renderer, { width: 48, height: 64, color: 0x00ff00, transform: player });
const body = game.createBody(player, { type: 'dynamic', fixedRotation: true });
body.addCollider({ type: 'box', width: 48, height: 64 });

const camera = new Camera(game.renderer, { followSmoothing: 8 });
camera.follow(() => player.worldPosition);

game.onFixedUpdate(() => { body.syncFromPhysics(); });
game.onUpdate(() => {
  const h = Input.getAxisRaw('horizontal');
  body.velocity = [h * 300, body.velocity[1]];
  sprite.sync();
});
game.onLateUpdate(() => { camera.update(); });

game.start();
```

No scene format. No component hierarchy. Claude picks the right architecture per game.

## Architecture — The Sandwich Model

```
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Bonk Overlay (game-agnostic dev tools)        │
│  Debug wireframes, performance overlays, state          │
│  inspection, build targets, hot reload                  │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Game Code (Claude-authored, game-specific)    │
│  Whatever architecture THIS game needs — turn systems,  │
│  terrain, inventory, AI, state machines, ECS, nothing   │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Bonk Runtime (game-agnostic tools)            │
│  Rendering, physics, input, audio, math, camera, UI     │
└─────────────────────────────────────────────────────────┘
```

Layer 1 is the set of importable modules listed below. Layer 2 is whatever Claude decides. Layer 3 is the reusable overlay — it subscribes to Layer 1's lifecycle events and renders debug info over whatever the game built. Same overlay works on every Bonk game.

## Key Runtime Capabilities (Layer 1)

### Rendering
- Sprites, animated sprites
- Camera follow/zoom/bounds/deadzone
- Z-index ordering
- PixiJS abstracted — games don't touch Pixi directly

### Physics
- Matter.js rigid body (dynamic, static, kinematic)
- Collider shapes (box, circle, polygon)
- Collision layers (string names → bitmask filtering)
- Triggers (sensor bodies, onTrigger callbacks)
- Collision callbacks routed through Game class
- Raycasting with surface normals

### Input
- Named axes and buttons with configurable bindings
- Raw key/mouse access
- Smoothed and raw axis variants

### Audio
- Howler.js: music, SFX, spatial audio
- Volume categories
- Browser autoplay policy handling

### Math
- `vec2` module: add, sub, normalize, dot, cross, lerp, rotate, distance, etc.

### Game Loop
- Fixed timestep physics (60Hz) with accumulator pattern
- Variable timestep rendering
- Time scaling
- Coroutine scheduler (generator-based)

## Bonk Overlay (Layer 3)

Layer 3 is always optional. Planned packages:

- `@bonk/devtools` — Debug wireframes, physics outlines, state inspector
- `@bonk/perf` — FPS counter, draw calls, body count, memory
- `@bonk/build` — Build targets: browser, Tauri (Steam), Capacitor (mobile)

Layer 3 never touches Layer 2. It subscribes to Layer 1's lifecycle events (body created, sprite added, collision fired) and renders debug info over whatever the game built. Add one line to `vite.config.ts` and debug tools light up. Remove it and nothing changes.

## Commands

```bash
npm run dev          # Hot-reload dev server (browser)
npm run build        # Production build
npm run typecheck    # Type check only
```

## Key Files

| File | Purpose |
|------|---------|
| `src/runtime/Game.ts` | Central game class — loop, physics, collision routing |
| `src/runtime/Transform.ts` | 2D positioning with hierarchy |
| `src/render/Sprite.ts` | Standalone sprite (sync from Transform) |
| `src/render/Camera.ts` | Camera follow/zoom/bounds |
| `src/physics/RigidBody.ts` | Physics body with collision callbacks |
| `src/input/Input.ts` | Input system (axes, buttons, keys) |
| `src/audio/AudioSource.ts` | Per-source audio playback |
| `src/types.ts` | Shared types |
| `docs/ARCHITECTURE.md` | Full architecture |
