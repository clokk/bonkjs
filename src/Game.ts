/**
 * Game - Central runtime class for bonkjs.
 * Creates a PixiJS Application, provides fixed/variable timestep game loop.
 */

import { Application, Container } from 'pixi.js';
import { Time } from './Time';
import { Input } from './Input';

/** Configuration for Game.init() */
export interface GameInitConfig {
  width?: number;
  height?: number;
  backgroundColor?: number;
  antialias?: boolean;
  resolution?: number;
  preference?: 'webgl' | 'webgpu';
}

/** Result of Game.init() — raw PixiJS objects */
export interface GameInitResult {
  canvas: HTMLCanvasElement;
  app: Application;
  /** World-space container (camera-followed). `sortableChildren` is ENABLED, so children layer by
   *  their `.zIndex` — NOT by add order. Default zIndex is 0; ties break by insertion order. Set a
   *  child's `.zIndex` to control its draw order (e.g. shadow 9 < player 10 < reticle 11). */
  world: Container;
  /** Screen-space UI container (above `world`, not camera-followed). `sortableChildren` is ENABLED —
   *  children layer by `.zIndex` (see `world`). */
  ui: Container;
}

type UpdateCallback = () => void;

export class Game {
  app: Application | null = null;
  world: Container | null = null;
  ui: Container | null = null;

  private fixedUpdateCallbacks: UpdateCallback[] = [];
  private updateCallbacks: UpdateCallback[] = [];
  private lateUpdateCallbacks: UpdateCallback[] = [];

  private running = false;
  private paused = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private fixedAccumulator = 0;
  private readonly maxDeltaTime = 0.25;

  /** Initialize PixiJS and input. Returns canvas + raw containers. */
  async init(config?: GameInitConfig): Promise<GameInitResult> {
    const app = new Application();
    await app.init({
      width: config?.width ?? 800,
      height: config?.height ?? 600,
      backgroundColor: config?.backgroundColor,
      antialias: config?.antialias ?? true,
      resolution: config?.resolution ?? window.devicePixelRatio,
      autoDensity: true,
      preference: config?.preference,
    });

    const canvas = app.canvas as HTMLCanvasElement;

    // Both containers sort by child `.zIndex` (not add order) — see GameInitResult docs. Consumers
    // set per-object zIndex to layer (shadow < body < weapon < reticle < HUD, etc.).
    const world = new Container();
    world.sortableChildren = true;
    app.stage.addChild(world);

    const ui = new Container();
    ui.sortableChildren = true;
    app.stage.addChild(ui);

    Input.initialize(canvas);

    this.app = app;
    this.world = world;
    this.ui = ui;

    return { canvas, app, world, ui };
  }

  /** Register a callback for fixed-timestep updates (1/60s). */
  onFixedUpdate(cb: UpdateCallback): () => void {
    this.fixedUpdateCallbacks.push(cb);
    return () => {
      const i = this.fixedUpdateCallbacks.indexOf(cb);
      if (i !== -1) this.fixedUpdateCallbacks.splice(i, 1);
    };
  }

  /** Register a callback for per-frame updates. */
  onUpdate(cb: UpdateCallback): () => void {
    this.updateCallbacks.push(cb);
    return () => {
      const i = this.updateCallbacks.indexOf(cb);
      if (i !== -1) this.updateCallbacks.splice(i, 1);
    };
  }

  /** Register a callback for late updates (after main update). */
  onLateUpdate(cb: UpdateCallback): () => void {
    this.lateUpdateCallbacks.push(cb);
    return () => {
      const i = this.lateUpdateCallbacks.indexOf(cb);
      if (i !== -1) this.lateUpdateCallbacks.splice(i, 1);
    };
  }

  /** Start the game loop. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.fixedAccumulator = 0;
    this.loop();
  }

  /** Stop the game loop. */
  stop(): void {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /** Pause the game (loop continues but updates are skipped). */
  pause(): void {
    this.paused = true;
  }

  /** Resume a paused game. */
  resume(): void {
    if (this.paused) {
      this.paused = false;
      this.lastTime = performance.now();
    }
  }

  /** Clean up all resources. */
  destroy(): void {
    this.stop();
    Input.destroy();
    this.app?.destroy(true);
    this.app = null;
    this.world = null;
    this.ui = null;
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamp to prevent spiral of death
    if (dt > this.maxDeltaTime) dt = this.maxDeltaTime;

    if (!this.paused) {
      Time.update(dt);

      // Fixed timestep loop
      this.fixedAccumulator += dt;
      while (this.fixedAccumulator >= Time.fixedDeltaTime) {
        this.fixedAccumulator -= Time.fixedDeltaTime;
        for (const cb of this.fixedUpdateCallbacks) cb();
      }

      // Variable timestep update
      for (const cb of this.updateCallbacks) cb();

      // Late update
      for (const cb of this.lateUpdateCallbacks) cb();

      // Clear per-frame input state
      Input.update();
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };
}
