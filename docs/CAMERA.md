# Camera System

Bonk Engine uses a Camera2D component for viewport control.

## Basic Usage

Add a Camera2D component to any GameObject:

```json
{
  "name": "MainCamera",
  "transform": { "position": [400, 300], "rotation": 0, "scale": [1, 1] },
  "components": [{
    "type": "Camera2D",
    "target": "Player",
    "zoom": 1,
    "followSmoothing": 8
  }]
}
```

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `target` | `string` | - | Name of GameObject to follow |
| `zoom` | `number` | `1` | Zoom level (1 = 100%) |
| `isMain` | `boolean` | `true` | Is this the active camera? |
| `followSmoothing` | `number` | `5` | Follow speed (higher = faster) |
| `offset` | `[x, y]` | `[0, 0]` | Offset from target |
| `bounds` | `object` | - | World bounds to constrain camera |
| `deadzone` | `object` | - | Area target can move without camera moving |

## Follow Target

The camera smoothly follows a target GameObject:

```json
{ "type": "Camera2D", "target": "Player", "followSmoothing": 10, "offset": [0, -50] }
```

Higher `followSmoothing` = tighter follow. Use lower values for a looser, more cinematic feel.

## Zoom

```json
{ "type": "Camera2D", "zoom": 2 }
{ "type": "Camera2D", "zoom": 0.5 }
```

## Bounds

Constrain the camera to world limits:

```json
{ "type": "Camera2D", "target": "Player", "bounds": { "minX": 0, "minY": 0, "maxX": 1600, "maxY": 900 } }
```

The camera will stop scrolling when it reaches the edge of bounds.

## Deadzone

Allow the target to move within a zone before camera follows:

```json
{ "type": "Camera2D", "target": "Player", "deadzone": { "width": 100, "height": 50 } }
```

Useful for platformers where you don't want constant horizontal camera movement.

## Runtime API

In behaviors, access the camera:

```typescript
import { Camera2DComponent } from '../engine/components';

// Inside a behavior class:
start(): void {
  // Find the camera
  const cameraGO = this.find('MainCamera');
  const camera = cameraGO?.getComponent(Camera2DComponent);

  // Change target at runtime
  camera?.setTarget(this.gameObject);

  // Adjust zoom
  if (camera) camera.zoom = 1.5;

  // Snap to position (no smoothing)
  camera?.snapTo(500, 300);

  // Get current position
  const pos = camera?.getPosition();
}
```

## Multiple Cameras

Only one camera should have `isMain={true}` at a time. Switch cameras by changing `isMain`:

```typescript
camera1.isMain = false;
camera2.isMain = true;
```

## Tips

1. **Smoothing**: Start with 5-10, adjust based on feel
2. **Offset**: Use negative Y offset to show more ahead of player
3. **Bounds**: Set to your level size to prevent showing empty space
4. **Deadzone**: Great for platformers, use sparingly for top-down

## How It Works

The Camera2D component runs in `lateUpdate()` to ensure it moves after all physics and movement updates. It transforms the PixiJS `worldContainer`, not individual sprites, which is efficient for large scenes.

The camera calculates its position by:
1. Getting target position (or own position if no target)
2. Applying offset
3. Applying deadzone (if configured)
4. Smoothly interpolating to new position
5. Clamping to bounds (if configured)
6. Applying position and zoom to the renderer
