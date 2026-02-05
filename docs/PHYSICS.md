# Physics System

Bonk Engine uses Matter.js for 2D physics simulation.

## Components

### RigidBody2D

Adds physics simulation to a GameObject.

**Properties:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `bodyType` | `'dynamic' \| 'static' \| 'kinematic'` | `'dynamic'` | How the body behaves |
| `mass` | `number` | `1` | Body mass (affects forces) |
| `friction` | `number` | `0.1` | Surface friction |
| `restitution` | `number` | `0` | Bounciness (0-1) |
| `gravityScale` | `number` | `1` | Gravity multiplier (0 = no gravity) |
| `fixedRotation` | `boolean` | `false` | Prevent rotation |
| `linearDamping` | `number` | `0.01` | Air resistance |

**Body Types:**
- `dynamic` - Fully simulated, affected by gravity and forces
- `static` - Never moves, used for ground/walls
- `kinematic` - Moved by code, not affected by forces

**Runtime API:**
```typescript
// In a Behavior
const rb = this.rigidbody;

// Get/set velocity
rb.velocity = [100, 0];
const [vx, vy] = rb.velocity;

// Apply forces (continuous, like wind)
rb.applyForce([10, 0]);

// Apply impulse (instant, like explosion)
rb.applyImpulse([0, -500]);
```

### Collider2D

Defines the collision shape. Requires RigidBody2D on same GameObject.

**Properties:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `shape` | `ColliderShape` | required | Collision shape |
| `isTrigger` | `boolean` | `false` | Detect overlap without collision |
| `offset` | `[x, y]` | `[0, 0]` | Offset from transform |
| `layer` | `string` | `'default'` | Collision layer this collider belongs to |
| `mask` | `string[]` | `[]` (all) | Layers this collider interacts with |

**Shapes:**
```typescript
// Box
shape={{ type: 'box', width: 32, height: 32 }}

// Circle
shape={{ type: 'circle', radius: 16 }}

// Polygon (convex only)
shape={{ type: 'polygon', vertices: [[0,0], [32,0], [16,32]] }}
```

## Collision Callbacks

Behaviors can respond to physical collisions (non-sensor bodies):

```typescript
class MyBehavior extends Behavior {
  onCollisionEnter(other: GameObject, contact: ContactInfo): void {
    console.log('Hit:', other.name);
    console.log('Contact point:', contact.point);
    console.log('Contact normal:', contact.normal);
  }

  onCollisionExit(other: GameObject): void {
    console.log('Stopped touching:', other.name);
  }
}
```

## Triggers

A collider with `isTrigger: true` is a **sensor** — it detects overlaps without physical collision response. Sensor collisions route to `onTriggerEnter`/`onTriggerExit` instead of `onCollisionEnter`/`onCollisionExit`.

```typescript
class PickupZone extends Behavior {
  onTriggerEnter(other: GameObject): void {
    if (other.tag === 'Player') {
      console.log('Player entered pickup zone');
      this.destroy();
    }
  }

  onTriggerExit(other: GameObject): void {
    console.log('Left the zone');
  }
}
```

Key differences from collision callbacks:
- Trigger callbacks do **not** receive `ContactInfo` — sensors don't generate contact points
- If either body in a pair is a sensor, trigger callbacks fire (not collision callbacks)

Common use cases: pickup zones, damage areas, checkpoints, level transitions.

## Collision Layers

Collision layers control which objects can collide with each other using bitmask filtering.

### Declaring Layers

Declare layers upfront in scene settings (optional — layers auto-register on first use):

```json
{
  "settings": {
    "gravity": [0, 980],
    "collisionLayers": ["default", "player", "enemy", "projectile", "trigger"]
  }
}
```

### Configuring on Collider2D

Each collider has a `layer` (what it is) and `mask` (what it collides with):

```json
{
  "type": "Collider2D",
  "shape": { "type": "box", "width": 32, "height": 32 },
  "layer": "projectile",
  "mask": ["enemy"]
}
```

- **`layer`** — Which layer this collider belongs to. Default: `"default"`.
- **`mask`** — Which layers this collider interacts with. Empty = collides with everything.

### Example Setup

| Object | Layer | Mask | Result |
|--------|-------|------|--------|
| Player | `"player"` | (empty) | Collides with everything |
| Enemy | `"enemy"` | `["player", "projectile"]` | Collides with player and projectiles only |
| Bullet | `"projectile"` | `["enemy"]` | Passes through player, hits enemies |
| Ground | `"default"` | (empty) | Collides with everything |

### Runtime API

```typescript
import { CollisionLayers } from '../src/engine';

CollisionLayers.register('player');           // Pre-register a layer
CollisionLayers.category('projectile');       // Get bitmask (auto-registers)
CollisionLayers.mask(['player', 'enemy']);    // Get combined bitmask
CollisionLayers.getLayerNames();              // All registered names
```

## Scene Usage

```json
{
  "settings": { "gravity": [0, 980] },
  "gameObjects": [
    {
      "name": "Player",
      "components": [
        { "type": "RigidBody2D", "bodyType": "dynamic" },
        { "type": "Collider2D", "shape": { "type": "box", "width": 32, "height": 64 } }
      ]
    },
    {
      "name": "Ground",
      "components": [
        { "type": "RigidBody2D", "bodyType": "static" },
        { "type": "Collider2D", "shape": { "type": "box", "width": 800, "height": 32 } }
      ]
    },
    {
      "name": "Coin",
      "components": [
        { "type": "RigidBody2D", "bodyType": "kinematic", "gravityScale": 0 },
        { "type": "Collider2D", "shape": { "type": "circle", "radius": 16 }, "isTrigger": true }
      ]
    }
  ]
}
```

## Physics Queries

Available via Scene's physicsWorld:

```typescript
// Raycast
const hit = this.gameObject.scene.physicsWorld.raycast(
  [100, 100],    // origin
  [1, 0],        // direction (normalized)
  200            // max distance
);
if (hit) {
  console.log('Hit at:', hit.point);
  console.log('Surface normal:', hit.normal);  // actual surface normal
  console.log('Distance:', hit.distance);
}

// Query area
const bodies = this.gameObject.scene.physicsWorld.queryAABB(
  [0, 0],      // min corner
  [100, 100]   // max corner
);
```

## Timing

Physics runs at a fixed 60Hz timestep:
- `fixedUpdate()` is called at consistent intervals
- Use `fixedUpdate()` for physics-related code
- Use `update()` for rendering/input (variable framerate)

## Velocity and Movement

Matter.js velocity is in **pixels per physics step**, not pixels per second. When setting velocity for continuous movement, multiply by `fixedDeltaTime`:

```typescript
// Continuous movement (applied every frame)
const [, vy] = rb.velocity;
rb.velocity = [moveX * speed * this.fixedDeltaTime, vy];

// One-time velocity change (like jump) - also scale
rb.velocity = [vx, -jumpForce * this.fixedDeltaTime];
```

With `speed = 250` and `fixedDeltaTime = 1/60`:
- Velocity per step: ~4.17 pixels
- Effective speed: 250 pixels/second

## Tips

1. **Performance**: Use simple shapes (box, circle) over polygons
2. **Tunneling**: For fast-moving objects, use smaller colliders or continuous collision detection
3. **Stacking**: Use low restitution (0) for stable stacks
4. **One-way platforms**: Use collision layers to filter which objects interact
5. **Input timing**: Ensure `Input.update()` is called at the END of the frame so `getButtonDown` works in `fixedUpdate`
