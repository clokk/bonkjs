# bonkjs

A lean PixiJS game toolkit. Game loop, input, camera, math, and devtools — nothing else.

bonkjs gives you the 5% of engine plumbing every 2D game needs, then gets out of the way. You write game code directly against PixiJS. No scene graph, no entity system, no opinions about how your game should work.

## Install

```bash
npm install bonkjs pixi.js
```

## Quick Start

```typescript
import { Game, Camera, Input, Time } from 'bonkjs';

const game = new Game();
const { canvas, app, world, ui } = await game.init({
  width: 1280,
  height: 720,
  backgroundColor: 0x1a1a2e,
  // scaleMode: 'fit',  // letterbox-contain to the window + render at native pixels (crisp 4K → Steam Deck).
  //                    // Keeps width/height as a constant logical space; see docs/ARCHITECTURE.md.
});
document.getElementById('app')!.appendChild(canvas);

// You get raw PixiJS objects — build whatever you want
const camera = new Camera(world, {
  viewport: { width: 1280, height: 720 },
  zoom: 1,
  followSmoothing: 5,
});

game.onFixedUpdate(() => {
  // Deterministic gameplay at 60Hz
  if (Input.getKey('ArrowRight')) player.x += 5;
});

game.onUpdate(() => {
  // Visuals at native refresh rate
  sprite.position.set(player.x, player.y);
});

game.onLateUpdate(() => {
  camera.update();
});

game.start();
```

## What's Included

| Module | What it does |
|--------|-------------|
| **Game** | PixiJS bootstrap + fixed/variable timestep loop. Returns `{ canvas, app, world, ui }` — raw PixiJS objects, no abstraction. |
| **Camera** | 2D camera with smooth follow, screen shake, bounds clamping, deadzone. Operates directly on a PixiJS Container. |
| **Input** | Unity-style input: named axes/buttons, raw key/mouse access, smoothed axis values. |
| **Keys** | Typed `KeyboardEvent.code` constants. `Keys.Space` instead of `'Space'`. |
| **Time** | Delta time, elapsed time, time scaling, FPS tracking. |
| **vec2** | Functional vector math. All operations return new tuples, never mutate. |
| **Tweaker** | Runtime constant editor — live-tweak numbers, colors, booleans with a hotkey overlay. Saves to localStorage. Zero overhead when hidden. |

## What's Not Included

Physics, audio, sprites, UI, scene graphs, entity systems, state machines, networking.

You don't need an engine for those. Use PixiJS directly for rendering. Use whatever physics/audio library fits your game. Structure your code however makes sense.

## Philosophy

Most game engines give you too much. You fight the framework instead of building your game. bonkjs takes the opposite approach:

- **PixiJS is the renderer.** No abstraction layer. `app`, `world`, and `ui` are real PixiJS objects.
- **Your code is the architecture.** No forced patterns. Build an ECS, a state machine, or just a big loop — whatever your game needs.
- **Toolkit, not framework.** Import what you use. Everything is a standalone module with no interdependencies (except Time, which Input and Camera read from).

## Game Loop

bonkjs runs two loops:

- **Fixed update** (60Hz) — Deterministic gameplay. Physics, movement, game logic. Same result regardless of display refresh rate.
- **Variable update** (native Hz) — Visuals, particles, UI. Smooth at 60Hz, 120Hz, 144Hz, whatever.

```typescript
game.onFixedUpdate(() => {
  // Runs at exactly 60Hz with accumulator pattern
  // Use for: physics, collision, game state, AI
});

game.onUpdate(() => {
  // Runs every frame at display refresh rate
  // Time.deltaTime gives seconds since last frame
  // Use for: rendering, particles, interpolation, UI
});

game.onLateUpdate(() => {
  // Runs after onUpdate, every frame
  // Use for: camera follow (needs final positions)
});
```

## Camera

Operates directly on a PixiJS Container. Call `camera.update()` in `onLateUpdate`.

```typescript
const camera = new Camera(worldContainer, {
  viewport: { width: 1920, height: 1080 },
  zoom: 0.75,
  followSmoothing: 5,
  bounds: { minX: 0, minY: 0, maxX: 5000, maxY: 2000 },
});

camera.follow(() => [player.x, player.y]);
camera.shake(15, { decay: 0.85 });
camera.snapTo(500, 300);
```

## Input

Three layers: raw keys, named buttons, smoothed axes.

```typescript
import { Input, Keys } from 'bonkjs';

// Raw keys (KeyboardEvent.code)
if (Input.getKey(Keys.Space)) jump();
if (Input.getKeyDown(Keys.Escape)) pause();

// Named buttons (configurable bindings)
if (Input.getButtonDown('fire')) shoot();

// Smoothed axes (-1 to 1)
const h = Input.getAxis('horizontal');
const v = Input.getAxisRaw('vertical');
```

## Tweaker (Dev Tools)

Live-edit constants at runtime. Press backtick to toggle.

```typescript
import { Tweaker } from 'bonkjs';

const PHYSICS = { GRAVITY: 980, JUMP_FORCE: 500, FRICTION: 0.8 };

if (import.meta.env.DEV) {
  Tweaker.init();
  Tweaker.register('Physics', PHYSICS);
}

// Now PHYSICS.GRAVITY updates in real-time as you drag the slider
```

## License

MIT
