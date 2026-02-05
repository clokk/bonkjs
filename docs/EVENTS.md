# Event System

Bonk Engine provides an EventEmitter for decoupled communication between behaviors and systems.

## EventEmitter

Every `Behavior` has a local `this.events` emitter. There's also a global `GlobalEvents` bus.

```typescript
import { EventEmitter, GlobalEvents, EngineEvents } from '../src/engine';
```

### Subscribe

```typescript
// Subscribe (returns unsubscribe function)
const unsub = emitter.on('playerDied', (data) => {
  console.log('Player died at', data.position);
});

// One-time listener
emitter.once('levelComplete', () => {
  loadNextLevel();
});

// Unsubscribe
unsub();
// or
emitter.off('playerDied', callback);
```

### Emit

```typescript
emitter.emit('playerDied', { position: [100, 200] });
emitter.emit('scoreChanged', { score: 500 });
```

### Cleanup

```typescript
emitter.removeAllListeners();        // Remove all
emitter.removeAllListeners('score'); // Remove all for one event
emitter.hasListeners('score');       // Check if anyone's listening
```

## Global Events

`GlobalEvents` is a singleton for game-wide events:

```typescript
// In one behavior
GlobalEvents.emit('coin-collected', { value: 10 });

// In another behavior
GlobalEvents.on('coin-collected', ({ value }) => {
  this.score += value;
});
```

## Built-in Engine Events

The engine emits these automatically via `GlobalEvents`:

| Event | Data | When |
|-------|------|------|
| `EngineEvents.SCENE_LOAD_START` | `{ url }` or `{ name }` | Scene begins loading |
| `EngineEvents.SCENE_LOAD_END` | `{ name, scene }` | Scene finished loading |
| `EngineEvents.SCENE_UNLOAD` | | Scene unloaded |
| `EngineEvents.PAUSE` | | Game paused |
| `EngineEvents.RESUME` | | Game resumed |
| `EngineEvents.COLLISION_ENTER` | | Physics collision starts |
| `EngineEvents.COLLISION_EXIT` | | Physics collision ends |
| `EngineEvents.TRIGGER_ENTER` | | Trigger area entered |
| `EngineEvents.TRIGGER_EXIT` | | Trigger area exited |

```typescript
GlobalEvents.on(EngineEvents.SCENE_LOAD_END, ({ name, scene }) => {
  console.log(`Loaded scene: ${name}`);
});
```

## Behavior-Local Events

Each behavior's `this.events` emitter is scoped to that instance. Useful for component-to-component communication on the same GameObject:

```typescript
class Health extends Behavior {
  hp: number = 100;

  takeDamage(amount: number): void {
    this.hp -= amount;
    this.events.emit('damaged', { hp: this.hp, amount });

    if (this.hp <= 0) {
      this.events.emit('died');
    }
  }
}

class DeathEffect extends Behavior {
  start(): void {
    const health = this.getBehavior(Health);
    health?.events.on('died', () => {
      // Play death animation, spawn particles, etc.
      this.destroyAfter(1);
    });
  }
}
```

## Cross-Behavior Communication Patterns

**Direct reference** (tight coupling, fine for small games):
```typescript
const enemy = this.find('Boss');
const health = enemy?.getBehavior(Health);
health?.takeDamage(50);
```

**Events** (loose coupling, scales better):
```typescript
// Publisher doesn't know about subscribers
GlobalEvents.emit('enemy-killed', { type: 'boss', position: [100, 200] });

// Multiple subscribers react independently
// ScoreManager, ParticleSpawner, QuestTracker, etc.
```

**When to use which:**
- Direct reference: One behavior calling another it knows about (player -> weapon)
- Local events: Components on the same GameObject reacting to state changes
- Global events: Game-wide announcements that multiple unrelated systems care about
