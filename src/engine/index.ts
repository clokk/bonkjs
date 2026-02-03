/**
 * Bonk Engine - Main entry point.
 * Exports all public APIs.
 */

// Core classes
export { GameObject } from './GameObject';
export { Transform } from './Transform';
export { Component, registerComponent, createComponent } from './Component';
export { Behavior } from './Behavior';
export { Scene } from './Scene';
export { Time } from './Time';

// World management
export { WorldManager, World } from './WorldManager';

// Scene loading
export {
  loadScene,
  loadSceneFromJson,
  loadSceneByName,
  instantiatePrefab,
  preloadPrefabs,
  setBaseUrl,
} from './SceneLoader';

// Behavior system
export {
  registerBehavior,
  registerBehaviors,
  getBehavior,
  getRegisteredBehaviorNames,
} from './BehaviorRegistry';

// Events
export { EventEmitter, GlobalEvents, EngineEvents } from './EventSystem';

// Coroutines
export {
  Scheduler,
  GlobalScheduler,
  wait,
  waitFrames,
  waitUntil,
  waitForCoroutine,
  type CoroutineHandle,
  type YieldInstruction,
} from './Scheduler';

// Hot reload
export {
  setHotReloadScene,
  onSceneReload,
  hotReloadBehavior,
  hotReloadScene,
  setupViteHMR,
} from './HotReload';

// Physics
export * from './physics';

// Rendering
export * from './rendering';

// Types
export * from './types';
