/**
 * Camera - Standalone 2D camera operating directly on a PixiJS Container.
 */

import type { Container } from 'pixi.js';
import { Time } from './Time';
import type { Vector2 } from './types';

/** Camera configuration */
export interface CameraConfig {
  /** Viewport size (needed for bounds clamping) */
  viewport: { width: number; height: number };
  /** Zoom level (1 = 100%) */
  zoom?: number;
  /** Follow speed (higher = tighter follow) */
  followSmoothing?: number;
  /** Offset from target position */
  offset?: Vector2;
  /** World bounds to constrain camera */
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  /** Deadzone - area target can move without camera moving */
  deadzone?: { width: number; height: number };
  /** Snap the final container position to whole PHYSICAL pixels (kills sub-pixel shimmer of static geometry
   *  under camera shake). Uses {@link Camera.resolution} as the device-pixel density. Default off. */
  pixelSnap?: boolean;
}

export class Camera {
  /** Zoom level */
  zoom: number;

  /** Follow speed */
  followSmoothing: number;

  /** Offset from target */
  offset: Vector2;

  /** World bounds */
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };

  /** Deadzone */
  deadzone?: { width: number; height: number };

  /** Device-pixel density used by {@link CameraConfig.pixelSnap} (1 = CSS pixels). Set this to the renderer's
   *  resolution when it varies (e.g. bonkjs `scaleMode: 'fit'` — feed it from `game.onResize`). */
  resolution = 1;

  private container: Container;
  private pixelSnap: boolean;
  private viewportWidth: number;
  private viewportHeight: number;
  private targetFn: (() => Vector2) | null = null;
  private currentPosition: Vector2 = [0, 0];

  // Screen shake state
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeElapsed = 0;
  private shakeDecay = 0.9;

  constructor(worldContainer: Container, config: CameraConfig) {
    this.container = worldContainer;
    this.viewportWidth = config.viewport.width;
    this.viewportHeight = config.viewport.height;
    this.zoom = config.zoom ?? 1;
    this.followSmoothing = config.followSmoothing ?? 5;
    this.offset = config.offset ? [...config.offset] : [0, 0];
    if (config.bounds) this.bounds = { ...config.bounds };
    if (config.deadzone) this.deadzone = { ...config.deadzone };
    this.pixelSnap = config.pixelSnap ?? false;
  }

  /**
   * Set a follow target. Takes a function that returns a position,
   * avoiding coupling to any specific entity type.
   * First call snaps immediately; subsequent calls just update the target
   * (smooth follow in update() handles transitions).
   */
  follow(targetFn: () => Vector2): void {
    const shouldSnap = this.targetFn === null;
    this.targetFn = targetFn;
    if (shouldSnap) {
      const pos = targetFn();
      this.currentPosition = [pos[0] + this.offset[0], pos[1] + this.offset[1]];
    }
  }

  /** Stop following. */
  unfollow(): void {
    this.targetFn = null;
  }

  /** Apply screen shake with intensity that decays over time. */
  shake(intensity: number, config?: { duration?: number; decay?: number }): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = config?.duration ?? 0;
    this.shakeElapsed = 0;
    this.shakeDecay = config?.decay ?? 0.9;
  }

  /** Stop any active screen shake immediately. */
  stopShake(): void {
    this.shakeIntensity = 0;
  }

  /**
   * Combined sim+render step (call once per frame, e.g. in lateUpdate). Smooths with `Time.deltaTime` and
   * writes the container. Back-compatible with pre-0.5.6 usage. For the refresh-rate-independent split (smooth
   * at a fixed sim rate, write + pixel-snap at render rate), use {@link Camera.tick} + {@link Camera.apply}.
   */
  update(): void {
    this.computeFollow(Time.deltaTime);
    this.apply();
  }

  /** Sim-rate follow compute (call in fixedUpdate). Advances the smoothed follow position deterministically at
   *  `Time.fixedDeltaTime` and decays shake; does NOT write the container. Pair with {@link Camera.apply}. */
  tick(): void {
    this.computeFollow(Time.fixedDeltaTime);
  }

  /** Render-rate transform write (call in update/lateUpdate). Composes shake — the internal {@link Camera.shake}
   *  jitter plus the optional external `offsetX/offsetY` (screen-space, e.g. a game-owned shake module) — and
   *  writes the container transform, pixel-snapped when `pixelSnap` is enabled. */
  apply(offsetX = 0, offsetY = 0): void {
    let sx = offsetX;
    let sy = offsetY;
    if (this.shakeIntensity > 0.5) {
      sx += (Math.random() * 2 - 1) * this.shakeIntensity;
      sy += (Math.random() * 2 - 1) * this.shakeIntensity;
    }
    this.writeTransform(
      this.viewportWidth / 2 - this.currentPosition[0] * this.zoom + sx,
      this.viewportHeight / 2 - this.currentPosition[1] * this.zoom + sy,
    );
  }

  /** Instantly move camera to position (no smoothing); clamps to bounds and writes the container. */
  snapTo(x: number, y: number): void {
    this.currentPosition = [x, y];
    if (this.bounds) this.currentPosition = this.clampToBounds(this.currentPosition);
    this.writeTransform(
      this.viewportWidth / 2 - this.currentPosition[0] * this.zoom,
      this.viewportHeight / 2 - this.currentPosition[1] * this.zoom,
    );
  }

  /** Shared follow math for {@link Camera.tick} (fixed dt) and {@link Camera.update} (frame dt). */
  private computeFollow(dt: number): void {
    let targetPos = this.getTargetPosition();
    if (this.deadzone) targetPos = this.applyDeadzone(targetPos);
    this.currentPosition = this.smoothFollow(targetPos, dt);
    if (this.bounds) this.currentPosition = this.clampToBounds(this.currentPosition);

    // Decay shake at the same rate the position advances (does NOT move currentPosition — follow stays smooth;
    // the random jitter is applied in apply()).
    if (this.shakeIntensity > 0.5) {
      this.shakeIntensity *= Math.pow(this.shakeDecay, dt * 60);
      if (this.shakeDuration > 0) {
        this.shakeElapsed += dt;
        if (this.shakeElapsed >= this.shakeDuration) this.shakeIntensity = 0;
      }
    }
  }

  /** Write the (optionally pixel-snapped) screen position to the container. */
  private writeTransform(px: number, py: number): void {
    if (this.pixelSnap && this.resolution > 0) {
      px = Math.round(px * this.resolution) / this.resolution;
      py = Math.round(py * this.resolution) / this.resolution;
    }
    this.container.scale.set(this.zoom, this.zoom);
    this.container.position.set(px, py);
  }

  /** Get current camera position. */
  getPosition(): Vector2 {
    return [...this.currentPosition] as Vector2;
  }

  /** Convert screen/canvas coordinates to world coordinates. */
  screenToWorld(screenX: number, screenY: number): Vector2 {
    return [
      (screenX - this.viewportWidth / 2) / this.zoom + this.currentPosition[0],
      (screenY - this.viewportHeight / 2) / this.zoom + this.currentPosition[1],
    ];
  }

  private getTargetPosition(): Vector2 {
    if (this.targetFn) {
      const pos = this.targetFn();
      return [pos[0] + this.offset[0], pos[1] + this.offset[1]];
    }
    return [...this.currentPosition] as Vector2;
  }

  private smoothFollow(target: Vector2, dt: number): Vector2 {
    const t = Math.min(1, this.followSmoothing * dt);
    return [
      this.currentPosition[0] + (target[0] - this.currentPosition[0]) * t,
      this.currentPosition[1] + (target[1] - this.currentPosition[1]) * t,
    ];
  }

  private applyDeadzone(target: Vector2): Vector2 {
    const dz = this.deadzone!;
    const halfW = dz.width / 2;
    const halfH = dz.height / 2;

    let [tx, ty] = target;
    const [cx, cy] = this.currentPosition;

    if (tx < cx - halfW) tx = tx + halfW;
    else if (tx > cx + halfW) tx = tx - halfW;
    else tx = cx;

    if (ty < cy - halfH) ty = ty + halfH;
    else if (ty > cy + halfH) ty = ty - halfH;
    else ty = cy;

    return [tx, ty];
  }

  private clampToBounds(pos: Vector2): Vector2 {
    const b = this.bounds!;
    const halfW = (this.viewportWidth / 2) / this.zoom;
    const halfH = (this.viewportHeight / 2) / this.zoom;

    // When viewport is wider/taller than world bounds, center instead of
    // pinning to one edge. This happens with adaptive canvas widths where
    // the visible area exceeds the game world — gutters show on both sides.
    const clampedX = (b.minX + halfW > b.maxX - halfW)
      ? (b.minX + b.maxX) / 2
      : Math.max(b.minX + halfW, Math.min(b.maxX - halfW, pos[0]));

    const clampedY = (b.minY + halfH > b.maxY - halfH)
      ? (b.minY + b.maxY) / 2
      : Math.max(b.minY + halfH, Math.min(b.maxY - halfH, pos[1]));

    return [clampedX, clampedY];
  }
}
