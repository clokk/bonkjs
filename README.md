# Bonk Engine

A 2D game engine with MDX scene format, designed for AI collaboration.

## Quick Start

```bash
npm install
npm run dev
```

## Architecture

```
BUILD TIME                                    RUNTIME
─────────────────────────────────────────    ─────────────────────────────

scenes/Level1.mdx  ───┐
scenes/Level2.mdx  ───┼─► Vite Plugin ─────► /scenes/*.json ──► SceneLoader
prefabs/*.mdx      ───┘   (recma transform)                         │
                                                                    │
behaviors/*.ts     ───────► esbuild ───────► /behaviors/*.js ───────┤
                                                                    │
                                                                    ▼
                                              Vanilla TS Game Loop (No React)
                                                     │
                                          ┌──────────┴──────────┐
                                          ▼                     ▼
                                    PixiJS Renderer       Matter.js Physics
```

## Project Structure

```
bonk-engine/
├── src/
│   ├── engine/              # Core engine (future: @bonk/engine npm package)
│   │   ├── components/      # Built-in components (Sprite, etc.)
│   │   ├── physics/         # Physics abstraction (Matter.js)
│   │   ├── rendering/       # Rendering abstraction (PixiJS)
│   │   └── types/           # TypeScript type definitions
│   └── main.ts              # Demo game entry point
├── tools/
│   └── vite-plugin-bonk-scenes/  # MDX → JSON compiler
├── behaviors/               # Game behaviors (scripts)
├── scenes/                  # MDX scene files
├── prefabs/                 # MDX prefab files
├── docs/                    # Architecture & vision docs
└── public/                  # Compiled output
```

### Engine vs Demo Game

The `src/engine/` directory contains the core engine that could become an npm package (`@bonk/engine`). Everything outside of it (behaviors, scenes, main.ts) is a demo game that uses the engine.

## Rendering

Bonk Engine uses PixiJS v8 for rendering, wrapped in an abstraction layer:

- **Renderer interface** - Allows swapping backends (PixiJS, Canvas2D, etc.)
- **RenderObject** - Wrapper for visual elements with position, rotation, scale, z-index
- **SpriteComponent** - Syncs GameObject transforms to render objects

The rendering happens at the end of the game loop, after all updates are processed.

## Scene Format (MDX)

```mdx
# My Level

<Scene>
  <Scene.Settings gravity={[0, 980]} backgroundColor="#1a1a2e" />

  <GameObject name="Player" position={[100, 200]} tag="Player">
    <Sprite src="./sprites/player.png" />
    <Behavior src="./behaviors/PlayerController.ts" props={{ speed: 200 }} />
  </GameObject>
</Scene>
```

## Creating Behaviors

```typescript
import { Behavior } from '../src/engine/Behavior';

export default class MyBehavior extends Behavior {
  speed: number = 100;

  update(): void {
    this.transform.translate(this.speed * this.deltaTime, 0);
  }
}
```

## Core Classes

- **GameObject** - Entities with transform, components, and behaviors
- **Component** - Data/functionality attached to GameObjects
- **Behavior** - Scripts with lifecycle hooks (awake, start, update, fixedUpdate)
- **Scene** - Container for GameObjects
- **Transform** - 2D position, rotation, scale

## Lifecycle Hooks

```typescript
class MyBehavior extends Behavior {
  awake(): void {}        // Called once on creation
  start(): void {}        // Called after all awakes
  update(): void {}       // Called every frame
  fixedUpdate(): void {}  // Called at fixed timestep (60fps)
  lateUpdate(): void {}   // Called after update
  onDestroy(): void {}    // Called on destruction
}
```

## Coroutines

```typescript
*fadeOut() {
  for (let alpha = 1; alpha >= 0; alpha -= 0.1) {
    this.sprite.alpha = alpha;
    yield* this.wait(0.1);  // Respects Time.timeScale
  }
}

start(): void {
  this.startCoroutine(this.fadeOut());
}
```

## Hot Reload

- Behavior changes: Preserved props, reinitialize instances
- Scene changes: Diff and patch GameObjects
- Works automatically in dev mode

## Commands

```bash
npm run dev        # Start dev server with hot reload
npm run build      # Production build
npm run typecheck  # Type checking
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - AI collaboration context and conventions
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Full architecture documentation
- [docs/VISION.md](./docs/VISION.md) - Product vision and design principles

## Future Architecture

The engine is designed for eventual extraction:

```
@bonk/engine (npm package)    ←── src/engine/ becomes this
├── GameObject, Transform, Component, Behavior
├── Scene, SceneLoader
├── rendering/, physics/
└── Time, Input, Events

bonk-cli                      ←── Scaffolding tool
└── create-bonk-game

Your Game Project             ←── What users build
├── behaviors/
├── scenes/
└── assets/
```

## Contributing

See [CLAUDE.md](./CLAUDE.md) for conventions and patterns used in this codebase.
