/**
 * Base Behavior class for game logic.
 * Behaviors are scripts that control GameObject behavior.
 */

import type { GameObject } from './GameObject';
import type { Component } from './Component';
import type { Transform } from './Transform';
import {
  Scheduler,
  type CoroutineHandle,
  type YieldInstruction,
  wait,
  waitFrames,
  waitUntil,
} from './Scheduler';
import { Time } from './Time';
import { Input } from './Input';
import { EventEmitter } from './EventSystem';
import type { Vector2 } from './types';
import type { ContactInfo } from './Scene';

// Forward declaration to avoid circular dependency
type RigidBody2DComponent = import('./components/RigidBody2DComponent').RigidBody2DComponent;

export abstract class Behavior {
  /** The GameObject this behavior is attached to */
  readonly gameObject: GameObject;

  /** Whether this behavior is enabled */
  enabled: boolean = true;

  /** Local event emitter for this behavior */
  readonly events: EventEmitter = new EventEmitter();

  /** Per-behavior scheduler for coroutines */
  private scheduler: Scheduler = new Scheduler();

  /** Active coroutine handles */
  private coroutines: CoroutineHandle[] = [];

  constructor(gameObject: GameObject) {
    this.gameObject = gameObject;
  }

  /** Quick access to transform */
  get transform(): Transform {
    return this.gameObject.transform;
  }

  /** Quick access to RigidBody2D component */
  get rigidbody(): RigidBody2DComponent | undefined {
    // Find by type string to avoid circular dependency
    const component = this.gameObject
      .getAllComponents()
      .find((c) => c.type === 'RigidBody2D');
    return component as RigidBody2DComponent | undefined;
  }

  // ==================== Lifecycle Hooks ====================

  /**
   * Called once when the behavior is first created.
   * Use for initialization that doesn't depend on other behaviors.
   */
  awake(): void {}

  /**
   * Called once after all behaviors have been created.
   * Use for initialization that depends on other components/behaviors.
   */
  start(): void {}

  /**
   * Called every frame.
   * Use for game logic, input handling, etc.
   */
  update(): void {}

  /**
   * Called at fixed timestep (1/60s).
   * Use for physics-related updates.
   */
  fixedUpdate(): void {}

  /**
   * Called every frame after update().
   * Use for camera follow, UI updates, etc.
   */
  lateUpdate(): void {}

  /**
   * Called when the behavior is destroyed.
   * Use for cleanup.
   */
  onDestroy(): void {}

  // ==================== Collision Callbacks ====================

  /**
   * Called when this object starts colliding with another.
   * Requires a RigidBody2D and Collider2D on this GameObject.
   */
  onCollisionEnter?(other: GameObject, contact: ContactInfo): void;

  /**
   * Called when this object stops colliding with another.
   */
  onCollisionExit?(other: GameObject): void;

  /**
   * Called when this object enters a trigger collider.
   * The other object must have isTrigger: true on its Collider2D.
   */
  onTriggerEnter?(other: GameObject): void;

  /**
   * Called when this object exits a trigger collider.
   */
  onTriggerExit?(other: GameObject): void;

  // ==================== Coroutines ====================

  /**
   * Start a coroutine.
   * Coroutines run in sync with the game loop and respect Time.timeScale.
   *
   * @example
   * *fadeOut() {
   *   for (let i = 1; i >= 0; i -= 0.1) {
   *     this.sprite.alpha = i;
   *     yield* this.wait(0.1);
   *   }
   * }
   *
   * start() {
   *   this.startCoroutine(this.fadeOut());
   * }
   */
  startCoroutine(
    generator: Generator<YieldInstruction, void, void>
  ): CoroutineHandle {
    const handle = this.scheduler.start(generator);
    this.coroutines.push(handle);
    return handle;
  }

  /** Stop a specific coroutine */
  stopCoroutine(handle: CoroutineHandle): void {
    handle.cancel();
    this.coroutines = this.coroutines.filter((h) => h !== handle);
  }

  /** Stop all coroutines on this behavior */
  stopAllCoroutines(): void {
    this.scheduler.cancelAll();
    this.coroutines = [];
  }

  /** Update coroutines (called by engine) */
  updateCoroutines(): void {
    this.scheduler.update();
    // Clean up completed coroutines
    this.coroutines = this.coroutines.filter((h) => h.isRunning);
  }

  // ==================== Coroutine Helpers ====================

  /** Wait for seconds (respects Time.timeScale) */
  *wait(seconds: number): Generator<YieldInstruction, void, void> {
    yield wait(seconds);
  }

  /** Wait for frames */
  *waitFrames(count: number): Generator<YieldInstruction, void, void> {
    yield waitFrames(count);
  }

  /** Wait until condition is true */
  *waitUntil(
    predicate: () => boolean
  ): Generator<YieldInstruction, void, void> {
    yield waitUntil(predicate);
  }

  // ==================== Utility Methods ====================

  /** Get a component on the same GameObject */
  getComponent<T extends Component>(type: new (go: GameObject) => T): T | undefined {
    return this.gameObject.getComponent(type);
  }

  /** Get a behavior on the same GameObject */
  getBehavior<T extends Behavior>(type: new (go: GameObject) => T): T | undefined {
    return this.gameObject.getBehavior(type);
  }

  /** Find a GameObject by name */
  find(name: string): GameObject | undefined {
    return this.gameObject.scene?.findByName(name);
  }

  /** Find all GameObjects with a tag */
  findWithTag(tag: string): GameObject[] {
    return this.gameObject.scene?.findByTag(tag) ?? [];
  }

  /** Instantiate a prefab */
  async instantiate(
    prefabPath: string,
    position?: [number, number],
    rotation?: number
  ): Promise<GameObject | null> {
    const scene = this.gameObject.scene;
    if (!scene) {
      console.warn('Cannot instantiate: behavior has no scene');
      return null;
    }
    const { instantiatePrefab } = await import('./SceneLoader');
    // instantiatePrefab expects the concrete Scene type.
    // The IScene interface is a subset — the concrete Scene is always
    // what's assigned at runtime. Safe to cast here.
    return instantiatePrefab(prefabPath, scene as any, position, rotation);
  }

  /** Destroy a GameObject */
  destroy(target?: GameObject): void {
    const go = target ?? this.gameObject;
    go.scene?.destroy(go);
  }

  /** Schedule destruction after delay */
  destroyAfter(seconds: number, target?: GameObject): void {
    const go = target ?? this.gameObject;
    this.startCoroutine(
      (function* (self: Behavior) {
        yield* self.wait(seconds);
        go.scene?.destroy(go);
      })(this)
    );
  }

  // ==================== Time Helpers ====================

  /** Current delta time */
  get deltaTime(): number {
    return Time.deltaTime;
  }

  /** Fixed delta time */
  get fixedDeltaTime(): number {
    return Time.fixedDeltaTime;
  }

  /** Current time scale */
  get timeScale(): number {
    return Time.timeScale;
  }

  set timeScale(value: number) {
    Time.timeScale = value;
  }

  // ==================== Input Helpers ====================

  /** Get a smoothed axis value between -1 and 1 */
  getAxis(name: string): number {
    return Input.getAxis(name);
  }

  /** Get raw axis value: -1, 0, or 1 (no smoothing) */
  getAxisRaw(name: string): number {
    return Input.getAxisRaw(name);
  }

  /** Check if a button is currently held */
  getButton(name: string): boolean {
    return Input.getButton(name);
  }

  /** Check if a button was pressed this frame */
  getButtonDown(name: string): boolean {
    return Input.getButtonDown(name);
  }

  /** Check if a button was released this frame */
  getButtonUp(name: string): boolean {
    return Input.getButtonUp(name);
  }

  /** Check if a key is currently held */
  getKey(code: string): boolean {
    return Input.getKey(code);
  }

  /** Check if a key was pressed this frame */
  getKeyDown(code: string): boolean {
    return Input.getKeyDown(code);
  }

  /** Check if a key was released this frame */
  getKeyUp(code: string): boolean {
    return Input.getKeyUp(code);
  }

  /** Current mouse position relative to canvas */
  get mousePosition(): Vector2 {
    return Input.mousePosition;
  }

  /** Check if a mouse button is currently held (0=left, 1=middle, 2=right) */
  getMouseButton(button: number): boolean {
    return Input.getMouseButton(button);
  }

  /** Check if a mouse button was pressed this frame */
  getMouseButtonDown(button: number): boolean {
    return Input.getMouseButtonDown(button);
  }

  // ==================== Internal ====================

  /** Clean up when destroyed */
  _destroy(): void {
    this.stopAllCoroutines();
    this.events.removeAllListeners();
    this.onDestroy();
  }
}
