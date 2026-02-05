/**
 * Physics module exports.
 */

export type {
  PhysicsWorld,
  PhysicsBody,
  RigidBodyConfig,
  ColliderConfig,
  RaycastHit,
  CollisionEvent,
  CollisionCallback,
  PhysicsWorldConfig,
} from './PhysicsWorld';

export {
  registerPhysicsBackend,
  createPhysicsWorld,
  getPhysicsBackends,
} from './PhysicsWorld';

export { MatterPhysicsWorld } from './MatterPhysicsWorld';
export { CollisionLayers } from './CollisionLayers';

// Auto-register Matter.js backend
import './MatterPhysicsWorld';
