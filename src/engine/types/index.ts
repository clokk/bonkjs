/**
 * Bonk Engine type definitions.
 * Re-exports all types for convenient importing.
 */

// Math types
export type { Vector2, Vector3, Color, HexColor, ColorValue } from './math';

// Component types
export type {
  ComponentJson,
  SpriteJson,
  AnimatedSpriteJson,
  RigidBody2DJson,
  Collider2DJson,
  CameraJson,
  AudioSourceJson,
  ParticleEmitterJson,
  TileMapJson,
  TextJson,
  BuiltInComponentJson,
  AnyComponentJson,
  BodyType,
  ColliderShape,
} from './components';

// Scene types
export type {
  TransformJson,
  BehaviorJson,
  PrefabRefJson,
  GameObjectJson,
  SceneSettingsJson,
  SceneJson,
  PrefabJson,
} from './scene';

export { DEFAULT_TRANSFORM, DEFAULT_SCENE_SETTINGS } from './scene';

// Input types
export type { AxisConfig, ButtonConfig, InputConfig } from './input';
