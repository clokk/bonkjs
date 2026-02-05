# Scenes and Prefabs

## Scene Format

Scenes are JSON files in `public/scenes/`. The engine fetches them via HTTP at runtime.

```json
{
  "name": "Level1",
  "version": 1,
  "settings": {
    "gravity": [0, 980],
    "backgroundColor": "#1a1a2e",
    "collisionLayers": ["default", "player", "enemy", "projectile"]
  },
  "gameObjects": [
    {
      "id": "uuid-here",
      "name": "Player",
      "tag": "Player",
      "enabled": true,
      "transform": {
        "position": [400, 300],
        "rotation": 0,
        "scale": [1, 1],
        "zIndex": 10
      },
      "components": [
        { "type": "Sprite", "src": "./sprites/player.png", "anchor": [0.5, 0.5] },
        { "type": "RigidBody2D", "bodyType": "dynamic", "mass": 1 },
        { "type": "Collider2D", "shape": { "type": "box", "width": 32, "height": 64 }, "layer": "player" }
      ],
      "behaviors": [
        { "src": "./behaviors/PlayerController.ts", "props": { "speed": 200 } }
      ],
      "children": []
    }
  ]
}
```

### GameObject Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | No | UUID (auto-generated if omitted) |
| `name` | `string` | Yes | Display name, used by `find()` |
| `tag` | `string` | No | Group label, used by `findWithTag()` |
| `enabled` | `boolean` | No | Default: true |
| `transform` | `object` | Yes | Position, rotation, scale, zIndex |
| `components` | `array` | No | Built-in components (Sprite, RigidBody2D, etc.) |
| `behaviors` | `array` | No | Script components with props |
| `children` | `array` | No | Nested GameObjects (inherit parent transform) |
| `prefab` | `object` | No | Prefab reference with overrides |

## Loading Scenes

### By Name

```typescript
import { loadSceneByName } from '../src/engine/SceneLoader';

// Full lifecycle (awake + start)
const scene = await loadSceneByName('Level1');

// Editor preview (awake only, no gameplay)
const scene = await loadSceneByName('Level1', { skipStart: true });
// Later:
scene.start();
```

### By URL

```typescript
import { loadScene } from '../src/engine/SceneLoader';

const scene = await loadScene('Level1.json');
const scene = await loadScene('https://cdn.example.com/scenes/Level1.json');
```

### From JSON Object

```typescript
import { loadSceneFromJson } from '../src/engine/SceneLoader';

const json = { name: 'Dynamic', version: 1, settings: {}, gameObjects: [] };
const scene = await loadSceneFromJson(json);
```

## Scene Lifecycle

```
loadScene()
  └→ Create GameObjects
      └→ Create Components
          └→ Load Behaviors
              └→ awake()  — all objects exist, safe to find references
                  └→ start()  — safe to interact, begin gameplay
                      └→ Game Loop: fixedUpdate() → update() → lateUpdate()
```

## Prefabs

Prefabs are reusable GameObject templates stored in `public/prefabs/*.json`.

### Prefab Format

```json
{
  "name": "Enemy",
  "version": 1,
  "root": {
    "name": "Enemy",
    "tag": "Enemy",
    "transform": { "position": [0, 0], "rotation": 0, "scale": [1, 1] },
    "components": [
      { "type": "Sprite", "src": "./sprites/enemy.png" },
      { "type": "RigidBody2D", "bodyType": "dynamic" },
      { "type": "Collider2D", "shape": { "type": "box", "width": 32, "height": 32 } }
    ],
    "behaviors": [
      { "src": "./behaviors/EnemyAI.ts", "props": { "speed": 100 } }
    ]
  }
}
```

### Referencing Prefabs in Scenes

```json
{
  "name": "Enemy1",
  "prefab": {
    "path": "Enemy",
    "overrides": {
      "transform": { "position": [500, 200] }
    }
  }
}
```

Overrides deep-merge with the prefab template. The instance keeps its own `id` and `name`.

### Runtime Instantiation

From a behavior:

```typescript
class Spawner extends Behavior {
  *spawnWave() {
    for (let i = 0; i < 5; i++) {
      const enemy = await this.instantiate('Enemy', [100 + i * 50, 0]);
      yield* this.wait(0.5);
    }
  }

  start(): void {
    this.startCoroutine(this.spawnWave());
  }
}
```

`this.instantiate(prefabPath, position?, rotation?)` returns the new `GameObject`. The prefab's `awake()` and `start()` are called automatically.

### Direct API

```typescript
import { instantiatePrefab } from '../src/engine/SceneLoader';

const enemy = await instantiatePrefab('Enemy', scene, [200, 100], 0);
```

### Preloading

```typescript
import { preloadPrefabs, clearPrefabCache } from '../src/engine/SceneLoader';

// During a loading screen
await preloadPrefabs(['Enemy', 'Bullet', 'Explosion']);

// Clear cache when switching levels
clearPrefabCache();
```

## Finding GameObjects

From any behavior:

```typescript
// By name (returns first match)
const player = this.find('Player');

// By tag (returns all matches)
const enemies = this.findWithTag('Enemy');
```

From a scene reference:

```typescript
scene.findByName('Player');
scene.findByTag('Enemy');
```

## Destroying GameObjects

```typescript
// Destroy another object
this.destroy(enemy);

// Destroy self
this.destroy();

// Destroy after delay
this.destroyAfter(2.0);
this.destroyAfter(0.5, projectile);
```

Destroyed objects are removed at the end of the frame (`processPendingDestroy()`), so they're safe to reference for the rest of the current update cycle.

## Base URL

By default, scenes load from `/scenes/` and prefabs from `/prefabs/` (served by Vite from `public/`). To change:

```typescript
import { setBaseUrl } from '../src/engine/SceneLoader';
setBaseUrl('https://cdn.example.com/');
```
