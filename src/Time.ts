/**
 * Time management for the game loop.
 * Provides delta time, elapsed time, and time scaling.
 */

export class Time {
  /** Time since last frame in seconds */
  static deltaTime: number = 0;

  /** Unscaled time since last frame */
  static unscaledDeltaTime: number = 0;

  /** Total elapsed time since game start */
  static time: number = 0;

  /** Unscaled total elapsed time */
  static unscaledTime: number = 0;

  private static _fixedDeltaTime: number = 1 / 60;

  /** Fixed simulation timestep in seconds (default 1/60). Set via `game.init({ fixedDeltaTime })` or directly —
   *  e.g. `1 / 20` for a 20Hz sim. Must be > 0. NOT touched by {@link Time.reset}. */
  static get fixedDeltaTime(): number {
    return this._fixedDeltaTime;
  }
  static set fixedDeltaTime(value: number) {
    if (!(value > 0) || !Number.isFinite(value)) {
      throw new Error(`Time.fixedDeltaTime must be a positive finite number (got ${value})`);
    }
    this._fixedDeltaTime = value;
  }

  /** Interpolation alpha in [0, 1): how far the current render frame sits between the last fixed tick and the
   *  next (`leftover accumulator / fixedDeltaTime`). Render a sim-driven value as `lerp(prev, curr, Time.alpha)`
   *  to get smooth motion from a low-rate sim (e.g. 20Hz) on a high-refresh display. Updated by the game loop
   *  before `onUpdate` runs. */
  static alpha: number = 0;

  /** Time scale for slow-mo or pause effects */
  static timeScale: number = 1;

  /** Frame count since game start */
  static frameCount: number = 0;

  /** Current frames per second */
  static fps: number = 60;

  private static fpsAccumulator: number = 0;
  private static fpsFrameCount: number = 0;

  /** Update time values (called by Game loop) */
  static update(dt: number): void {
    this.unscaledDeltaTime = dt;
    this.deltaTime = dt * this.timeScale;
    this.unscaledTime += dt;
    this.time += this.deltaTime;
    this.frameCount++;

    // Update FPS every second
    this.fpsAccumulator += dt;
    this.fpsFrameCount++;
    if (this.fpsAccumulator >= 1) {
      this.fps = Math.round(this.fpsFrameCount / this.fpsAccumulator);
      this.fpsAccumulator = 0;
      this.fpsFrameCount = 0;
    }
  }

  /** Reset all time values */
  static reset(): void {
    this.deltaTime = 0;
    this.unscaledDeltaTime = 0;
    this.time = 0;
    this.unscaledTime = 0;
    this.timeScale = 1;
    this.alpha = 0;
    this.frameCount = 0;
    this.fps = 60;
    this.fpsAccumulator = 0;
    this.fpsFrameCount = 0;
  }
}
