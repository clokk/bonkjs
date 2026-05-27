# Input System

bonkjs provides a Unity-familiar input system with named axes and buttons, plus raw keyboard and mouse access.

## Axes

Axes return a value between -1 and 1, useful for continuous movement.

```typescript
import { Input } from 'bonkjs';

// Smoothed value (accelerates/decelerates)
const moveX = Input.getAxis('horizontal');

// Raw value (instant -1, 0, or 1)
const moveX = Input.getAxisRaw('horizontal');
```

### Default Axes

| Name | Negative | Positive |
|------|----------|----------|
| `horizontal` | A / ArrowLeft | D / ArrowRight |
| `vertical` | W / ArrowUp | S / ArrowDown |

### Custom Axes

```typescript
import { Input } from 'bonkjs';

Input.setAxis('strafe', {
  positive: ['KeyE'],
  negative: ['KeyQ'],
  smoothing: 10,
});
```

`smoothing` controls how fast the value ramps from 0 to 1. Higher = snappier.

## Buttons

Buttons are for discrete actions (jump, fire, interact).

```typescript
import { Input } from 'bonkjs';

// Held down right now
if (Input.getButton('jump')) { ... }

// Pressed this frame (single-frame true)
if (Input.getButtonDown('fire')) { ... }

// Released this frame
if (Input.getButtonUp('jump')) { ... }
```

### Default Buttons

| Name | Keys |
|------|------|
| `jump` | Space |
| `fire` | X, Left Mouse |

### Custom Buttons

```typescript
Input.setButton('interact', {
  keys: ['KeyE'],
});
```

## Raw Keys

Access any key directly using [KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) values:

> **Warning:** All key strings must use [`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) format — the physical key position, not the character produced. Use the `Keys` constants to avoid mistakes.
>
> | Wrong (`event.key`) | Right (`event.code`) | Constant |
> |---|---|---|
> | `'g'` | `'KeyG'` | `Keys.G` |
> | `' '` (space char) | `'Space'` | `Keys.Space` |
> | `'w'` | `'KeyW'` | `Keys.W` |
> | `'Shift'` | `'ShiftLeft'` | `Keys.ShiftLeft` |
>
> `event.key` strings silently fail — `Input.getKey('g')` always returns `false`.

```typescript
import { Input, Keys } from 'bonkjs';

if (Input.getKey('ShiftLeft')) { ... }       // held
if (Input.getKeyDown('KeyP')) { ... }        // pressed this frame
if (Input.getKeyUp('Escape')) { ... }        // released this frame
```

## Mouse

```typescript
import { Input } from 'bonkjs';

// Position relative to canvas
const [mx, my] = Input.mousePosition;

// Mouse buttons: 0=left, 1=middle, 2=right
if (Input.getMouseButton(0)) { ... }         // held
if (Input.getMouseButtonDown(2)) { ... }     // right-click this frame
```

## Debugging Held Keys

Sometimes you need to ask "what's held *right now*?" without knowing the codes in advance — e.g. tracking down a stuck virtual key, a phantom press, or a binding that fires unexpectedly. These return **sorted snapshots** (new arrays, safe to log or keep):

```typescript
import { Input } from 'bonkjs';

Input.heldKeys();          // union of everything held
Input.heldPhysicalKeys();  // physical keyboard only
Input.heldVirtualKeys();   // virtual injections only (gamepad/touch via setVirtualKey)
```

The split matters for diagnosis: a code in `heldPhysicalKeys()` is a real keypress, while a code in `heldVirtualKeys()` with no controller/touch active is a **stuck `setVirtualKey` injection**. Example one-liner probe:

```typescript
console.log('held →', { phys: Input.heldPhysicalKeys(), virt: Input.heldVirtualKeys() });
```

## Using Input in Game Code

All input methods are static on the `Input` class. Your game uses them however it wants — bonkjs doesn't impose any entity or component system:

```typescript
import { Input, Keys } from 'bonkjs';

// Simple approach: read input directly where you need it
function updatePlayer(player: Player, dt: number) {
  const dx = Input.getAxisRaw('horizontal') * player.speed * dt;
  player.x += dx;

  if (Input.getButtonDown('jump') && player.grounded) {
    player.vy = -player.jumpForce;
  }
}

// Class approach: same idea, different structure
class PlayerController {
  speed = 200;
  jumpForce = 400;

  update(player: Player, dt: number): void {
    player.x += Input.getAxisRaw('horizontal') * this.speed * dt;

    if (Input.getButtonDown('jump')) {
      player.vy = -this.jumpForce;
    }
  }
}
```

## Replacing the Entire Config

```typescript
Input.setConfig({
  axes: {
    horizontal: { positive: ['KeyD', 'ArrowRight'], negative: ['KeyA', 'ArrowLeft'], smoothing: 10 },
    vertical: { positive: ['KeyS', 'ArrowDown'], negative: ['KeyW', 'ArrowUp'], smoothing: 10 },
  },
  buttons: {
    jump: { keys: ['Space'] },
    fire: { keys: ['KeyX'] },
    interact: { keys: ['KeyE'] },
  },
});
```

## Frame Timing

`Input.update()` is called at the end of each frame by the game loop. This means:
- `getButtonDown()` returns true for exactly one frame
- `getAxisRaw()` reflects the current key state
- `getAxis()` smoothly interpolates toward the target value

The game loop handles this automatically — you don't need to call `Input.update()` yourself.
