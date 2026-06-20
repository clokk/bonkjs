# bonkjs — AI Collaboration Context

## What This Is

A PixiJS game toolkit for AI collaboration. TypeScript-first. Provides the core runtime tools (game loop, input, camera, math, devtools) and gets out of the way — Claude picks the architecture per game.

**Core thesis:** The game code IS the scene. No JSON intermediary, no scene hierarchy. bonkjs is a PixiJS toolkit, not a renderer-agnostic engine.

## Project Structure

```
bonkjs/
├── src/
│   ├── Game.ts        # PixiJS bootstrap + fixed/variable timestep loop
│   ├── Time.ts        # Delta time, elapsed time, time scaling
│   ├── Camera.ts      # 2D camera with smoothing, shake, deadzone (operates on PixiJS Container)
│   ├── Input.ts       # Unity-style input (axes, buttons, raw keys, mouse)
│   ├── Keys.ts        # Typed KeyboardEvent.code constants
│   ├── vec2.ts        # Functional vector2 math (immutable tuples)
│   ├── types.ts       # Vector2, Color, input config types
│   ├── index.ts       # Barrel export
│   └── devtools/      # Tweaker runtime constant editor
│       ├── Tweaker.ts
│       ├── TweakerOverlay.ts
│       ├── tweaker-styles.ts
│       ├── types.ts
│       └── index.ts
└── docs/
```

## Conventions

### Naming
- TypeScript strict mode everywhere
- PascalCase for classes, camelCase for functions/variables
- `Vector2 = [number, number]` tuple convention throughout

### Code Style
- Prefer composition over inheritance
- No forced base classes — games structure code however they want
- PixiJS used directly — no abstraction layer

## How Games Use bonkjs

```typescript
import { Game, Camera, Time, Input } from 'bonkjs';

const game = new Game();
const { canvas, app, world, ui } = await game.init({
  width: 1920, height: 1080, backgroundColor: 0x000000,
});
document.getElementById('app')!.appendChild(canvas);

const camera = new Camera(world, {
  viewport: { width: 1920, height: 1080 },
  zoom: 0.75,
  followSmoothing: 5,
});

game.onFixedUpdate(() => { /* deterministic gameplay at 1/60s */ });
game.onUpdate(() => { /* visuals at native refresh rate */ });
game.onLateUpdate(() => { camera.update(); });

game.start();
```

Games access raw PixiJS objects (Application, Container, Renderer) directly. No escape hatches needed.

## Key Runtime Capabilities

### Game Loop (Game.ts)
- Creates PixiJS Application, returns `{ canvas, app, world, ui }`
- Fixed timestep (60Hz) with accumulator pattern for deterministic gameplay
- Variable timestep rendering at native refresh rate
- Max delta time clamp (0.25s) to prevent spiral of death
- `onFixedUpdate()`, `onUpdate()`, `onLateUpdate()` callbacks

### Camera (Camera.ts)
- Operates directly on a PixiJS Container (no renderer abstraction)
- Function-based follow target: `camera.follow(() => [x, y])`
- Screen shake with intensity decay
- Bounds clamping, deadzone, zoom
- Config requires `viewport: { width, height }` for bounds calculation

### Input (Input.ts)
- Named axes and buttons with configurable bindings
- Raw key/mouse access via KeyboardEvent.code
- Smoothed and raw axis variants

### Math (vec2.ts)
- Functional vector math — all operations return new tuples, never mutate

### Dev Tools (devtools/)
- Tweaker: live-edit constants at runtime, saves to localStorage
- Zero overhead when hidden

## PixiJS Gotchas

### autoDensity (default `scaleMode: 'fixed'`)

`Game.init()` passes `autoDensity: true` and `resolution: window.devicePixelRatio` to PixiJS **in the default `scaleMode: 'fixed'`**. Do not remove these there. Without `autoDensity`, PixiJS sets the canvas CSS dimensions to `width * devicePixelRatio` (e.g., 3840x2160 on Retina instead of 1920x1080). Game-side viewport scaling assumes the canvas CSS size matches the logical size — wrong CSS dimensions cause a blank/black screen.

**Exception — `scaleMode: 'fit'`** (v0.5.5+): this mode intentionally sets `autoDensity: false` and **owns the canvas CSS box itself** (`applyFit` writes `canvas.style.width/height` to the letterbox-contained size and sets `renderer.resolution` to the physical pixel density). That's the supported way to render at native resolution across displays (Steam Deck → 4K) — it does NOT cause the blank-screen issue above, because bonkjs sets the correct CSS size rather than leaving Pixi to. See ARCHITECTURE.md → "Resolution / `scaleMode`".

## Commands

```bash
npm run dev          # Hot-reload dev server (port 3000)
npm run build        # Library build (ESM bundle + declarations → dist/)
npm run build:watch  # Library build with file watching (for npm link workflow)
npm run typecheck    # Type check only
```

## Versioning & Publishing

Published to npm as [`bonkjs`](https://www.npmjs.com/package/bonkjs). Only peer dependency: `pixi.js`.

```bash
cd ~/bonkjs
npm run build && npm run typecheck
npm version patch|minor|major
npm publish --access public
git push origin main --tags
```

### After Publishing — Update Game Projects

```bash
cd ~/geometry-blast
npm update bonkjs
```

## Dual-Dev Workflow (npm link)

```bash
# Terminal 1: engine — rebuild on changes
cd ~/bonkjs && npm link && npm run build:watch

# Terminal 2: game — link to local engine
cd ~/my-game && npm link bonkjs && npm run dev
```

> **Important:** Game projects import from `dist/`, not `src/`. Engine source changes are invisible to linked games until rebuilt. Always keep `npm run build:watch` running.

**Consumer's `vite.config.ts`** needs pixi.js alias when npm-linked:

```typescript
const bonkEngine = path.resolve(__dirname, '../bonkjs');
const isLinked = fs.existsSync(bonkEngine);

export default defineConfig({
  resolve: {
    dedupe: ['pixi.js'],
    ...(isLinked && {
      alias: {
        'pixi.js': path.resolve(bonkEngine, 'node_modules/pixi.js'),
      },
    }),
  },
});
```
