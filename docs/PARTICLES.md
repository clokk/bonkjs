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
| `grow` | `0` | px added to `size` each tick — a size velocity. `+` expands (a ring rushing outward as a traveling shockwave, a billowing puff), `−` shrinks. `size` clamps ≥0. |

## Behavior

- **`update()`** — `x += vx; y += vy; vx *= drag; vy *= drag; size += grow (clamped ≥0); life--;` and removes particles at `life <= 0`.
- **`render()`** — clears both channels and redraws each live particle. Alpha = `alpha * (life/maxLife) * fadeInRamp`.
  Per-shape animation: **circle** shrinks (`size*(0.4+0.6t)`), **ring** grows slightly while fading
  (`size*(1−0.3t)`), **line** shortens (`half = size*t`). `t` runs 1→0 over the lifetime.
- **`clear()`** empties the pool (e.g. at run-start). **`count`** is the live particle count.

## Why two channels

The NORMAL (dark) channel lets you lay a dark cavity *behind* a bright ADD burst so the bright sparks pop instead
of washing out — a contrast trick worth building presets around. Emit both in one burst (a `normal` cavity + an
`add` ring/sparks) for punchy, readable hits.

## Expanding shockwave (`grow`)

The built-in `ring` shape only expands ~30% over its life. For a **thin ring that rushes outward to a target
radius** (a shockwave, an explosion front, a pulse), give it a `grow` size-velocity — start small and let it race
out: `grow ≈ targetRadius / life`.

```typescript
// A ring that rushes from ~0 out to ~220px over 14 frames, fading as it goes:
particles.emit({ x, y, shape: 'ring', size: 6, grow: 16, thickness: 5, life: 14, maxLife: 14, drag: 1, color: 0x8fe4ff });
```

`grow` also billows circles (an expanding puff/cloud) and works with `vx/vy`, so a particle can travel *and* grow
(a wave front drifting outward). Negative `grow` shrinks (size clamps at 0).
