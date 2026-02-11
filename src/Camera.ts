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

  private container: Container;
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

  /** Update camera (call in lateUpdate). */
  update(): void {
    let targetPos = this.getTargetPosition();

    if (this.deadzone) {
      targetPos = this.applyDeadzone(targetPos);
    }

    this.currentPosition = this.smoothFollow(targetPos);

    if (this.bounds) {
      this.currentPosition = this.clampToBounds(this.currentPosition);
    }

    // Apply shake offset (does NOT modify currentPosition — follow stays smooth)
    let renderX = this.currentPosition[0];
    let renderY = this.currentPosition[1];

    if (this.shakeIntensity > 0.5) {
      renderX += (Math.random() * 2 - 1) * this.shakeIntensity;
      renderY += (Math.random() * 2 - 1) * this.shakeIntensity;

      this.shakeIntensity *= Math.pow(this.shakeDecay, Time.deltaTime * 60);

      if (this.shakeDuration > 0) {
        this.shakeElapsed += Time.deltaTime;
        if (this.shakeElapsed >= this.shakeDuration) {
          this.shakeIntensity = 0;
        }
      }
    }

    // Apply transform directly to PixiJS container
    this.container.scale.set(this.zoom, this.zoom);
    this.container.position.set(
      this.viewportWidth / 2 - renderX * this.zoom,
      this.viewportHeight / 2 - renderY * this.zoom,
    );
  }

  /** Instantly move camera to position (no smoothing). */
  snapTo(x: number, y: number): void {
    this.currentPosition = [x, y];
    this.container.scale.set(this.zoom, this.zoom);
    this.container.position.set(
      this.viewportWidth / 2 - x * this.zoom,
      this.viewportHeight / 2 - y * this.zoom,
    );
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

  private smoothFollow(target: Vector2): Vector2 {
    const t = Math.min(1, this.followSmoothing * Time.deltaTime);
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

    return [
      Math.max(b.minX + halfW, Math.min(b.maxX - halfW, pos[0])),
      Math.max(b.minY + halfH, Math.min(b.maxY - halfH, pos[1])),
    ];
  }
}
