# Bonk Engine Architecture

## Overview

Bonk Engine is a 2D game engine with two distinct phases:

1. **Runtime** (current focus) - Vanilla TypeScript game loop, no React
2. **Editor** (future) - React-based scene editor with embedded viewport

This document covers the runtime architecture.

## Build Pipeline

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

### MDX Compilation

The Vite plugin (`tools/vite-plugin-bonk-scenes/`) compiles MDX scenes to JSON at build time:

1. Parse MDX using `@mdx-js/mdx`
2. Extract scene structure via recma (ESTree) transform
3. Output JSON with all GameObjects, Components, and Behaviors

This means:
- No MDX runtime in the browser
- Scenes are pure data at runtime
- Fast loading, small bundle

## Core Classes

### GameObject

Container for components and behaviors. Always has a Transform.

```typescript
class GameObject {
  name: string;
  tag?: string;
  layer?: string;
  enabled: boolean;
  transform: Transform;

  // Component access
  getComponent<T>(type: new (...) => T): T | null;
  addComponent<T>(type: new (...) => T): T;

  // Behavior access
  getBehavior<T>(type: new (...) => T): T | null;

  // Hierarchy
  parent: GameObject | null;
  children: GameObject[];
}
```

### Transform

2D positioning with hierarchy support.

```typescript
class Transform {
  position: Vector2;      // Local
  rotation: number;       // Degrees
  scale: Vector2;
  zIndex: number;

  // World-space (computed from hierarchy)
  worldPosition: Vector2;
  worldRotation: number;
  worldScale: Vector2;
}
```

### Component

Base class for data/functionality attached to GameObjects.

```typescript
abstract class Component {
  readonly gameObject: GameObject;
  enabled: boolean;
  abstract readonly type: string;

  // Lifecycle
  awake(): void;
  start(): void;
  update(): void;
  fixedUpdate(): void;
  onDestroy(): void;
}
```

### Behavior

Extended Component with game logic patterns (Unity's MonoBehaviour equivalent).

```typescript
abstract class Behavior extends Component {
  // Inherited lifecycle + additional features
  lateUpdate(): void;

  // Collision callbacks
  onCollisionEnter(other: GameObject): void;
  onTriggerEnter(other: GameObject): void;

  // Utilities
  find(name: string): GameObject | null;
  findWithTag(tag: string): GameObject[];
  instantiate(prefab: Prefab): GameObject;
  destroy(obj: GameObject, delay?: number): void;

  // Coroutines
  startCoroutine(generator: Generator): CoroutineHandle;
  wait(seconds: number): YieldInstruction;
}
```

## Abstractions

### Rendering

The rendering system is abstracted to allow different backends:

```
┌─────────────────────────────────────────────────────┐
│  Interface: Renderer                                │
│  ┌───────────────────────────────────────────────┐  │
│  │  init(config) → canvas                        │  │
│  │  createSprite(config) → RenderObject          │  │
│  │  removeObject(object)                         │  │
│  │  render()                                     │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Implementation: PixiRenderer (PixiJS v8)           │
│  - PIXI.Application wrapper                         │
│  - Sortable container for z-index                   │
│  - Texture caching via PIXI.Assets                  │
└─────────────────────────────────────────────────────┘
```

**RenderObject** wraps PixiJS display objects:
- `setPosition(x, y)` - World position
- `setRotation(degrees)` - Rotation in degrees
- `setScale(x, y)` - Scale
- `setAlpha(alpha)` - Transparency
- `zIndex` - Render order

**Global Singleton**: Access via `getRenderer()` (matches `World` pattern).

### Physics

Similar abstraction for physics:

```
┌─────────────────────────────────────────────────────┐
│  Interface: PhysicsWorld                            │
│  ┌───────────────────────────────────────────────┐  │
│  │  createBody(config) → PhysicsBody             │  │
│  │  addCollider(body, config)                    │  │
│  │  step(dt)                                     │  │
│  │  raycast(origin, dir, dist) → RaycastHit      │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Implementation: MatterPhysicsWorld (Matter.js)     │
│  - Matter.Engine wrapper                            │
│  - Collision callbacks                              │
│  - Body-to-GameObject mapping                       │
└─────────────────────────────────────────────────────┘
```

## Game Loop

```typescript
function gameLoop() {
  const dt = calculateDeltaTime();
  Time.update(dt);

  // Fixed timestep for physics (accumulator pattern)
  accumulator += dt;
  while (accumulator >= fixedTimestep) {
    scene.fixedUpdate();  // Physics, deterministic logic
    accumulator -= fixedTimestep;
  }

  // Variable timestep
  scene.update();       // Game logic
  scene.lateUpdate();   // Camera follow, etc.

  // Cleanup
  scene.processPendingDestroy();

  // Render
  renderer.render();

  requestAnimationFrame(gameLoop);
}
```

## Scene Lifecycle

```
Load Scene JSON
      │
      ▼
Create GameObjects
      │
      ▼
Create Components & Behaviors
      │
      ▼
   awake()  ────► All objects created, references can be resolved
      │
      ▼
   start()  ────► Safe to interact with other objects
      │
      ▼
  Game Loop
   ┌──────────────────────────────────────────┐
   │  fixedUpdate() → update() → lateUpdate() │
   └──────────────────────────────────────────┘
      │
      ▼ (on destroy)
 onDestroy()
```

## Future: npm Package Extraction

The engine is structured for eventual extraction to `@bonk/engine`:

```
@bonk/engine (npm package)
├── GameObject, Transform, Component, Behavior
├── Scene, SceneLoader
├── rendering/
├── physics/
├── Time, Input, Events
└── types/

Game Project (uses @bonk/engine)
├── behaviors/
├── scenes/
├── prefabs/
└── assets/
```

The current monorepo structure (`src/engine/` + demo game) will split into:
1. Engine package (publishable)
2. Demo game (example project)
3. CLI tool (scaffolding)

## Future: Editor Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Editor (React + Radix)                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Game Viewport (Canvas)                               │  │
│  │  - Vanilla game loop                                  │  │
│  │  - PixiJS rendering                                   │  │
│  │  - No React at runtime                                │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌─────────────┬──────────────┬──────────────────────────┐  │
│  │  Hierarchy  │  Inspector   │  Claude Code Terminal    │  │
│  │  Panel      │  Panel       │  Integration             │  │
│  └─────────────┴──────────────┴──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

Key principle: **React for editor UI, vanilla TS for game runtime**. The viewport is a canvas element managed by the game loop, embedded in the React shell.
