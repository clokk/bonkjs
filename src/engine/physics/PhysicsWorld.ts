/**
 * PhysicsWorld - Abstract interface for 2D physics.
 * Allows swapping physics backends (Matter.js, Rapier, etc).
 */

import type { Vector2 } from '../types';

/** Physics body configuration */
export interface RigidBodyConfig {
  type: 'dynamic' | 'static' | 'kinematic';
  position: Vector2;
  rotation: number;
  mass?: number;
  friction?: number;
  restitution?: number;
  linearDamping?: number;
  angularDamping?: number;
  fixedRotation?: boolean;
  bullet?: boolean;
  gravityScale?: number;
}

/** Collider configuration */
export interface ColliderConfig {
  type: 'box' | 'circle' | 'polygon';
  isTrigger?: boolean;
  offset?: Vector2;
  layer?: string;
  mask?: string[];
  // Shape-specific
  width?: number;
  height?: number;
  radius?: number;
  vertices?: Vector2[];
}

/** Abstract physics body */
export interface PhysicsBody {
  readonly id: string;
  position: Vector2;
  rotation: number;
  velocity: Vector2;
  angularVelocity: number;
  readonly type: 'dynamic' | 'static' | 'kinematic';

  applyForce(force: Vector2): void;
  applyImpulse(impulse: Vector2): void;
  setVelocity(velocity: Vector2): void;
  setPosition(position: Vector2): void;
  setRotation(rotation: number): void;
}

/** Raycast hit result */
export interface RaycastHit {
  body: PhysicsBody;
  point: Vector2;
  normal: Vector2;
  distance: number;
}

/** Collision event data */
export interface CollisionEvent {
  bodyA: PhysicsBody;
  bodyB: PhysicsBody;
  contacts: Array<{ point: Vector2; normal: Vector2 }>;
  isSensor: boolean;
}

/** Collision callback type */
export type CollisionCallback = (event: CollisionEvent) => void;

/** Abstract physics world interface */
export interface PhysicsWorld {
  /** Create a physics body */
  createBody(config: RigidBodyConfig): PhysicsBody;

  /** Remove a physics body */
  removeBody(body: PhysicsBody): void;

  /** Add a collider to a body */
  addCollider(body: PhysicsBody, config: ColliderConfig): void;

  /** Step the simulation */
  step(dt: number): void;

  /** Set gravity */
  setGravity(gravity: Vector2): void;

  /** Get gravity */
  getGravity(): Vector2;

  /** Raycast */
  raycast(
    origin: Vector2,
    direction: Vector2,
    distance: number
  ): RaycastHit | null;

  /** Query bodies in an AABB */
  queryAABB(min: Vector2, max: Vector2): PhysicsBody[];

  /** Register collision start callback */
  onCollisionStart(callback: CollisionCallback): () => void;

  /** Register collision end callback */
  onCollisionEnd(callback: CollisionCallback): () => void;

  /** Clear all bodies */
  clear(): void;

  /** Destroy the world */
  destroy(): void;
}

/** Physics world factory */
export type PhysicsWorldFactory = (config?: PhysicsWorldConfig) => PhysicsWorld;

/** Physics world configuration */
export interface PhysicsWorldConfig {
  gravity?: Vector2;
  iterations?: number;
}

/** Registry of physics backends */
const physicsBackends = new Map<string, PhysicsWorldFactory>();

/** Register a physics backend */
export function registerPhysicsBackend(
  name: string,
  factory: PhysicsWorldFactory
): void {
  physicsBackends.set(name, factory);
}

/** Create a physics world using a registered backend */
export function createPhysicsWorld(
  backend: string,
  config?: PhysicsWorldConfig
): PhysicsWorld {
  const factory = physicsBackends.get(backend);
  if (!factory) {
    throw new Error(
      `Physics backend "${backend}" not found. ` +
        `Available: ${Array.from(physicsBackends.keys()).join(', ')}`
    );
  }
  return factory(config);
}

/** Get available physics backends */
export function getPhysicsBackends(): string[] {
  return Array.from(physicsBackends.keys());
}
