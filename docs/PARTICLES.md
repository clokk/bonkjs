# Particle System

`Particles` is a pooled 2D particle system with **two blend channels** — NORMAL (dark) and ADD (bright) — drawn
in immediate mode onto two `Graphics` layers. It suits **modest counts of varied shapes/colors** (hundreds), not
tens-of-thousands of identical sprites (use a `ParticleContainer` for that). Drift is **velocity + drag only**
(no gravity) — a top-down-friendly default.

## Basic Usage

```typescript
import { Game, Particles } from 'bonkjs';

const game = new Game();
const { world } = await game.init({ width: 1920, height: 1080 });

const particles = new Particles(world, { zIndex: 1 });   // NORMAL at z, ADD at z+0.1

// Split for the fixed-sim / variable-render loop:
game.onFixedUpdate(() => particles.update());   // deterministic 60Hz integration
game.onUpdate(() => particles.render());        // redraw at native refresh

// Emit — only x/y are required:
particles.emit({ x: 400, y: 300, vx: 2, vy: -1, color: 0xffcc44, size: 5, life: 24, maxLife: 24 });
```

## Emit options (`Partial<Particle>`)

| Field | Default | Notes |
|-------|---------|-------|
| `x`, `y` | — (required) | spawn position |
| `vx`, `vy` | `0` | velocity (px/frame) |
| `drag` | `0.94` | velocity multiplier per frame |
| `life`, `maxLife` | `20` | remaining / total frames (set both) |
| `size` | `4` | radius (circle/ring) or half-length (line) |
| `thickness` | `1` | stroke width (line/ring) |
| `color` | `0xffffff` | tint |
| `alpha` | `1` | base alpha (multiplied by the life fade) |
| `blend` | `'add'` | `'add'` (bright) or `'normal'` (dark) channel |
| `shape` | `'circle'` | `'circle'` \| `'line'` \| `'ring'` |
| `angle` | `0` | radians — line orientation |
| `fadeIn` | `0` | frames to ramp alpha 0→full at spawn (attack ramp; 0 = snap) |

## Behavior

- **`update()`** — `x += vx; y += vy; vx *= drag; vy *= drag; life--;` and removes particles at `life <= 0`.
- **`render()`** — clears both channels and redraws each live particle. Alpha = `alpha * (life/maxLife) * fadeInRamp`.
  Per-shape animation: **circle** shrinks (`size*(0.4+0.6t)`), **ring** grows slightly while fading
  (`size*(1−0.3t)`), **line** shortens (`half = size*t`). `t` runs 1→0 over the lifetime.
- **`clear()`** empties the pool (e.g. at run-start). **`count`** is the live particle count.

## Why two channels

The NORMAL (dark) channel lets you lay a dark cavity *behind* a bright ADD burst so the bright sparks pop instead
of washing out — a contrast trick worth building presets around. Emit both in one burst (a `normal` cavity + an
`add` ring/sparks) for punchy, readable hits.
