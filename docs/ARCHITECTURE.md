# bonkjs Architecture

## Overview

bonkjs is a lean PixiJS game toolkit. It provides the game loop, input, camera, math, and devtools that every 2D game needs — nothing more.

```
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Dev Tools (optional, dev-only)                 │
│  Tweaker overlay for live-tuning constants               │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Game Code (your code, game-specific)           │
│  Whatever architecture THIS game needs                   │
├─────────────────────────────────────────────────────────┤
│  Layer 1: bonkjs (game-agnostic toolkit)                 │
│  Game loop, input, camera, math                          │
└─────────────────────────────────────────────────────────┘
```

## Modules

A game imports what it needs:

```typescript
import { Game, Camera, Time, Input, Keys, vec2, Tweaker } from 'bonkjs';
```

| Module | File | Dependency | Purpose |
|--------|------|------------|---------|
| Game | `Game.ts` | Time, Input, pixi.js | PixiJS bootstrap + game loop |
| Time | `Time.ts` | none | Delta time, elapsed time, time scaling |
| Camera | `Camera.ts` | Time, pixi.js | 2D camera on a PixiJS Container |
| Particles | `Particles.ts` | pixi.js | Pooled 2D particles (NORMAL + ADD channels) — see [PARTICLES.md](./PARTICLES.md) |
| Input | `Input.ts` | Time | Keyboard, mouse, axes, buttons |
| Keys | `Keys.ts` | none | Typed KeyboardEvent.code constants |
| vec2 | `vec2.ts` | none | Functional vector math |
| Rng | `Rng.ts` | none | Seedable PRNG (mulberry32) — see [RNG.md](./RNG.md) |
| Tweaker | `devtools/` | none | Runtime constant editor |

## Game Loop

The `Game` class creates a PixiJS Application and runs a dual-timestep loop:

```
┌─────────────────────────────────────────┐
│  requestAnimationFrame                   │
│                                          │
│  1. Time.update(dt)                      │
│                                          │
│  2. Fixed timestep (accumulator)         │
│     while (acc >= 1/60):                 │
│       onFixedUpdate callbacks            │
│       acc -= 1/60                        │
│                                          │
│  3. onUpdate callbacks                   │
│                                          │
│  4. onLateUpdate callbacks               │
│                                          │
│  5. Input.update() (clear per-frame)     │
│                                          │
│  PixiJS renders automatically via ticker │
└─────────────────────────────────────────┘
```

- **Fixed update** (60Hz) — Deterministic gameplay. Same result regardless of display refresh rate. Use for physics, game state, AI.
- **Variable update** (native Hz) — Visuals at whatever the display supports. Use for rendering, particles, UI, interpolation.
- **Late update** — Runs after variable update. Use for camera follow (needs final positions).
- **PixiJS rendering** — Handled automatically by PixiJS Application's internal ticker. No manual `render()` call needed.

#### Time scale, freeze & frame-step

The fixed accumulator advances by `Time.deltaTime` (= clamped frame dt × **`Time.timeScale`**), so `Time.timeScale` scales the **whole simulation**, not just `Time.deltaTime`:

- **`Time.timeScale = 1`** — normal.
- **`Time.timeScale = 0.25`** — slow-mo (the fixed sim runs at quarter speed; great for inspecting fast movement / VFX).
- **`Time.timeScale = 0`** — **freeze**: the accumulator never crosses `1/60`, so `onFixedUpdate` stops firing and the sim holds still — but `onUpdate` / `onLateUpdate` keep running every frame, so the frozen frame still renders and input/dev tools stay live (ideal for inspecting or screenshotting a transient state). This is distinct from **`pause()`**, which halts the *entire* loop (render included).
- **`game.step(n = 1)`** — advance exactly `n` fixed ticks on the next frame, regardless of `timeScale`. Pair with `Time.timeScale = 0` for **frame-by-frame** debugging (freeze, then step one tick at a time and watch each frame render).

### Initialization

`Game.init()` creates the PixiJS Application and returns raw objects:

```typescript
const game = new Game();
const { canvas, app, world, ui } = await game.init({
  width: 1920,
  height: 1080,
  backgroundColor: 0x0a0a15,
  preference: 'webgl',
  scaleMode: 'fit',        // letterbox-contain to the window, render at native pixels
});
```

- `canvas` — The `<canvas>` element to append to the DOM
- `app` — The raw PixiJS `Application` instance
- `world` — A PixiJS `Container` for game-world objects (the camera operates on this).
- `ui` — A PixiJS `Container` for screen-space UI. Not affected by camera.

> **Layering:** both containers have `sortableChildren` enabled, so children draw by their **`.zIndex`**, *not* add order. Default `zIndex` is `0`; ties break by insertion order. Set a child's `.zIndex` to place it (e.g. `shadow 9 < player 10 < weapon 10.5 < reticle 11`). Adding a child later does **not** put it on top unless its `zIndex` is higher.

#### Resolution / `scaleMode`

`width`/`height` are the **logical (design)** coordinate space — the units the stage, camera, and UI math
work in. How that space maps onto the physical display is controlled by `scaleMode`:

- **`'fixed'`** (default) — the canvas is created once at `width × height × resolution` and never resized.
  The host page handles any CSS scaling (e.g. `object-fit: contain`). Pre-0.5.5 behavior.
- **`'fit'`** — keeps the design size as a **constant** logical space (so a fixed-FOV game's camera and every
  hardcoded UI anchor stay valid), but letterbox-**contains** the canvas into `resizeTo` (default `window`)
  and sets the renderer **resolution** to the display's true physical pixel density. Result: crisp on a 4K
  monitor (`devicePixelRatio === 1` no longer caps the backing store), native-sharp on a Steam Deck (16:10
  letterboxes against the page background), and re-fits automatically on window resize **and**
  `devicePixelRatio` change (monitor swap / OS zoom). Optional `maxResolution` caps the backing-store density
  for perf on very large HiDPI displays.

```typescript
game.onResize(({ cssWidth, cssHeight, resolution }) => {
  // Fires after every 'fit' pass — e.g. keep a manual device-pixel snap in sync with `resolution`.
});
```

`'fit'` sets `autoDensity` off and manages the canvas's CSS `width`/`height` itself, so pointer mapping that
normalizes through `canvas.getBoundingClientRect()` stays correct (the element box equals the rendered area).

## Camera

Camera operates directly on a PixiJS Container by setting `scale` and `position`:

```typescript
// Camera.update() applies this every frame:
container.scale.set(zoom, zoom);
container.position.set(
  viewportWidth / 2 - cameraX * zoom,
  viewportHeight / 2 - cameraY * zoom,
);
```

> For the fixed-sim / variable-render model (above), use the split `tick()` (smooth at the fixed sim rate, in
> `onFixedUpdate`) + `apply(shakeX?, shakeY?)` (write at render rate, in `onUpdate`), with `pixelSnap` +
> `resolution` for crisp static geometry under shake. `update()` remains the single-call convenience. See
> [CAMERA.md](./CAMERA.md).

The camera needs `viewport` dimensions in its config for bounds clamping:

```typescript
const camera = new Camera(worldContainer, {
  viewport: { width: 1920, height: 1080 },
  zoom: 0.75,
  followSmoothing: 5,
  bounds: { minX: 0, minY: 0, maxX: worldWidth, maxY: worldHeight },
});
```

## Input

Static class with three access layers:

1. **Raw keys** — `Input.getKey(code)`, `getKeyDown(code)`, `getKeyUp(code)`
2. **Named buttons** — `Input.getButton(name)`, configurable bindings
3. **Smoothed axes** — `Input.getAxis(name)`, returns -1 to 1 with interpolation

`Input.update()` is called automatically by the Game loop at the end of each frame to clear per-frame edge triggers.

## Project Structure

```
bonkjs/
├── src/
│   ├── Game.ts        # PixiJS bootstrap + fixed/variable timestep loop
│   ├── Time.ts        # Delta time, elapsed time, time scaling
│   ├── Camera.ts      # 2D camera (operates on PixiJS Container)
│   ├── Particles.ts   # Pooled 2D particle system (NORMAL + ADD blend channels)
│   ├── Input.ts       # Keyboard, mouse, axes, buttons
│   ├── Keys.ts        # Typed KeyboardEvent.code constants
│   ├── vec2.ts        # Functional vector math
│   ├── Rng.ts         # Seedable PRNG (mulberry32) — reproducible procedural gen
│   ├── types.ts       # Vector2, Color, input config types
│   ├── index.ts       # Barrel export
│   └── devtools/      # Tweaker runtime constant editor
│       ├── Tweaker.ts
│       ├── TweakerOverlay.ts
│       ├── tweaker-styles.ts
│       ├── types.ts
│       └── index.ts
├── docs/              # Documentation
├── CLAUDE.md          # AI collaboration context
└── README.md          # Package overview
```
