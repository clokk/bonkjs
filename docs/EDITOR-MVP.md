# Bonk Engine Editor MVP

## Overview

A Tauri-based editor for bonk-engine with the same panel layout as markdown-editor (Hierarchy | Viewport | Inspector + bottom tabs), using a flat 2D-appropriate visual style. The key differentiator is an embedded Claude Code terminal.

**Tech Stack:**
- Desktop: Tauri v2
- UI: React 19 + Tailwind + Zustand
- Terminal: xterm.js + Tauri shell plugin (PTY)
- Viewport: PixiJS v8 embedded in React

---

## Current Status

### Implemented (Working)

| Feature | Status | Notes |
|---------|--------|-------|
| Tauri application shell | ✅ Complete | Launches via `npm run tauri:dev` |
| Resizable panel layout | ✅ Complete | Hierarchy, Viewport, Inspector + bottom tabs |
| PixiJS viewport | ✅ Complete | Renders scenes with colored placeholders |
| Scene loading | ✅ Complete | Loads from compiled JSON, switchable from Project panel |
| Play/Pause/Stop controls | ✅ Complete | Play starts scene, Pause freezes without reset, Stop reloads scene |
| Initial camera view | ✅ Complete | Viewport shows scene from Camera2D's starting position |
| Hierarchy panel | ✅ Complete | Shows GameObjects from loaded scene |
| Project file browser | ✅ Complete | Real filesystem via Tauri FS, double-click to load scenes |
| Console panel | ✅ Complete | Shows engine logs |
| Claude terminal | ✅ Complete | xterm.js + PTY integration (Tauri only) |
| Input debug overlay | ✅ Complete | Toggleable in viewport, shows axes/buttons/keys |
| Editor styling | ✅ Complete | Zinc color palette matching markdown-editor |
| Inspector ↔ Selection binding | ✅ Complete | Inspector reads actual data from selected GameObject |
| Hierarchy type icons | ✅ Complete | Shows component-based icons for GameObjects |
| Inspector component badges | ✅ Complete | Shows colored badges for all components |
| Transform inspector | ✅ Complete | Editable position, rotation, scale, zIndex |
| Sprite inspector | ✅ Complete | Editable anchor, alpha, flip |
| Collider inspector | ✅ Complete | Editable shape, dimensions, offset, isTrigger |
| RigidBody inspector | ✅ Complete | Editable mass, friction, damping, etc. |
| Camera inspector | ✅ Complete | Editable zoom, target, smoothing, bounds |
| Behavior inspector | ✅ Complete | Shows behavior names and custom props |
| Scene saving | ✅ Complete | Cmd+S saves JSON to public/scenes/, dirty indicator in header |
| Dirty state tracking | ✅ Complete | Unsaved changes indicator, beforeunload warning |
| Real file system | ✅ Complete | Tauri FS plugin reads project directory |
| Drag and drop sprites | ✅ Complete | Drag images from Project panel to viewport/hierarchy |
| Keyboard shortcuts | ✅ Complete | Delete, Duplicate (Cmd+D), Save (Cmd+S), Refresh (Cmd+R) |

### Not Yet Functional

| Feature | Status | What's Missing |
|---------|--------|----------------|
| Viewport click selection | ❌ Not implemented | Can't click objects in viewport to select |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  TAURI APPLICATION                                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┬─────────────────────────┬───────────────┐       │
│  │  HIERARCHY │       VIEWPORT          │   INSPECTOR   │       │
│  │   (left)   │   (center, PixiJS)      │    (right)    │       │
│  │            │                         │               │       │
│  │ Scene tree │   Game canvas with      │ Properties of │       │
│  │ from store │   play/stop + debug     │ selected obj  │       │
│  ├────────────┴─────────────────────────┴───────────────┤       │
│  │  Bottom Tabs: Project | Console | Claude Terminal    │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  Tauri Backend: PTY for Claude CLI                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
bonk-engine/
├── src/
│   ├── engine/                    # Game runtime (unchanged)
│   │
│   └── editor/                    # Editor UI
│       ├── App.tsx                # Root component
│       ├── index.tsx              # Entry point
│       ├── index.css              # Global styles
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── EditorLayout.tsx    # Main resizable layout
│       │   │   └── AppHeader.tsx       # Top bar with panel toggles
│       │   │
│       │   ├── panels/
│       │   │   ├── Hierarchy.tsx       # Scene tree (reads from store)
│       │   │   ├── Inspector.tsx       # Properties panel (placeholder)
│       │   │   ├── ProjectFiles.tsx    # File browser (mock data)
│       │   │   ├── ConsolePanel.tsx    # Log output
│       │   │   └── ClaudeTerminal.tsx  # xterm.js + PTY
│       │   │
│       │   ├── viewport/
│       │   │   ├── EditorViewport.tsx  # PixiJS canvas + toolbar
│       │   │   └── InputDebugOverlay.tsx # Input state display
│       │   │
│       │   ├── inspector/
│       │   │   ├── TransformInspector.tsx  # Position/rotation/scale (Vector2)
│       │   │   ├── SpriteInspector.tsx     # Sprite component props
│       │   │   ├── ColliderInspector.tsx   # Collider shape and props
│       │   │   ├── RigidBodyInspector.tsx  # RigidBody2D physics props
│       │   │   ├── CameraInspector.tsx     # Camera2D settings
│       │   │   └── BehaviorInspector.tsx   # Behavior list + custom props
│       │   │
│       │   └── ui/
│       │       ├── Button.tsx
│       │       ├── Panel.tsx
│       │       ├── ResizeHandle.tsx
│       │       ├── Input.tsx
│       │       └── ScrollArea.tsx
│       │
│       ├── hooks/
│       │   └── useSelectedGameObject.ts  # Selection + scene lookup hook
│       │
│       ├── store/
│       │   └── editorStore.ts      # Zustand state management
│       │
│       └── lib/
│           └── utils.ts            # cn() helper
│
├── src-tauri/                      # Tauri backend
│   ├── src/
│   │   ├── main.rs                 # App entry + command registration
│   │   └── pty.rs                  # PTY spawn/write/resize commands
│   ├── capabilities/default.json
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── docs/
│   ├── EDITOR-MVP.md               # This file
│   └── EDITOR-STYLE-GUIDE.md       # Visual design system
│
├── editor.html                     # Editor entry HTML
├── tailwind.config.js              # Theme configuration
└── vite.config.ts                  # Supports --mode editor
```

---

## State Management

The editor uses Zustand for state. Key state shape:

```typescript
interface EditorState {
  // Selection
  selectedGameObjectIds: string[];

  // Scene
  currentScene: Scene | null;        // Actual Scene instance
  currentScenePath: string | null;
  pendingSceneLoad: string | null;   // Triggers scene switch

  // Playback
  isPlaying: boolean;
  isPaused: boolean;
  isDirty: boolean;                  // Not yet used

  // Panel visibility
  showHierarchy: boolean;
  showInspector: boolean;
  showBottomPanel: boolean;
  showInputDebug: boolean;

  // Panel sizes
  hierarchyWidth: number;
  inspectorWidth: number;
  bottomPanelHeight: number;

  // Bottom panel
  activeBottomPanel: 'project' | 'console' | 'claude';

  // Console
  consoleLogs: ConsoleLog[];
}
```

---

## Running the Editor

```bash
# Development (hot reload)
npm run tauri:dev

# Build for distribution
npm run tauri:build
```

The editor runs on port 1420. The game (standalone) runs on port 3000.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+R / Ctrl+R | Refresh the editor |
| Cmd+Shift+I / Ctrl+Shift+I | Open DevTools inspector |

---

## Viewport Controls

The viewport toolbar provides playback controls:

| Button | State | Action |
|--------|-------|--------|
| Play | Stopped | Starts the scene (calls awake/start) |
| Play | Paused | Resumes the scene without resetting |
| Pause | Playing | Pauses the game loop, scene state preserved |
| Stop | Playing/Paused | Stops and fully reloads the scene |

**Visual feedback:**
- Green border: Scene is playing
- Yellow border: Scene is paused
- No highlight: Scene is stopped

**Initial camera view:**
When a scene loads (or reloads via Stop), the viewport automatically positions itself based on the scene's main `Camera2D` component:
- Uses camera's transform position, or target position + offset if a target is set
- Applies the camera's zoom level
- Falls back to origin (0, 0) with zoom 1 if no camera exists

---

## Next Steps (Priority Order)

### 1. ~~Connect Inspector to Selection~~ ✅ DONE
### 2. ~~Inspector Editing Support~~ ✅ DONE
### 3. ~~Real Project File System~~ ✅ DONE
### 4. ~~Scene Persistence~~ ✅ DONE

### 5. Viewport Selection
- Raycast click position to find GameObject
- Visual selection indicator (bounding box)
- Multi-select with shift-click

### 6. Transform Gizmos
- Drag handles for position/rotation/scale
- Snap to grid option

---

## Component Icon & Color System

The editor uses a consistent visual language for component types:

| Component | Hierarchy Icon | Color | Badge |
|-----------|----------------|-------|-------|
| Camera2D | Camera | Purple (`purple-400`) | "Camera" |
| Sprite / AnimatedSprite | Image | Green (`green-400`) | "Sprite" |
| RigidBody2D | Activity | Orange (`orange-400`) | "RigidBody" |
| Collider2D | Square | Yellow (`yellow-400`) | "Collider" |
| AudioSource | Volume2 | Cyan (`cyan-400`) | "Audio" |
| (default) | Box | Zinc (`zinc-500`) | — |

**Hierarchy:** Shows the "primary" component icon (Camera > Sprite > RigidBody > Audio > default).

**Inspector:** Shows colored badges for ALL components present on the selected GameObject.

---

## Visual Design

See [EDITOR-STYLE-GUIDE.md](./EDITOR-STYLE-GUIDE.md) for the complete design system.

**Key colors:**
- Background: `zinc-950` (#09090b)
- Panel: `zinc-900` (#18181b)
- Border: `zinc-800` (#27272a)
- Accent: `sky-400` (#38bdf8)

---

## Known Issues

1. **HMR invalidation warning** - Hierarchy component triggers "Could not Fast Refresh" on some edits due to export changes. Safe to ignore.

2. **Textures not loading** - Scene shows colored placeholders because sprite images don't exist in public folder. This is expected during development.

3. **Console logs not capturing** - The ConsolePanel doesn't intercept actual console.log calls yet. Would need to override console methods.

4. **PTY only works in Tauri** - The Claude terminal shows a warning when running in browser mode.

---

## Configuration Notes

- **DevTools**: Enabled via `devtools` feature in `src-tauri/Cargo.toml`. Provides Cmd+Shift+I inspector.
- **Refresh hotkey**: Handled in React (App.tsx) since Tauri doesn't expose browser refresh by default.
