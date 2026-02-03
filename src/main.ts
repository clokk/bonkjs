/**
 * Bonk Engine - Demo Entry Point
 * Demonstrates loading a scene and running the game loop.
 */

// Register all behaviors
import '../behaviors';

// Register built-in components
import './engine/components';

// Import engine
import {
  loadSceneByName,
  Time,
  Input,
  GlobalEvents,
  EngineEvents,
  setHotReloadScene,
  setupViteHMR,
} from './engine';

// Import renderer
import { getRenderer } from './engine/rendering';
import type { Renderer } from './engine/rendering';

// Debug overlay element
let debugOverlay: HTMLDivElement | null = null;

function createDebugOverlay(): void {
  debugOverlay = document.createElement('div');
  debugOverlay.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: #0f0;
    font-family: monospace;
    font-size: 14px;
    padding: 10px;
    border-radius: 4px;
    z-index: 9999;
    pointer-events: none;
  `;
  document.body.appendChild(debugOverlay);
}

function updateDebugOverlay(): void {
  if (!debugOverlay) return;

  debugOverlay.innerHTML = `
    <div>FPS: ${Time.fps}</div>
    <div>Time: ${Time.time.toFixed(2)}s</div>
    <div>Frame: ${Time.frameCount}</div>
    <div>Scale: ${Time.timeScale}x</div>
  `;
}

async function main(): Promise<void> {
  console.log('Bonk Engine starting...');

  // Initialize renderer
  const renderer = getRenderer();
  const canvas = await renderer.init({
    width: 800,
    height: 600,
    backgroundColor: 0x2a1a4a,
  });

  // Mount canvas to app container
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = '';
    app.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    `;
    canvas.style.cssText = `
      border: 2px solid #666;
      border-radius: 4px;
    `;
    app.appendChild(canvas);
  }

  // Initialize input system
  Input.initialize(canvas);

  // Create debug overlay
  createDebugOverlay();

  // Set up event listeners
  GlobalEvents.on(EngineEvents.SCENE_LOAD_START, (data) => {
    console.log('Scene load started:', data);
  });

  GlobalEvents.on(EngineEvents.SCENE_LOAD_END, (data: { name: string }) => {
    console.log('Scene loaded:', data);
  });

  // Set up hot reload
  setupViteHMR();

  try {
    // Load the demo scene
    const scene = await loadSceneByName('Level1');
    console.log('Scene loaded:', scene.name);
    console.log('GameObjects:', scene.getGameObjects().map((go) => go.name));

    // Set up hot reload for this scene
    setHotReloadScene(scene);

    // Game loop
    let lastTime = performance.now();

    const gameLoop = (): void => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      Time.update(dt);
      Input.update();

      // Update scene
      scene.fixedUpdate();
      scene.update();
      scene.lateUpdate();
      scene.processPendingDestroy();

      // Render (PixiJS handles actual drawing via its internal loop)
      renderer.render();

      // Update debug overlay
      updateDebugOverlay();

      requestAnimationFrame(gameLoop);
    };

    // Start the loop
    scene.awake();
    scene.start();
    gameLoop();

    console.log('Game loop started');
  } catch (error) {
    console.error('Failed to start game:', error);
  }
}

// Start the engine
main().catch(console.error);
