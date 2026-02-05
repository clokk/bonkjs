# Animated Sprites

Bonk Engine supports sprite sheet animation through the `AnimatedSprite` component.

## Basic Usage

Add an AnimatedSprite component to a GameObject:

```json
{
  "name": "Player",
  "transform": { "position": [400, 300], "rotation": 0, "scale": [1, 1] },
  "components": [{
    "type": "AnimatedSprite",
    "src": "./sprites/player-sheet.png",
    "frameWidth": 32,
    "frameHeight": 32,
    "animations": {
      "idle": { "frames": [0, 1, 2, 3], "frameRate": 8, "loop": true },
      "run": { "frames": [4, 5, 6, 7, 8, 9], "frameRate": 12, "loop": true },
      "jump": { "frames": [10, 11], "frameRate": 10, "loop": false }
    },
    "defaultAnimation": "idle"
  }]
}
```

## Sprite Sheet Layout

Frames are numbered left-to-right, top-to-bottom:

```
┌───────┬───────┬───────┬───────┐
│   0   │   1   │   2   │   3   │  ← Row 0
├───────┼───────┼───────┼───────┤
│   4   │   5   │   6   │   7   │  ← Row 1
├───────┼───────┼───────┼───────┤
│   8   │   9   │  10   │  11   │  ← Row 2
└───────┴───────┴───────┴───────┘
```

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `src` | `string` | - | Path to sprite sheet image |
| `frameWidth` | `number` | `32` | Width of each frame in pixels |
| `frameHeight` | `number` | `32` | Height of each frame in pixels |
| `animations` | `object` | - | Named animation definitions (see below) |
| `defaultAnimation` | `string` | - | Animation to play on start |
| `anchor` | `[x, y]` | `[0.5, 0.5]` | Anchor point (0-1) |

### Animation Definition

Each animation is an object with:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `frames` | `number[]` | - | Array of frame indices from the sprite sheet |
| `frameRate` | `number` | `12` | Frames per second |
| `loop` | `boolean` | `true` | Whether to loop or play once |

## Runtime Control

Control animations from behavior scripts:

```typescript
// Get the component
const anim = this.gameObject.getComponent(AnimatedSpriteComponent);

// Switch animations
anim.playAnimation('run');
anim.playAnimation('attack', true); // Force restart even if already playing

// Pause/resume
anim.stop();
anim.play();

// Jump to specific frame
anim.gotoFrame(0);       // Show frame, stay paused
anim.gotoFrame(3, true); // Show frame and continue playing

// Query state
anim.getCurrentAnimation();  // 'run'
anim.isAnimationPlaying();   // true
anim.hasAnimation('jump');   // true
anim.getAnimationNames();    // ['idle', 'run', 'jump']
```

## Callbacks

React to animation events:

```typescript
const anim = this.gameObject.getComponent(AnimatedSpriteComponent);

// Called when a non-looping animation finishes
anim.onAnimationComplete = (name) => {
  if (name === 'attack') {
    anim.playAnimation('idle');
  }
};

// Called every time the frame changes
anim.onFrameChange = (frameIndex, animName) => {
  if (animName === 'walk' && frameIndex === 2) {
    // Play footstep sound on specific frame
    playSound('footstep');
  }
};
```

## Frame Rate Guidelines

| Speed | FPS | Use Case |
|-------|-----|----------|
| Slow | 6-8 | Idle, breathing, subtle effects |
| Normal | 10-12 | Walking, basic actions |
| Fast | 14-16 | Running, quick movements |
| Very Fast | 18-24 | Combat, impacts, rapid actions |

## Advanced Frame Sequences

The `frames` array gives you full control over playback order:

```json
"animations": {
  "walk": { "frames": [0, 1, 2, 3], "frameRate": 12, "loop": true },
  "breathe": { "frames": [0, 1, 2, 1], "frameRate": 6, "loop": true },
  "dash": { "frames": [0, 2, 4, 6], "frameRate": 16, "loop": false },
  "charge": { "frames": [0, 0, 0, 1, 2, 3], "frameRate": 12, "loop": false },
  "rewind": { "frames": [7, 6, 5, 4, 3, 2, 1, 0], "frameRate": 12, "loop": false }
}
```

## Flipping Sprites

Use `flipX` and `flipY` to mirror the sprite:

```json
{
  "type": "AnimatedSprite",
  "src": "./sprites/player.png",
  "frameWidth": 32,
  "frameHeight": 32,
  "animations": { "walk": { "frames": [0, 1, 2, 3], "frameRate": 12, "loop": true } },
  "flipX": true
}
```

Or toggle at runtime:

```typescript
// In behavior script
if (velocity.x < 0) {
  anim.flipX = true;  // Moving left, face left
} else if (velocity.x > 0) {
  anim.flipX = false; // Moving right, face right
}
```

## Creating Sprite Sheets

Sprite sheets should be:
- A single PNG image
- Frames arranged in a grid (all same size)
- No padding between frames
- Power-of-2 dimensions recommended (64, 128, 256, etc.)

Tools for creating sprite sheets:
- **Aseprite** - Industry-standard pixel art editor
- **TexturePacker** - Automatic sprite sheet generation
- **Piskel** - Free online pixel art editor
- **LibreSprite** - Free Aseprite fork

## Example: Player Character

Complete player setup with multiple animations:

```json
{
  "name": "Player",
  "tag": "Player",
  "transform": { "position": [400, 300], "rotation": 0, "scale": [1, 1] },
  "components": [{
    "type": "AnimatedSprite",
    "src": "./sprites/hero-sheet.png",
    "frameWidth": 48,
    "frameHeight": 64,
    "animations": {
      "idle": { "frames": [0, 1, 2, 3], "frameRate": 8, "loop": true },
      "run": { "frames": [8, 9, 10, 11, 12, 13], "frameRate": 12, "loop": true },
      "jump": { "frames": [16, 17], "frameRate": 10, "loop": false },
      "fall": { "frames": [18], "frameRate": 1, "loop": false },
      "attack": { "frames": [24, 25, 26, 27], "frameRate": 16, "loop": false }
    },
    "defaultAnimation": "idle",
    "anchor": [0.5, 1]
  }],
  "behaviors": [{ "src": "./behaviors/PlayerController.ts" }]
}
```

With controller behavior:

```typescript
// PlayerController.ts
update() {
  const anim = this.gameObject.getComponent(AnimatedSpriteComponent);

  if (this.isGrounded) {
    if (Math.abs(this.velocity.x) > 10) {
      anim.playAnimation('run');
      anim.flipX = this.velocity.x < 0;
    } else {
      anim.playAnimation('idle');
    }
  } else {
    if (this.velocity.y < 0) {
      anim.playAnimation('jump');
    } else {
      anim.playAnimation('fall');
    }
  }
}
```
