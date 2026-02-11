# Gamepad Controls

bonkjs provides gamepad/controller support via the browser Gamepad API. Like TouchControls, it injects virtual keys via `Input.setVirtualKey()` — all existing game logic, multiplayer networking, and input systems work with zero changes.

## Quick Start

```typescript
import { GamepadControls, GamepadButtons, Keys } from 'bonkjs';

const gamepad = new GamepadControls({
  leftStick: {
    keys: { left: Keys.ArrowLeft, right: Keys.ArrowRight },  // movement only
  },
  rightStick: false,  // no digital injection — use rightStickValue for analog aim
  // D-pad: defaults to all 4 arrow keys (menu navigation + fallback)
  buttons: [
    { button: GamepadButtons.A, key: Keys.Space },
    { button: GamepadButtons.B, key: Keys.G },
    { button: GamepadButtons.Start, key: Keys.Escape },
  ],
});

// Poll every frame (call before any input reads)
game.onUpdate(() => {
  gamepad.update();
  // ... game logic ...
});
```

## How It Works

Each frame, `update()` calls `navigator.getGamepads()`, reads button/axis state, diffs against the previous frame, and calls `Input.setVirtualKey()` for changes. `Input.getKey()`, `getAxis()`, `getButton()`, and `captureKeyState()` all see gamepad input identically to physical keys.

Only gamepads with `mapping === 'standard'` are accepted (Xbox, PlayStation, Switch Pro, and most modern controllers).

## GamepadButtons Constants

| Constant | Index | Typical Label |
|----------|-------|---------------|
| `A` | 0 | A / Cross |
| `B` | 1 | B / Circle |
| `X` | 2 | X / Square |
| `Y` | 3 | Y / Triangle |
| `LB` | 4 | Left Bumper / L1 |
| `RB` | 5 | Right Bumper / R1 |
| `LT` | 6 | Left Trigger / L2 |
| `RT` | 7 | Right Trigger / R2 |
| `Back` | 8 | Back / Select / Share |
| `Start` | 9 | Start / Menu / Options |
| `LS` | 10 | Left Stick Click / L3 |
| `RS` | 11 | Right Stick Click / R3 |
| `DpadUp` | 12 | D-pad Up |
| `DpadDown` | 13 | D-pad Down |
| `DpadLeft` | 14 | D-pad Left |
| `DpadRight` | 15 | D-pad Right |
| `Home` | 16 | Home / Guide / PS |

## Config Reference

### `GamepadControlsConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `leftStick` | `GamepadStickConfig \| false` | enabled (arrow keys) | Left stick config, or `false` to disable |
| `rightStick` | `GamepadStickConfig \| false` | disabled | Right stick config |
| `buttons` | `GamepadButtonMapping[]` | `[]` | Button-to-key mappings |
| `dpad` | `{ up?, down?, left?, right? } \| false` | same as leftStick | D-pad key mappings |
| `gamepadIndex` | `number` | `0` | Which gamepad to use |
| `autoSwitchMode` | `boolean` | `true` | Auto-switch `Input.inputMode` on gamepad input |

### `GamepadStickConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `keys` | `{ up?, down?, left?, right? }` | Arrow keys (all 4) | Key codes for each direction. Only specified keys are mapped — omitted directions produce no input. Defaults (all 4 arrows) only apply when `keys` is omitted entirely. |
| `deadzone` | `number` | `0.25` | Scaled radial deadzone (0-1) |
| `eightWay` | `boolean` | `true` | Enable diagonal input |

### `GamepadButtonMapping`

| Property | Type | Description |
|----------|------|-------------|
| `button` | `number` | Standard button index (use `GamepadButtons` constants) |
| `key` | `string` | Key code to inject (e.g. `Keys.Space`) |

## Deadzone

Uses **scaled radial deadzone** — eliminates stick drift AND provides a smooth 0-to-1 ramp:

1. Compute stick magnitude: `sqrt(x^2 + y^2)`
2. If magnitude < deadzone threshold (default 0.25) → output (0, 0)
3. Otherwise, rescale `[deadzone..1]` to `[0..1]`, preserving direction

This means slight drift produces zero input, but once past the deadzone, the effective range starts smoothly from 0 (no dead spot at the boundary).

## Analog Stick Values

Raw analog values (post-deadzone) are always available regardless of digital key injection config:

```typescript
// Returns { x, y } with range -1 to 1 (0,0 when in deadzone)
gamepad.leftStickValue;   // { x: 0.7, y: -0.3 }
gamepad.rightStickValue;  // { x: 0, y: 0.9 }
```

Use these for direct analog aim, camera control, or any non-digital input. Updated during `update()`. Digital injection and analog values work independently — you can disable digital injection for a stick (`rightStick: false`) and still read analog values from it.

### Example: Direct Aim

```typescript
const rs = gamepad.rightStickValue;
const mag = Math.sqrt(rs.x * rs.x + rs.y * rs.y);
if (mag > 0.1) {
  player.angle = Math.atan2(-rs.y, rs.x);  // negate y: stick Y is inverted
}
```

## Stick-to-Digital Conversion

Analog stick values are converted to digital key presses using independent axis thresholds (8-way mode, default) or strongest-axis-wins (4-way mode):

- **8-way**: Normalized x/y each checked against threshold (0.4). Diagonals fire when both axes exceed threshold.
- **4-way**: Only the dominant axis fires (no diagonals).

## D-pad + Stick Coexistence

Both the D-pad and left stick can map to the same keys. Each source tracks its active keys separately — a key is only released when **no** source still holds it. This prevents stuck keys when switching between stick and D-pad mid-gameplay.

## Dynamic Mapping

Both button and stick configs can be swapped at runtime for context-dependent controls (e.g. different mappings for menus vs gameplay, or two-stick aiming during specific phases).

### `setButtons(mappings)`

Swap button mappings. Releases all active button keys and resets edge detection state.

```typescript
const MENU_BUTTONS = [
  { button: GamepadButtons.A, key: Keys.Space },     // Confirm
  { button: GamepadButtons.B, key: Keys.Escape },    // Back
  { button: GamepadButtons.Start, key: Keys.Space }, // Confirm
];
const GAMEPLAY_BUTTONS = [
  { button: GamepadButtons.A, key: Keys.Space },     // Fire
  { button: GamepadButtons.B, key: Keys.G },          // Grapple
  { button: GamepadButtons.Start, key: Keys.Escape }, // Pause
];

gamepad.setButtons(isMenu ? MENU_BUTTONS : GAMEPLAY_BUTTONS);
```

### `setLeftStick(config | false)`

Swap left stick config. Releases all active left stick keys. Pass `false` to disable.

```typescript
// Two-stick aiming: left stick moves, right stick aims
const LSTICK_MOVE = { keys: { left: Keys.ArrowLeft, right: Keys.ArrowRight } };
// Full 8-way: DI, burst, menus
const LSTICK_FULL = { keys: { up: Keys.ArrowUp, down: Keys.ArrowDown,
                               left: Keys.ArrowLeft, right: Keys.ArrowRight } };

gamepad.setLeftStick(isAiming ? LSTICK_MOVE : LSTICK_FULL);
```

Deadzone and eightWay settings carry over from the previous config when not specified.

## Connection Detection

Listens for `gamepadconnected`/`gamepaddisconnected` events and checks initial state on construction. Only accepts gamepads with `mapping === 'standard'`.

```typescript
gamepad.connected  // true if a standard gamepad is connected
```

## Vibration

Optional rumble via `GamepadHapticActuator.playEffect('dual-rumble')`. Silently fails on unsupported browsers or gamepads.

```typescript
// duration (ms), weak motor magnitude (0-1), strong motor magnitude (0-1)
gamepad.vibrate(200, 0.5, 0.8);
```

Supported in Chrome/Edge on most controllers. Firefox and Safari have limited/no support.

## Input Mode Switching

When `autoSwitchMode` is enabled (default), gamepad input sets `Input.inputMode` to `'gamepad'`. Three-way switching with TouchControls:

1. Physical keypress → `'keyboard'` mode — touch controls hide, gamepad keys released
2. Screen touch → `'touch'` mode — touch controls show, gamepad keys released
3. Gamepad input → `'gamepad'` mode — touch controls hide

The current mode is shared at `Input.inputMode` (`'keyboard' | 'touch' | 'gamepad'`).

## Show / Hide

```typescript
gamepad.show();     // Enable polling (entering gameplay)
gamepad.hide();     // Disable polling + release keys (entering menu)
gamepad.isVisible;  // Whether polling is enabled
```

Use `show()`/`hide()` for game-level enable/disable (e.g. menus vs gameplay). The input mode system handles mode switching within gameplay.

## Multiplayer Compatibility

Since gamepad input flows through `Input.setVirtualKey()` → `Input.getKey()`, it's captured by `captureKeyState()` and sent over the network exactly like keyboard or touch input. No multiplayer changes needed.
