/**
 * Scene JSON schema types for Bonk Engine.
 * These types define the structure of compiled scene files.
 */

import type { Vector2, ColorValue } from './math';
import type { AnyComponentJson } from './components';

/** Transform data for positioning GameObjects */
export interface TransformJson {
  position: Vector2;
  rotation: number;
  scale: Vector2;
  zIndex?: number;
}

/** Behavior reference in scene JSON */
export interface BehaviorJson {
  type: 'Behavior';
  src: string;
  props?: Record<string, unknown>;
}

/** Prefab reference in scene JSON */
export interface PrefabRefJson {
  path: string;
  overrides?: Partial<Omit<GameObjectJson, 'prefab'>>;
}

/** GameObject definition in scene JSON */
export interface GameObjectJson {
  id: string;
  name: string;
  tag?: string;
  enabled?: boolean;
  transform: TransformJson;
  components?: AnyComponentJson[];
  behaviors?: BehaviorJson[];
  children?: GameObjectJson[];
  prefab?: PrefabRefJson;
}

/** Scene settings */
export interface SceneSettingsJson {
  gravity?: Vector2;
  backgroundColor?: ColorValue;
  pixelsPerUnit?: number;
  collisionLayers?: string[];
}

/** Root scene JSON structure */
export interface SceneJson {
  name: string;
  version: string;
  settings?: SceneSettingsJson;
  gameObjects: GameObjectJson[];
}

/** Prefab JSON structure (subset of scene) */
export interface PrefabJson {
  name: string;
  version: string;
  root: GameObjectJson;
}

/** Default transform values */
export const DEFAULT_TRANSFORM: TransformJson = {
  position: [0, 0],
  rotation: 0,
  scale: [1, 1],
  zIndex: 0,
};

/** Default scene settings */
export const DEFAULT_SCENE_SETTINGS: SceneSettingsJson = {
  gravity: [0, 980],
  backgroundColor: '#1a1a2e',
  pixelsPerUnit: 100,
};
