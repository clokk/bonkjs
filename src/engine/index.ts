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
export { Input } from './Input';

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

// Audio
export * from './audio';

// Components (registers all built-in components)
import './components';
export * from './components';

// Rendering
export * from './rendering';

// UI System
export * from './ui';

// Math utilities
export { vec2 } from './math/vec2';

// Types
export * from './types';
