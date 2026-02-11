# Touch Controls

bonkjs provides virtual touch controls (joystick + action buttons) that inject directly into the Input system. All existing game logic, multiplayer networking, and axis/button systems work with zero changes.

## Quick Start

```typescript
import { TouchControls, Keys, Input } from 'bonkjs';

// After game.init() returns the ui container:
const { ui } = await game.init({ ... });

const touch = new TouchControls(ui, {
  canvasWidth: 1920,
  canvasHeight: 1080,
  joystick: {
    keys: { up: Keys.ArrowUp, down: Keys.ArrowDown,
            left: Keys.ArrowLeft, right: Keys.ArrowRight },
  },
  buttons: [
    { key: Keys.Space, label: 'A', position: [0.88, 0.88], radius: 55, color: 0x44ff44 },
    { key: Keys.G, label: 'B', position: [0.76, 0.72], radius: 40, color: 0xff4444 },
  ],
});

// Only show on touch devices
if (!Input.hasTouchSupport) touch.hide();
```

## How It Works

Touch controls use **virtual key injection** — when the player touches the joystick or a button, `Input.setVirtualKey()` writes directly into Input's key state. `Input.getKey()`, `getAxis()`, `getButton()`, and `captureKeyState()` all see virtual keys identically to physical keys.

Physical and virtual keys coexist safely:
- Holding a physical key + releasing the same virtual key → key stays held
- Holding a virtual key + releasing the same physical key → key stays held
- Tab switch → all virtual keys auto-release (prevents stuck inputs)

### Event Architecture

Touch controls use a hybrid event strategy for maximum reliability:

- **Press**: PixiJS `pointerdown` on hit areas (needs PixiJS hit testing to know which control was touched)
- **Drag**: DOM `window.pointermove` with manual coordinate conversion from client space to virtual canvas space (PixiJS global events are unreliable on containers without `eventMode`)
- **Release**: DOM `window.pointerup` / `pointercancel` (guaranteed to fire regardless of where the finger lifts)

## Config Reference

### `TouchControlsConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `canvasWidth` | `number` | required | Virtual canvas width for position calculation |
| `canvasHeight` | `number` | required | Virtual canvas height for position calculation |
| `joystick` | `TouchJoystickConfig \| false` | enabled | Joystick config, or `false` to disable |
| `buttons` | `TouchButtonConfig[]` | `[]` | Action button configs |
| `alpha` | `number` | `0.35` | Base alpha for all controls |
| `autoHideOnKeyboard` | `boolean` | `true` | Auto-swap between touch/keyboard mode based on last input type |

### `TouchJoystickConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `position` | `[number, number]` | `[0.15, 0.7]` | Position as fraction of canvas |
| `radius` | `number` | `80` | Outer ring radius in pixels |
| `keys` | `{ up?, down?, left?, right? }` | Arrow keys | Key codes for each direction |
| `deadzone` | `number` | `0.2` | Fraction of radius for deadzone |
| `eightWay` | `boolean` | `true` | Enable diagonal input |

### `TouchButtonConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | `string` | required | Key code to inject (e.g. `Keys.Space`) |
| `label` | `string` | none | Label text displayed on button |
| `position` | `[number, number]` | `[0.85, 0.7]` | Position as fraction of canvas |
| `radius` | `number` | `50` | Button radius in pixels |
| `color` | `number` | `0xffffff` | Tint color for stroke and label |

## Customization

The `container`, `joystickContainer`, and `buttonContainers` properties expose the PixiJS containers for restyling:

```typescript
// Change overall alpha
touch.container.alpha = 0.5;

// Tint the joystick
if (touch.joystickContainer) {
  touch.joystickContainer.alpha = 0.8;
}

// Access individual buttons
touch.buttonContainers[0].scale.set(1.2);
```

All visuals are plain PixiJS Graphics/Text — games can tint, retexture, or replace children.

## Input Mode Switching

When `autoHideOnKeyboard` is enabled (default), controls participate in the shared three-way input mode system (`Input.inputMode`):

1. Any physical keypress → **keyboard mode** — touch controls hide immediately, virtual keys released
2. Any screen touch → **touch mode** — touch controls show immediately
3. Any gamepad input → **gamepad mode** — touch controls hide immediately (if GamepadControls is active)

The current mode is shared at `Input.inputMode` (`'keyboard' | 'touch' | 'gamepad'`). TouchControls subscribes to `Input.onInputModeChange()` and shows/hides based on the mode.

This works independently of `show()`/`hide()`, which control game-level enable/disable (e.g. hide during menus). When the game calls `show()`, controls only appear if `Input.inputMode === 'touch'`.

## Device Detection

```typescript
import { Input } from 'bonkjs';

// Static — set at module load
Input.hasTouchSupport;  // true if 'ontouchstart' or maxTouchPoints > 0

// Dynamic — set on first keydown
Input.hasKeyboard;      // true after any physical key press
```

## Virtual Key API

The Input class exposes virtual key methods for advanced use:

```typescript
// Inject a key press
Input.setVirtualKey('Space', true);

// Release a key
Input.setVirtualKey('Space', false);

// Release all virtual keys (respects physical state)
Input.clearAllVirtualKeys();

// Query virtual state
Input.isVirtualKeyHeld('Space');
```

## Multi-Touch

Each control tracks its own `pointerId`, so the joystick and buttons work simultaneously with different fingers. DOM `pointermove` on `window` tracks the joystick finger even when it slides outside the hit area or off the canvas entirely.
