# Bonk Engine Documentation

## Start Here

| Your goal | Read |
|-----------|------|
| Understand what Bonk Engine is | [VISION.md](./VISION.md) |
| Get the architecture picture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Build something with the engine | [Getting Started](#getting-started) below, then the Runtime docs |
| Work on the editor | [EDITOR-MVP.md](./EDITOR-MVP.md) |
| Contribute to the engine codebase | [../CLAUDE.md](../CLAUDE.md) (conventions, key files, patterns) |

## Getting Started

```bash
npm install
npm run dev          # Game at http://localhost:3000
npm run tauri:dev    # Editor with desktop features
```

**Scene files** live in `public/scenes/*.json`. The engine loads them via `SceneLoader`.

**Behaviors** live in `behaviors/*.ts`. Each is a class extending `Behavior` with lifecycle hooks:

```typescript
import { Behavior } from '../src/engine/Behavior';

export default class MyBehavior extends Behavior {
  speed: number = 200;

  update(): void {
    const dx = this.getAxisRaw('horizontal') * this.speed * this.deltaTime;
    this.transform.translate(dx, 0);
  }
}
```

## Runtime Engine

Core concepts and systems for building games.

| Doc | What it covers |
|-----|----------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Core classes, game loop, scene lifecycle, abstraction layers |
| [SCENES-AND-PREFABS.md](./SCENES-AND-PREFABS.md) | JSON scene format, loading, prefab instantiation, scene management |
| [INPUT.md](./INPUT.md) | Keyboard, mouse, axes, buttons, configuration |
| [TIME.md](./TIME.md) | Delta time, timeScale, pause, slow-motion |
| [EVENTS.md](./EVENTS.md) | EventEmitter, global events, cross-behavior messaging |
| [PHYSICS.md](./PHYSICS.md) | RigidBody2D, Collider2D, collision callbacks, queries |
| [CAMERA.md](./CAMERA.md) | Camera2D follow, zoom, bounds, deadzone |
| [AUDIO-SYSTEM.md](./AUDIO-SYSTEM.md) | AudioSource, spatial audio, volume categories |
| [ANIMATED-SPRITES.md](./ANIMATED-SPRITES.md) | Sprite sheet animation, frame control, callbacks |
| [UI-SYSTEM.md](./UI-SYSTEM.md) | In-game UI elements, layout, hit testing |

## Editor

| Doc | What it covers |
|-----|----------------|
| [EDITOR-MVP.md](./EDITOR-MVP.md) | Editor architecture, status, panels, controls, shortcuts |
| [EDITOR-STYLE-GUIDE.md](./EDITOR-STYLE-GUIDE.md) | Visual design system, colors, components |

## Reference

| Doc | What it covers |
|-----|----------------|
| [VISION.md](./VISION.md) | Design principles, tech stack rationale, roadmap |
| [UI-RESEARCH.md](./UI-RESEARCH.md) | Research notes on UI system design (Godot/Unity/Phaser comparison) |
| [../CLAUDE.md](../CLAUDE.md) | AI collaboration context, conventions, key files |
| [../README.md](../README.md) | Project overview and quick start |
