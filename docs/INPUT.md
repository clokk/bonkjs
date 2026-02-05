# Input System

Bonk Engine provides a Unity-familiar input system with named axes and buttons, plus raw keyboard and mouse access.

## Axes

Axes return a value between -1 and 1, useful for continuous movement.

```typescript
// Smoothed value (accelerates/decelerates)
const moveX = this.getAxis('horizontal');

// Raw value (instant -1, 0, or 1)
const moveX = this.getAxisRaw('horizontal');
```

### Default Axes

| Name | Negative | Positive |
|------|----------|----------|
| `horizontal` | A / ArrowLeft | D / ArrowRight |
| `vertical` | W / ArrowUp | S / ArrowDown |

### Custom Axes

```typescript
import { Input } from '../src/engine/Input';

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
// Held down right now
if (this.getButton('jump')) { ... }

// Pressed this frame (single-frame true)
if (this.getButtonDown('fire')) { ... }

// Released this frame
if (this.getButtonUp('jump')) { ... }
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

```typescript
if (this.getKey('ShiftLeft')) { ... }       // held
if (this.getKeyDown('KeyP')) { ... }        // pressed this frame
if (this.getKeyUp('Escape')) { ... }        // released this frame
```

## Mouse

```typescript
// Position relative to canvas
const [mx, my] = this.mousePosition;

// Mouse buttons: 0=left, 1=middle, 2=right
if (this.getMouseButton(0)) { ... }         // held
if (this.getMouseButtonDown(2)) { ... }     // right-click this frame
```

## Using Input in Behaviors

All input methods are available as `this.*` shortcuts on `Behavior`:

```typescript
class PlayerController extends Behavior {
  speed: number = 200;
  jumpForce: number = 400;

  update(): void {
    // Movement
    const dx = this.getAxisRaw('horizontal') * this.speed * this.deltaTime;
    this.transform.translate(dx, 0);

    // Jump
    if (this.getButtonDown('jump')) {
      this.rigidbody?.applyImpulse([0, -this.jumpForce]);
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

The engine handles this automatically -- you don't need to call `Input.update()` yourself.
