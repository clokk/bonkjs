/**
 * Particles - a pooled 2D particle system rendered with two blend channels (NORMAL dark + ADD bright).
 *
 * Immediate-mode: every frame `render()` clears two `Graphics` and redraws the live pool, so it suits modest
 * counts of varied shapes/colors (hundreds, not tens-of-thousands of identical sprites — use a ParticleContainer
 * for that). Drift is velocity + drag only (no gravity) — a top-down-friendly default. Split for the fixed/render
 * loop: `update()` in `onFixedUpdate` (deterministic), `render()` in `onUpdate`.
 */

import { Graphics, type Container } from 'pixi.js';

export type ParticleBlend = 'add' | 'normal';
export type ParticleShape = 'circle' | 'line' | 'ring';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  drag: number;        // velocity multiplier per frame
  life: number;        // remaining frames
  maxLife: number;
  size: number;        // radius for circle/ring, half-length for line
  thickness: number;   // stroke width for line/ring
  color: number;
  alpha: number;
  blend: ParticleBlend;
  shape: ParticleShape;
  angle: number;       // radians — for line orientation
  fadeIn: number;      // frames to ramp alpha 0→full at spawn (0 = snap to full, the default). An attack ramp so
                       // bright layers don't peak on frame 0 — that hard snap reads as a flash/strobe.
}

/** Configuration for a Particles system. */
export interface ParticlesConfig {
  /** zIndex of the NORMAL channel; the ADD channel sits just above at `zIndex + 0.1`. Default 0. */
  zIndex?: number;
}

export class Particles {
  private pool: Particle[] = [];
  private normalGfx: Graphics;
  private addGfx: Graphics;

  constructor(container: Container, config: ParticlesConfig = {}) {
    const z = config.zIndex ?? 0;
    this.normalGfx = new Graphics();
    this.normalGfx.zIndex = z;
    container.addChild(this.normalGfx);

    this.addGfx = new Graphics();
    this.addGfx.zIndex = z + 0.1;
    this.addGfx.blendMode = 'add';
    container.addChild(this.addGfx);
  }

  /** Spawn one particle. Only `x`/`y` are required; the rest fall back to sensible defaults. */
  emit(opts: Partial<Particle> & { x: number; y: number }): void {
    this.pool.push({
      vx: 0, vy: 0,
      drag: 0.94,
      life: 20, maxLife: 20,
      size: 4,
      thickness: 1,
      color: 0xffffff,
      alpha: 1,
      blend: 'add',
      shape: 'circle',
      angle: 0,
      fadeIn: 0,
      ...opts,
    });
  }

  /** Advance the simulation one fixed tick (call in onFixedUpdate). Integrate velocity, apply drag, age out. */
  update(): void {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.life--;
      if (p.life <= 0) this.pool.splice(i, 1);
    }
  }

  /** Redraw the live pool into the two blend channels (call in onUpdate). */
  render(): void {
    this.normalGfx.clear();
    this.addGfx.clear();

    for (const p of this.pool) {
      const t = p.life / p.maxLife;       // 1 → 0 over lifetime
      // Attack ramp: ease alpha up over the first `fadeIn` frames so a bright layer doesn't SNAP to full on
      // frame 0 (the hard peak that reads as a flash). 0 = snap.
      const inT = p.fadeIn > 0 ? Math.min(1, (p.maxLife - p.life) / p.fadeIn) : 1;
      const alpha = p.alpha * t * inT;
      const target = p.blend === 'add' ? this.addGfx : this.normalGfx;

      if (p.shape === 'circle') {
        const r = p.size * (0.4 + 0.6 * t);  // shrink, but not all the way to 0
        target.circle(p.x, p.y, r);
        target.fill({ color: p.color, alpha });
      } else if (p.shape === 'line') {
        const half = p.size * t;
        const dx = Math.cos(p.angle) * half;
        const dy = Math.sin(p.angle) * half;
        target.moveTo(p.x - dx, p.y - dy);
        target.lineTo(p.x + dx, p.y + dy);
        target.stroke({ color: p.color, width: p.thickness, alpha });
      } else { // ring
        const r = p.size * (1 - t * 0.3);  // grow slightly while fading
        target.circle(p.x, p.y, r);
        target.stroke({ color: p.color, width: p.thickness, alpha });
      }
    }
  }

  /** Wipe the pool (e.g. at run-start, or when switching scenes). */
  clear(): void {
    this.pool.length = 0;
  }

  /** Live particle count. */
  get count(): number {
    return this.pool.length;
  }
}
