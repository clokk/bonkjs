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
| Project file browser | ✅ Complete | Mock file tree, double-click to load scenes |
| Console panel | ✅ Complete | Shows engine logs |
| Claude terminal | ✅ Complete | xterm.js + PTY integration (Tauri only) |
| Input debug overlay | ✅ Complete | Toggleable in viewport, shows axes/buttons/keys |
| Editor styling | ✅ Complete | Zinc color palette matching markdown-editor |
| Inspector ↔ Selection binding | ✅ Complete | Inspector reads actual data from selected GameObject |
| Transform inspector | ✅ Complete | Shows real position, rotation, scale, zIndex (read-only) |
| Sprite inspector | ✅ Complete | Shows src, anchor, tint, alpha, flip (read-only) |
| Collider inspector | ✅ Complete | Shows shape, dimensions, offset, isTrigger (read-only) |
| RigidBody inspector | ✅ Complete | Shows bodyType, mass, friction, damping, etc. (read-only) |
| Camera inspector | ✅ Complete | Shows zoom, target, smoothing, bounds (read-only) |
| Behavior inspector | ✅ Complete | Shows behavior names and custom props (read-only) |

### Not Yet Functional

| Feature | Status | What's Missing |
|---------|--------|----------------|
| Inspector editing | 🔶 Read-only | Inspector displays data but doesn't modify GameObjects yet |
| Viewport click selection | ❌ Not implemented | Can't click objects in viewport to select |
| Scene saving | ❌ Not implemented | No persistence back to MDX |
| File dialogs | ❌ Not implemented | Open/Save buttons are non-functional |
| Real file system | ❌ Not implemented | Project panel uses mock data |
| Dirty state tracking | ❌ Not implemented | No unsaved changes indicator |

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
- ~~When a GameObject is selected in Hierarchy, read its actual transform/components~~
- ~~Bind Inspector inputs to modify the selected GameObject~~ (read-only implemented)
- Update scene when values change (editing support - next priority)

### 2. Inspector Editing Support
- Add onChange handlers to inspector inputs
- Update component values when inputs change
- Mark scene as dirty when values change

### 3. Real Project File System
- Use Tauri FS plugin to read actual project directory
- Watch for file changes
- Support creating new files/folders

### 4. Scene Persistence
- Serialize modified scene back to JSON
- Convert JSON to MDX format
- Save via Tauri FS plugin
- Track dirty state

### 5. Viewport Selection
- Raycast click position to find GameObject
- Visual selection indicator (bounding box)
- Multi-select with shift-click

### 6. Transform Gizmos
- Drag handles for position/rotation/scale
- Snap to grid option

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
