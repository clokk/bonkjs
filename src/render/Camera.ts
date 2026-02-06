/**
 * Camera - Standalone 2D camera, decoupled from any entity system.
 */

import type { Renderer } from './Renderer';
import { Time } from '../runtime/Time';
import type { Vector2 } from '../types';

/** Camera configuration */
export interface CameraConfig {
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

  private renderer: Renderer;
  private targetFn: (() => Vector2) | null = null;
  private currentPosition: Vector2 = [0, 0];

  // Screen shake state
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeElapsed = 0;
  private shakeDecay = 0.9;

  constructor(renderer: Renderer, config?: CameraConfig) {
    this.renderer = renderer;
    this.zoom = config?.zoom ?? 1;
    this.followSmoothing = config?.followSmoothing ?? 5;
    this.offset = config?.offset ? [...config.offset] : [0, 0];
    if (config?.bounds) this.bounds = { ...config.bounds };
    if (config?.deadzone) this.deadzone = { ...config.deadzone };
  }

  /**
   * Set a follow target. Takes a function that returns a position,
   * avoiding coupling to any specific entity type.
   */
  follow(targetFn: () => Vector2): void {
    this.targetFn = targetFn;
    // Snap to target immediately
    const pos = targetFn();
    this.currentPosition = [pos[0] + this.offset[0], pos[1] + this.offset[1]];
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

      this.shakeIntensity *= this.shakeDecay;

      if (this.shakeDuration > 0) {
        this.shakeElapsed += Time.deltaTime;
        if (this.shakeElapsed >= this.shakeDuration) {
          this.shakeIntensity = 0;
        }
      }
    }

    this.renderer.setCameraPosition(renderX, renderY);
    this.renderer.setCameraZoom(this.zoom);
  }

  /** Instantly move camera to position (no smoothing). */
  snapTo(x: number, y: number): void {
    this.currentPosition = [x, y];
    this.renderer.setCameraPosition(x, y);
    this.renderer.setCameraZoom(this.zoom);
  }

  /** Get current camera position. */
  getPosition(): Vector2 {
    return [...this.currentPosition] as Vector2;
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
    const viewport = this.renderer.getViewportSize();
    const halfW = (viewport.width / 2) / this.zoom;
    const halfH = (viewport.height / 2) / this.zoom;

    return [
      Math.max(b.minX + halfW, Math.min(b.maxX - halfW, pos[0])),
      Math.max(b.minY + halfH, Math.min(b.maxY - halfH, pos[1])),
    ];
  }
}
