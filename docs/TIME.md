# Time System

Bonk Engine's `Time` class provides frame timing and time scaling.

## Core Properties

| Property | Type | Description |
|----------|------|-------------|
| `Time.deltaTime` | `number` | Seconds since last frame, scaled by `timeScale` |
| `Time.unscaledDeltaTime` | `number` | Raw seconds since last frame (ignores timeScale) |
| `Time.fixedDeltaTime` | `number` | Fixed physics timestep (1/60 = 0.01667s) |
| `Time.time` | `number` | Total elapsed time (scaled) |
| `Time.unscaledTime` | `number` | Total elapsed time (unscaled) |
| `Time.timeScale` | `number` | Time multiplier. 1 = normal, 0 = paused, 0.5 = half speed |
| `Time.frameCount` | `number` | Total frames since start |
| `Time.fps` | `number` | Current frames per second |

## Using in Behaviors

Behaviors have shortcut properties for the most common values:

```typescript
class Mover extends Behavior {
  speed: number = 200;

  update(): void {
    // Frame-rate independent movement
    this.transform.translate(this.speed * this.deltaTime, 0);
  }

  fixedUpdate(): void {
    // Physics uses fixedDeltaTime
    this.rigidbody?.applyForce([10 * this.fixedDeltaTime, 0]);
  }
}
```

## Time Scale

`Time.timeScale` multiplies `deltaTime`. This affects everything that reads `deltaTime` or uses coroutines.

```typescript
// Slow motion
Time.timeScale = 0.25;

// Pause (deltaTime becomes 0)
Time.timeScale = 0;

// Normal speed
Time.timeScale = 1;

// Fast forward
Time.timeScale = 2;
```

### Pausing

Set `timeScale` to 0 to pause gameplay. Use `unscaledDeltaTime` for things that should still animate during pause (menu transitions, UI):

```typescript
class PauseManager extends Behavior {
  private wasPaused = false;

  update(): void {
    if (this.getButtonDown('pause')) {
      if (Time.timeScale === 0) {
        Time.timeScale = 1;
      } else {
        Time.timeScale = 0;
      }
    }
  }
}
```

### Hit Freeze

Classic hit-stop effect:

```typescript
*hitFreeze() {
  Time.timeScale = 0.05;
  yield* this.wait(0.1);  // Respects timeScale, so this is ~2 real seconds
  Time.timeScale = 1;
}
```

For a real-time duration instead:

```typescript
*hitFreeze() {
  Time.timeScale = 0.05;
  // Wait using unscaled time manually
  const start = Time.unscaledTime;
  while (Time.unscaledTime - start < 0.1) {
    yield* this.waitFrames(1);
  }
  Time.timeScale = 1;
}
```

## Game Loop Timing

The engine runs two update loops:

1. **Fixed update** (60 Hz) -- `fixedUpdate()` is called at a constant rate using an accumulator pattern. Physics runs here.
2. **Variable update** -- `update()` and `lateUpdate()` run once per rendered frame. Use `deltaTime` for frame-rate independent logic.

```
Each frame:
  Time.update(rawDeltaTime)
  fixedUpdate()  ×N (catches up to real time at 1/60s intervals)
  update()       ×1
  lateUpdate()   ×1
  Input.update()
  render()
```
