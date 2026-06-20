/**
 * Game - Central runtime class for bonkjs.
 * Creates a PixiJS Application, provides fixed/variable timestep game loop.
 */

import { Application, Container } from 'pixi.js';
import { Time } from './Time';
import { Input } from './Input';

/** Configuration for Game.init() */
export interface GameInitConfig {
  /** Logical/design width — the coordinate space the stage draws in (NOT necessarily the pixel size). */
  width?: number;
  /** Logical/design height. */
  height?: number;
  backgroundColor?: number;
  antialias?: boolean;
  resolution?: number;
  preference?: 'webgl' | 'webgpu';
  /**
   * How the canvas maps the design size (`width`×`height`) onto the display.
   * - `'fixed'` (default): the canvas is created once at the design size × `resolution` and never
   *   resized — the host page is responsible for any CSS scaling. Preserves pre-0.5.5 behavior.
   * - `'fit'`: keep the design size as the constant LOGICAL coordinate space (camera, UI math, hit-tests
   *   all stay in design units), but letterbox-contain the canvas into `resizeTo` and render at the
   *   display's true physical pixel density (crisp on 4K, native on a Steam Deck). Re-fits on window
   *   resize and devicePixelRatio change. Use {@link Game.onResize} to react.
   */
  scaleMode?: 'fit' | 'fixed';
  /** `scaleMode: 'fit'` only — element (or window) whose box the canvas contain-fits into. Default `window`. */
  resizeTo?: HTMLElement | Window;
  /** `scaleMode: 'fit'` only — optional cap on the renderer resolution (backing-store density), for perf on
   *  very large HiDPI displays. Default: uncapped. */
  maxResolution?: number;
}

/** Payload passed to {@link Game.onResize} callbacks after each fit pass (`scaleMode: 'fit'`). */
export interface ResizeInfo {
  /** Canvas CSS width in px (the on-screen letterboxed size). */
  cssWidth: number;
  /** Canvas CSS height in px. */
  cssHeight: number;
  /** Renderer resolution (backing-store pixels per logical unit) chosen for this fit. */
  resolution: number;
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
  private resizeCallbacks: ((info: ResizeInfo) => void)[] = [];

  // scaleMode: 'fit' state — the constant logical/design size, the fit target, and the listener teardown.
  private scaleMode: 'fit' | 'fixed' = 'fixed';
  private designWidth = 0;
  private designHeight = 0;
  private resizeTarget: HTMLElement | Window = typeof window !== 'undefined' ? window : (undefined as never);
  private maxResolution = Infinity;
  private fitTeardown: (() => void)[] = [];
  private fitRafId: number | null = null;

  private running = false;
  private paused = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private fixedAccumulator = 0;
  private readonly maxDeltaTime = 0.25;

  /** Initialize PixiJS and input. Returns canvas + raw containers. */
  async init(config?: GameInitConfig): Promise<GameInitResult> {
    const width = config?.width ?? 800;
    const height = config?.height ?? 600;
    this.scaleMode = config?.scaleMode ?? 'fixed';
    const fit = this.scaleMode === 'fit';

    const app = new Application();
    await app.init({
      width,
      height,
      backgroundColor: config?.backgroundColor,
      antialias: config?.antialias ?? true,
      resolution: config?.resolution ?? window.devicePixelRatio,
      // 'fit' manages the canvas CSS box itself (applyFit), so autoDensity must be OFF —
      // otherwise Pixi keeps overwriting style.width/height with the logical size and fights us.
      autoDensity: !fit,
      preference: config?.preference,
    });

    const canvas = app.canvas as HTMLCanvasElement;

    if (fit) {
      this.designWidth = width;
      this.designHeight = height;
      this.resizeTarget = config?.resizeTo ?? window;
      this.maxResolution = config?.maxResolution ?? Infinity;
      this.app = app;            // applyFit reads this.app.renderer
      this.applyFit();           // size the canvas correctly before the first frame (no flash)
      this.installFitListeners();
    }

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

  /** Register a callback fired after every `scaleMode: 'fit'` re-fit (resize / DPR change), with the new
   *  CSS size + renderer resolution. No-op under `scaleMode: 'fixed'`. Returns an unsubscribe. */
  onResize(cb: (info: ResizeInfo) => void): () => void {
    this.resizeCallbacks.push(cb);
    return () => {
      const i = this.resizeCallbacks.indexOf(cb);
      if (i !== -1) this.resizeCallbacks.splice(i, 1);
    };
  }

  /** Contain-fit the canvas into the resize target and render at the display's physical pixel density.
   *  Keeps the logical/design coordinate space constant (camera + UI math are unchanged); only the
   *  renderer resolution and the canvas CSS box change. `scaleMode: 'fit'` only. */
  private applyFit(): void {
    if (!this.app) return;
    const target = this.resizeTarget;
    const targetW = target instanceof Window ? target.innerWidth : target.clientWidth;
    const targetH = target instanceof Window ? target.innerHeight : target.clientHeight;
    if (targetW <= 0 || targetH <= 0) return;   // detached / zero-size element — skip (will re-fit on resize)

    // Contain-fit: largest design-aspect box that fits the target. Letterboxes (page bg shows in the bars).
    const scale = Math.min(targetW / this.designWidth, targetH / this.designHeight);
    const dpr = window.devicePixelRatio || 1;
    const resolution = Math.min(scale * dpr, this.maxResolution);
    const cssW = this.designWidth * scale;
    const cssH = this.designHeight * scale;

    // Logical size stays design size; backing store becomes designW*resolution = cssW*dpr → 1:1 physical pixels.
    this.app.renderer.resize(this.designWidth, this.designHeight, resolution);
    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const info: ResizeInfo = { cssWidth: cssW, cssHeight: cssH, resolution };
    for (const cb of this.resizeCallbacks) cb(info);
  }

  /** Install the resize + devicePixelRatio listeners that drive `applyFit()`, coalesced through one rAF so a
   *  burst of resize events runs the fit once. A DPR-change watcher is needed because window 'resize' does NOT
   *  fire when a window is dragged between monitors of different pixel density. */
  private installFitListeners(): void {
    const schedule = () => {
      if (this.fitRafId !== null) return;
      this.fitRafId = requestAnimationFrame(() => {
        this.fitRafId = null;
        this.applyFit();
      });
    };

    window.addEventListener('resize', schedule);
    this.fitTeardown.push(() => window.removeEventListener('resize', schedule));

    // Re-arm a matchMedia query at the current DPR; when it changes (monitor swap / OS zoom), re-fit and re-arm.
    let dprMql: MediaQueryList | null = null;
    const armDpr = () => {
      dprMql?.removeEventListener('change', onDprChange);
      const dpr = window.devicePixelRatio || 1;
      dprMql = window.matchMedia(`(resolution: ${dpr}dppx)`);
      dprMql.addEventListener('change', onDprChange);
    };
    const onDprChange = () => { schedule(); armDpr(); };
    armDpr();
    this.fitTeardown.push(() => dprMql?.removeEventListener('change', onDprChange));
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
    if (this.fitRafId !== null) { cancelAnimationFrame(this.fitRafId); this.fitRafId = null; }
    for (const teardown of this.fitTeardown) teardown();
    this.fitTeardown = [];
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
