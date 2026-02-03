# Bonk Engine - AI Collaboration Context

## What This Is

A 2D game engine with MDX scene format, designed for AI collaboration. TypeScript-first, Unity-familiar patterns, web-native.

## Project Structure

```
bonk-engine/
├── src/
│   ├── engine/           # Core engine (future: @bonk/engine npm package)
│   │   ├── components/   # Built-in components (Sprite, etc.)
│   │   ├── physics/      # Physics abstraction (Matter.js)
│   │   ├── rendering/    # Rendering abstraction (PixiJS)
│   │   └── types/        # TypeScript type definitions
│   └── main.ts           # Demo game entry point
├── behaviors/            # Game behaviors (scripts)
├── scenes/               # MDX scene files
├── prefabs/              # MDX prefab files
├── tools/                # Build tooling (Vite plugin)
└── public/               # Compiled scene JSON output
```

## Conventions

### Naming
- **Behaviors**: PascalCase files and classes (`PlayerController.ts`)
- **Props**: camelCase (`speed`, `jumpForce`)
- **Components**: PascalCase with suffix (`SpriteComponent`)
- **Scenes**: PascalCase (`Level1.mdx`)

### Code Style
- Use TypeScript strict mode
- Prefer composition over inheritance
- Keep behaviors focused and single-purpose
- Use generators for coroutines (`yield* this.wait(seconds)`)

## Key Patterns

### Unity-style Lifecycle
```typescript
class MyBehavior extends Behavior {
  awake(): void {}        // Called once on creation
  start(): void {}        // Called after all awakes
  update(): void {}       // Called every frame
  fixedUpdate(): void {}  // Called at fixed timestep (physics)
  lateUpdate(): void {}   // Called after update
  onDestroy(): void {}    // Called on destruction
}
```

### Component Access
```typescript
// Get component from same GameObject
const sprite = this.getComponent(SpriteComponent);

// Get component from another object
const enemy = this.find('Enemy');
const health = enemy?.getComponent(HealthComponent);
```

### Coroutines
```typescript
*fadeOut() {
  for (let alpha = 1; alpha >= 0; alpha -= 0.1) {
    this.sprite.alpha = alpha;
    yield* this.wait(0.1);
  }
}

start(): void {
  this.startCoroutine(this.fadeOut());
}
```

### Component Registration
```typescript
// components/MyComponent.ts
export class MyComponent extends Component {
  readonly type = 'MyComponent';
  // ...
}

registerComponent('MyComponent', (gameObject, data) => {
  return new MyComponent(gameObject, data);
});
```

## Key Files

| File | Purpose |
|------|---------|
| `src/engine/Behavior.ts` | Base class for game logic |
| `src/engine/GameObject.ts` | Entity container with components |
| `src/engine/Scene.ts` | Scene management and lifecycle |
| `src/engine/rendering/` | PixiJS rendering abstraction |
| `src/engine/physics/` | Matter.js physics abstraction |
| `tools/vite-plugin-bonk-scenes/` | MDX to JSON compiler |

## Working With Scenes

### MDX Scene Format
```mdx
<Scene>
  <Scene.Settings gravity={[0, 980]} />

  <GameObject name="Player" tag="Player" position={[100, 200]}>
    <Sprite src="./player.png" />
    <Behavior src="./behaviors/PlayerController.ts" props={{ speed: 200 }} />
  </GameObject>
</Scene>
```

### Loading Scenes
```typescript
const scene = await loadSceneByName('Level1');
scene.awake();
scene.start();
```

## Abstractions

### Renderer (rendering/)
- Interface: `Renderer`, `RenderObject`
- Implementation: `PixiRenderer` (PixiJS v8)
- Global singleton via `getRenderer()`

### Physics (physics/)
- Interface: `PhysicsWorld`, `PhysicsBody`
- Implementation: `MatterPhysicsWorld` (Matter.js)
- Factory: `createPhysicsWorld('matter')`

## Commands

```bash
npm run dev        # Start dev server with hot reload
npm run build      # Production build
npm run typecheck  # Type checking
```

## Hot Reload

- Behavior changes preserve props
- Scene changes diff and patch GameObjects
- Works automatically in dev mode via Vite HMR
