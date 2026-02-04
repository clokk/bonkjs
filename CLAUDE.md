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
│   ├── editor/           # Tauri-based editor application
│   │   ├── components/   # React UI components (panels, viewport, etc.)
│   │   ├── hooks/        # React hooks (useFileTree, useDragAndDrop, etc.)
│   │   ├── lib/          # Utilities (filesystem, coordinates, cn)
│   │   └── store/        # Zustand state management
│   └── main.ts           # Demo game entry point
├── src-tauri/            # Tauri Rust backend for editor
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

**Important: `awake()` vs `start()` for Components**

- **`awake()`** - Initialize resources, create render objects, load assets. This runs even in editor preview mode so visuals appear.
- **`start()`** - Begin gameplay behavior (auto-play audio, start animations, enable AI). This only runs when the game is actually playing.

Example: `AudioSourceComponent` loads the sound file in `awake()` but only triggers `playOnAwake` in `start()`. This allows the editor to show the scene visually without audio playing until the user presses Play.

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
| `src/editor/store/editorStore.ts` | Zustand store with scene state and actions |
| `src/editor/lib/sceneSerializer.ts` | Scene saving to JSON |
| `src/editor/components/layout/AppHeader.tsx` | Header bar with scene selector and save |

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
// Normal game loading (awake + start)
const scene = await loadSceneByName('Level1');

// Editor preview mode (awake only, visuals without gameplay)
const scene = await loadSceneByName('Level1', { skipStart: true });
// Later, when user presses Play:
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
npm run dev        # Start dev server with hot reload (game only)
npm run build      # Production build
npm run typecheck  # Type checking
npm run tauri:dev  # Start Tauri editor with full desktop features
```

## Editor

The editor is a Tauri desktop application with React frontend. It provides:
- **Project Files panel**: Real filesystem browsing via Tauri FS plugin, with search filter
- **Hierarchy panel**: Scene GameObject tree with type icons and search filter
- **Inspector panel**: Editable component properties for selected GameObjects
- **Viewport**: Scene preview with play/pause controls
- **Claude Terminal**: Integrated Claude CLI for AI collaboration

### Editor Architecture
- **Frontend**: React + Tailwind CSS + Zustand for state
- **Backend**: Tauri v2 (Rust) for filesystem access and PTY management
- **Path alias**: `@editor/*` maps to `src/editor/*`

### Header Bar Layout
- **Left**: BONK logo | Scene dropdown (with dirty indicator) | Save button
- **Right**: Panel toggles (Hierarchy, Bottom, Inspector) | Settings

### Scene Saving

Scenes are saved to JSON (not MDX). This is intentional:
- MDX → JSON is handled by Vite plugin at build time
- JSON → MDX would lose comments, formatting, and prose
- JSON round-trips perfectly via existing `toJSON()` methods

**Save location**: `public/scenes/{sceneName}.json`

The save button in the header:
- Pulses sky-blue when there are unsaved changes
- Shows a checkmark briefly after successful save
- Grayed out when no changes to save

### Inspector Property Editing

Most component properties can be edited directly in the Inspector:

| Component | Editable Properties |
|-----------|---------------------|
| **Transform** | position, rotation, scale, zIndex |
| **Sprite** | anchor, alpha, flipX, flipY |
| **Collider2D** | width/height (box), radius (circle), offset, isTrigger |
| **RigidBody2D** | mass, friction, restitution, gravityScale, damping, fixedRotation |
| **Camera2D** | isMain, zoom, followSmoothing, offset |
| **GameObject** | name, tag, enabled |

Properties use a local state pattern (commit on blur/Enter) to prevent jitter during editing.

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected GameObjects |
| `Cmd+D` | Duplicate selected GameObjects |
| `Cmd+S` | Save current scene |
| `Cmd+R` | Refresh the editor |
| `Escape` | Clear selection |

### Unsaved Changes Protection

The editor warns you before losing unsaved changes:
- Browser `beforeunload` event warns when closing the tab/window
- Confirmation dialog when switching scenes with unsaved changes

### Context Menus
Right-click in panels for context-sensitive actions:
- **Project Files**: New File, New Folder, Rename, Delete, Copy Path
- **Hierarchy (on GameObject)**: Duplicate, Rename, Create Empty Child, Delete
- **Hierarchy (empty space)**: Create Empty

### Drag and Drop

Drag image files (PNG, JPG, GIF, WebP) from Project Files to create sprite GameObjects:

| Drop Target | Result |
|-------------|--------|
| **Viewport** | Creates sprite at world position (mouse location) |
| **Hierarchy (empty space)** | Creates sprite at scene root, position [0, 0] |
| **Hierarchy (on GameObject)** | Creates sprite as child of that GameObject |

Visual feedback:
- Draggable files show grab cursor
- Valid drop targets highlight with sky-blue border/ring
- Parent nodes auto-expand when dropping as child

Implementation files:
- `src/editor/hooks/useDragAndDrop.ts` - Drag/drop utilities and hooks
- `src/editor/lib/coordinates.ts` - Screen-to-world coordinate conversion

### Tauri Commands
Custom Rust commands exposed to the frontend:
- `get_cwd` - Get current working directory (project root detection)
- `spawn_pty` / `write_pty` / `resize_pty` / `kill_pty` - PTY management for Claude terminal

## Hot Reload

- Behavior changes preserve props
- Scene changes diff and patch GameObjects
- Works automatically in dev mode via Vite HMR
