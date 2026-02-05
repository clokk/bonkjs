# Bonk Engine Vision

A 2D game engine built for AI collaboration. JSON scenes that humans and LLMs can read, write, and iterate on together. Opinionated defaults, cross-platform export from day one.

**Not** a library (like Phaser). A **product** - closer to Godot's positioning but TypeScript-native and web-first.

**The name:** Playful, memorable, approachable. Serious tech doesn't need a serious name. "Built with Bonk Engine" is both a flex and a conversation starter.

## Core Principles

1. **TypeScript-first** - Types are guardrails for AI-generated code. The compiler catches mistakes before runtime.
2. **Unity-familiar, improved where clear** - Seasoned developers feel at home. We diverge only when there's obvious benefit.
3. **JSON scenes are pure data** - Game loop owns rendering.
4. **React for editor, vanilla TS for runtime** - No fighting the reconciler.
5. **Component-based, not ECS** - Simpler mental model, sufficient for 2D scale.
6. **Opinionated by default** - Make decisions so users don't have to.
7. **Cross-platform from day one** - Web, desktop (Tauri), mobile (Capacitor).
8. **AI-readable everything** - Scenes are code, not binaries.
9. **Approachable over intimidating** - The meme-friendly name is intentional. Serious tech, welcoming vibe.

## AI Collaboration Design

**Why this architecture helps AI:**

1. **TypeScript throughout** - AI-generated code gets type-checked immediately
2. **Behaviors are standalone files** - AI can generate/modify one file without touching others
3. **JSON scenes are readable** - AI can understand existing scene structure
4. **Unity-familiar patterns** - AI training data includes tons of Unity examples
5. **No binary formats** - Everything is text, diffable, mergeable

**The collaboration loop:**
```
1. Human: "Let's make a platformer"
2. Claude: Generates scene.json + PlayerController.ts
3. Human: "The jump feels floaty"
4. Claude: Reads PlayerController.ts, adjusts jumpForce/gravity
5. Human: "Add double jump"
6. Claude: Adds doubleJump logic, knows the patterns
7. Human: Commits, ships to itch.io
8. New session: Claude reads scene + behaviors, continues
```

## Unity Patterns: Keep vs Improve

| Pattern | Unity | Bonk Engine | Rationale |
|---------|-------|-------------|-----------|
| Lifecycle hooks | Awake, Start, Update, etc. | **Same** | Familiar, well-understood |
| GetComponent<T>() | Returns Component | **Same** | Intuitive API |
| Transform always present | Yes | **Yes** | Good pattern |
| Scene format | Binary/YAML | **JSON** | AI-readable, version control friendly |
| Inspector serialization | C# attributes | **TypeScript types** | AI can read/write, no decorators needed |
| Prefabs | Binary asset | **JSON prefab files** | Readable templates |
| MonoBehaviour | C# class | **Behavior class** | Same concept, TypeScript |
| deltaTime access | Time.deltaTime | **Passed to update(dt)** | Explicit, testable |
| Find by name | GameObject.Find() | **this.find()** | Scoped to behavior, same concept |
| Physics | PhysX (3D-focused) | **Matter.js** | 2D-native, simpler |
| Coroutines | yield return | **Generator functions** | Modern JS, cleaner |
| Events | C# events/UnityEvent | **TypeScript EventEmitter** | Standard patterns |

### Improvement: Coroutines via Generators

Unity:
```csharp
IEnumerator SpawnEnemies() {
    while (true) {
        Instantiate(enemyPrefab);
        yield return new WaitForSeconds(2f);
    }
}
```

Bonk Engine:
```typescript
*spawnEnemies() {
  while (this.enabled) {
    this.instantiate(enemyPrefab);
    yield* this.wait(2);
  }
}
```

### Improvement: Serialization via Types

Unity requires attributes:
```csharp
[SerializeField] private float speed = 5f;
[Range(0, 100)] public int health = 100;
```

Bonk Engine uses plain TypeScript:
```typescript
// Public properties are automatically serializable
speed: number = 5;
health: number = 100;

// Private with underscore prefix excluded from inspector
private _internalState: number = 0;
```

The JSON scene can set these directly:
```json
{ "src": "./behaviors/PlayerController.ts", "props": { "speed": 8, "health": 150 } }
```

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript (strict) | AI guardrails, type safety |
| Editor UI | React 19 + Radix | Proven, declarative UI |
| Rendering | PixiJS | Fast WebGL, not a framework |
| Physics | Matter.js | Pure JS, 2D-native, simple |
| Scene Format | JSON | AI-readable, data at runtime |
| Desktop | Tauri | 3-8MB vs Electron's 150MB |
| Mobile | Capacitor | Clean native wrapper |
| Build | Vite | Fast, standard |
| Audio | Howler.js | Handles browser quirks |

## MVP Scope

### Phase 1: Core Runtime (current)

1. JSON scene format
2. Vanilla TS game loop with PixiJS
3. GameObject, Transform, Component, Behavior classes
4. Core components: Sprite, RigidBody2D, Collider2D
5. Input, Time, SceneManager utilities
6. `npm run dev` with hot-reload
7. `npm run build:web` produces deployable bundle

### Phase 2: Cross-Platform

1. Tauri desktop builds
2. Capacitor mobile builds
3. Build pipeline automation

### Phase 3: Editor

1. React-based editor shell
2. Hierarchy panel
3. Inspector panel
4. Viewport with scene editing
5. Claude Code terminal integration

## Export Targets

```bash
npm run dev              # Hot-reload development
npm run build:web        # → dist/web/
npm run build:desktop    # → Tauri app
npm run build:ios        # → Capacitor iOS
npm run build:android    # → Capacitor Android
```

Target bundle sizes:
- Web: ~500KB - 2MB
- Desktop: ~5MB (Tauri)
- Mobile: Native wrapper + web bundle

## Branding

**Name:** Bonk Engine
**Domain:** bonkengine.com

**Why the name works:**
- Memorable, shareable, meme-native
- Approachable for beginners and AI-assisted devs
- Stands out from serious names (Unity, Unreal, Godot)
- "Built with Bonk Engine" is a conversation starter
- The contrast (cute name / serious tech) is the feature
