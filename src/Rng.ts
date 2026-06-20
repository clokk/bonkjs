/**
 * Rng - a small, fast, seedable pseudo-random generator (mulberry32). Deterministic: the same seed always
 * produces the same stream, so it's the building block for reproducible procedural generation, shareable
 * seeds, replays, and seeded tests.
 *
 * NOTE: a seeded Rng makes you reproducible *within one build*. True cross-client (lockstep) determinism also
 * needs floating-point / iteration-order / fixed-clock discipline — that's a game-level concern. bonkjs ships
 * the brick, not turnkey determinism.
 */
export class Rng {
  /** The original seed — log/share it to reproduce this stream. */
  readonly seed: number;
  private s: number;

  /** Seed the generator. Omit `seed` to auto-seed from `Math.random()` (still capturable via `.seed`). */
  constructor(seed?: number) {
    this.seed = (seed ?? Math.floor(Math.random() * 0x100000000)) >>> 0;
    this.s = this.seed;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max] — INCLUSIVE of both ends. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** A uniformly-random element of `arr`. */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** True with probability `p` (default 0.5). */
  bool(p = 0.5): boolean {
    return this.next() < p;
  }

  /** In-place Fisher-Yates shuffle; returns the same array. */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Derive an independent child stream (e.g. a per-subsystem or per-entity Rng) without disturbing this one's
   *  sequence beyond drawing the child's seed. */
  fork(): Rng {
    return new Rng(this.int(0, 0xffffffff));
  }

  /** Current stream position — capture it to resume the exact sequence later (replays / save-states). */
  get state(): number {
    return this.s;
  }
  set state(v: number) {
    this.s = v | 0;
  }
}
