/**
 * SceneLoader - Loads scenes from JSON and initializes all GameObjects.
 * Handles component creation, behavior loading, and scene lifecycle.
 */

import { Scene } from './Scene';
import { GameObject } from './GameObject';
import { createComponent } from './Component';
import { loadBehaviorsRecursive } from './BehaviorLoader';
import { GlobalEvents, EngineEvents } from './EventSystem';
import type {
  SceneJson,
  GameObjectJson,
  BehaviorJson,
  PrefabJson,
} from './types';
import { CollisionLayers } from './physics/CollisionLayers';

/** Prefab cache */
const prefabCache = new Map<string, PrefabJson>();

/** Base URL for scene/prefab files */
let baseUrl = '/';

/** Set the base URL for loading scenes and prefabs */
export function setBaseUrl(url: string): void {
  baseUrl = url.endsWith('/') ? url : url + '/';
}

/** Fetch JSON from URL */
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
}

/** Load a prefab JSON */
async function loadPrefab(path: string): Promise<PrefabJson> {
  // Check cache first
  const cached = prefabCache.get(path);
  if (cached) return cached;

  // Convert path to URL
  const url = path.startsWith('http')
    ? path
    : `${baseUrl}prefabs/${path.replace(/^\.\/prefabs\//, '').replace(/\.json$/, '')}.json`;

  const prefab = await fetchJson<PrefabJson>(url);
  prefabCache.set(path, prefab);
  return prefab;
}

/** Deep merge objects */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/** Create a GameObject from JSON, handling prefab references */
async function createGameObject(
  json: GameObjectJson,
  behaviorMap: Map<string, BehaviorJson[]>
): Promise<GameObject> {
  let effectiveJson = json;

  // Handle prefab instantiation
  if (json.prefab) {
    const prefab = await loadPrefab(json.prefab.path);
    const prefabRoot = prefab.root;

    // Merge prefab with overrides
    effectiveJson = {
      ...prefabRoot,
      ...json.prefab.overrides,
      id: json.id, // Keep the instance ID
      name: json.name || prefabRoot.name,
      transform: {
        ...prefabRoot.transform,
        ...json.prefab.overrides?.transform,
      },
    };
  }

  // Create the GameObject
  const go = new GameObject(effectiveJson.name, effectiveJson.id);
  go.tag = effectiveJson.tag;
  go.enabled = effectiveJson.enabled ?? true;

  // Set transform
  go.transform.position = [...effectiveJson.transform.position];
  go.transform.rotation = effectiveJson.transform.rotation;
  go.transform.scale = [...effectiveJson.transform.scale];
  go.transform.zIndex = effectiveJson.transform.zIndex ?? 0;

  // Create components
  if (effectiveJson.components) {
    for (const componentJson of effectiveJson.components) {
      const component = createComponent(go, componentJson);
      if (component) {
        go.addComponent(component);
      }
    }
  }

  // Store behaviors for later loading
  if (effectiveJson.behaviors && effectiveJson.behaviors.length > 0) {
    behaviorMap.set(go.id, effectiveJson.behaviors);
  }

  // Create children recursively
  if (effectiveJson.children) {
    for (const childJson of effectiveJson.children) {
      const child = await createGameObject(childJson, behaviorMap);
      child.parent = go;
    }
  }

  return go;
}

/** Options for scene loading */
export interface LoadSceneOptions {
  /** Skip calling start() on the scene (awake still runs to initialize visuals) */
  skipStart?: boolean;
}

/** Load a scene from a URL */
export async function loadScene(url: string, options?: LoadSceneOptions): Promise<Scene> {
  GlobalEvents.emit(EngineEvents.SCENE_LOAD_START, { url });

  // Fetch scene JSON
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}scenes/${url}`;
  const json = await fetchJson<SceneJson>(fullUrl);

  return loadSceneFromJson(json, options);
}

/** Load a scene from JSON data */
export async function loadSceneFromJson(json: SceneJson, options?: LoadSceneOptions): Promise<Scene> {
  GlobalEvents.emit(EngineEvents.SCENE_LOAD_START, { name: json.name });

  // Register declared collision layers
  if (json.settings?.collisionLayers) {
    for (const layer of json.settings.collisionLayers) {
      CollisionLayers.register(layer);
    }
  }

  // Create scene
  const scene = new Scene(json.name, json.version, json.settings);

  // Track behaviors to load
  const behaviorMap = new Map<string, BehaviorJson[]>();

  // Create all GameObjects
  for (const goJson of json.gameObjects) {
    const go = await createGameObject(goJson, behaviorMap);
    scene.add(go);
  }

  // Load all behaviors (after all GameObjects exist, so they can find each other)
  for (const go of scene.getGameObjects()) {
    await loadBehaviorsRecursive(go, behaviorMap);
  }

  // Initialize scene (awake always runs, start is skipped for editor preview)
  scene.awake();
  if (!options?.skipStart) {
    scene.start();
  }

  GlobalEvents.emit(EngineEvents.SCENE_LOAD_END, {
    name: json.name,
    scene,
  });

  return scene;
}

/** Load a scene by name (assumes it's in the scenes directory) */
export async function loadSceneByName(name: string, options?: LoadSceneOptions): Promise<Scene> {
  return loadScene(`${name}.json`, options);
}

/** Preload prefabs into cache */
export async function preloadPrefabs(paths: string[]): Promise<void> {
  await Promise.all(paths.map(loadPrefab));
}

/** Clear prefab cache */
export function clearPrefabCache(): void {
  prefabCache.clear();
}

/** Instantiate a prefab at runtime */
export async function instantiatePrefab(
  path: string,
  scene: Scene,
  position?: [number, number],
  rotation?: number
): Promise<GameObject> {
  const prefab = await loadPrefab(path);
  const behaviorMap = new Map<string, BehaviorJson[]>();

  const go = await createGameObject(
    {
      ...prefab.root,
      id: crypto.randomUUID(), // New unique ID
      transform: {
        ...prefab.root.transform,
        position: position ?? prefab.root.transform.position,
        rotation: rotation ?? prefab.root.transform.rotation,
      },
    },
    behaviorMap
  );

  // Load behaviors
  await loadBehaviorsRecursive(go, behaviorMap);

  // Add to scene
  scene.add(go);

  return go;
}
