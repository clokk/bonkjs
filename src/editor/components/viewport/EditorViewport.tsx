import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Square, Pause, Keyboard } from 'lucide-react';
import { useEditorStore } from '@editor/store/editorStore';
import { InputDebugOverlay } from './InputDebugOverlay';
import { getRenderer, setRenderer, PixiRenderer } from '@engine/rendering';
import { Scene } from '@engine/Scene';
import { Time } from '@engine/Time';
import { Input } from '@engine/Input';
import { loadSceneByName } from '@engine/SceneLoader';
import { Camera2DComponent } from '@engine/components/Camera2DComponent';
import { AudioManager } from '@engine/audio';
import { screenToWorld } from '@editor/lib/coordinates';
import {
  useDragTarget,
  isImageFile,
  fileNameWithoutExtension,
  type DragData,
} from '@editor/hooks/useDragAndDrop';

// Register components and behaviors
import '@engine/components';
import '@behaviors/index';

/**
 * Apply the initial camera view for a scene without starting the game loop.
 * Finds the main Camera2D and positions the viewport accordingly.
 */
function applyInitialCameraView(scene: Scene): void {
  const renderer = getRenderer();

  // Find the main camera in the scene
  for (const go of scene.getGameObjects()) {
    const camera = go.getComponent(Camera2DComponent);
    if (camera && camera.isMain) {
      // Get camera's initial position from its transform
      let cameraX = go.transform.worldPosition[0];
      let cameraY = go.transform.worldPosition[1];

      // If camera has a target, calculate position based on target + offset
      if (camera.target) {
        const target = scene.findByName(camera.target);
        if (target) {
          cameraX = target.transform.worldPosition[0] + camera.offset[0];
          cameraY = target.transform.worldPosition[1] + camera.offset[1];
        }
      }

      // Apply camera position and zoom to renderer
      renderer.setCameraPosition(cameraX, cameraY);
      renderer.setCameraZoom(camera.zoom);
      return;
    }
  }

  // No camera found - reset to default view (centered at origin)
  renderer.setCameraPosition(0, 0);
  renderer.setCameraZoom(1);
}

export const EditorViewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const initializedRef = useRef(false);
  const sceneStartedRef = useRef(false);

  const isPlaying = useEditorStore((state) => state.isPlaying);
  const isPaused = useEditorStore((state) => state.isPaused);
  const setIsPlaying = useEditorStore((state) => state.setIsPlaying);
  const setIsPaused = useEditorStore((state) => state.setIsPaused);
  const setCurrentScene = useEditorStore((state) => state.setCurrentScene);
  const setCurrentScenePath = useEditorStore((state) => state.setCurrentScenePath);
  const pendingSceneLoad = useEditorStore((state) => state.pendingSceneLoad);
  const clearPendingSceneLoad = useEditorStore((state) => state.clearPendingSceneLoad);
  const showInputDebug = useEditorStore((state) => state.showInputDebug);
  const setShowInputDebug = useEditorStore((state) => state.setShowInputDebug);
  const isDirty = useEditorStore((state) => state.isDirty);
  const currentSceneName = useEditorStore((state) => state.currentSceneName);
  const setStoreSceneName = useEditorStore((state) => state.setCurrentSceneName);

  const createGameObjectWithSprite = useEditorStore(
    (state) => state.createGameObjectWithSprite
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drag and drop handling
  const handleDrop = useCallback(
    (data: DragData, event: React.DragEvent) => {
      if (data.type !== 'file' || !isImageFile(data.path)) return;
      if (!containerRef.current) return;

      // Calculate world position from drop coordinates
      const rect = containerRef.current.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;

      const renderer = getRenderer();
      const worldPos = screenToWorld(screenX, screenY, renderer);

      // Create the sprite GameObject at the drop position
      const name = fileNameWithoutExtension(data.path);
      createGameObjectWithSprite(name, data.path, worldPos);
    },
    [createGameObjectWithSprite]
  );

  const { isDragOver, dragTargetProps } = useDragTarget(
    handleDrop,
    (data) => data.type === 'file' && isImageFile(data.path)
  );


  // Warn user before leaving if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Reload the current scene (used by Stop)
  const reloadScene = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Unload current scene
      if (sceneRef.current) {
        sceneRef.current.unload();
        sceneRef.current = null;
      }

      // Reset scene started flag
      sceneStartedRef.current = false;

      // Load fresh scene (skip awake/start for editor preview)
      const scene = await loadSceneByName(currentSceneName, { skipStart: true });
      sceneRef.current = scene;
      setCurrentScene(scene);

      // Apply initial camera view
      applyInitialCameraView(scene);

      console.log(`Reloaded scene: ${currentSceneName}`);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to reload scene:', err);
      setError(err instanceof Error ? err.message : 'Failed to reload scene');
      setIsLoading(false);
    }
  }, [currentSceneName, setCurrentScene]);

  // Play handler - starts or resumes the scene
  const handlePlay = useCallback(() => {
    if (!sceneRef.current) return;

    // If scene hasn't been started yet, call start (awake was called during load)
    if (!sceneStartedRef.current) {
      sceneRef.current.start();
      sceneStartedRef.current = true;
    } else if (isPaused) {
      // Resuming from pause - resume audio
      AudioManager.resumeAll();
    }

    setIsPaused(false);
    setIsPlaying(true);
  }, [setIsPlaying, setIsPaused, isPaused]);

  // Pause handler - pauses without resetting
  const handlePause = useCallback(() => {
    AudioManager.pauseAll();
    setIsPaused(true);
    setIsPlaying(false);
  }, [setIsPlaying, setIsPaused]);

  // Stop handler - stops and reloads the scene
  const handleStop = useCallback(async () => {
    AudioManager.stopAll();
    setIsPlaying(false);
    setIsPaused(false);
    await reloadScene();
  }, [setIsPlaying, setIsPaused, reloadScene]);

  // Initialize renderer and load scene
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;

    const container = containerRef.current;
    initializedRef.current = true;

    const init = async () => {
      try {
        // Create renderer and initialize it BEFORE setting as global
        const renderer = new PixiRenderer();

        const canvas = await renderer.init({
          width: container.clientWidth || 800,
          height: container.clientHeight || 600,
          backgroundColor: 0x09090b, // zinc-950
        });

        // Set as global renderer AFTER init (so worldContainer exists)
        setRenderer(renderer);

        // Mount canvas
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);

        // Initialize input
        Input.initialize(canvas);

        // Load default scene (skip awake/start for editor preview)
        const scene = await loadSceneByName(currentSceneName, { skipStart: true });

        sceneRef.current = scene;
        setCurrentScene(scene);
        setCurrentScenePath(`/scenes/${currentSceneName}.json`);

        // Apply initial camera view
        applyInitialCameraView(scene);

        setIsLoading(false);
        console.log('Viewport initialized successfully', scene.getGameObjects());
      } catch (err) {
        console.error('Failed to initialize viewport:', err);
        setError(err instanceof Error ? err.message : 'Failed to load');
        setIsLoading(false);
      }
    };

    init();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sceneRef.current) {
        sceneRef.current.unload();
        sceneRef.current = null;
      }
    };
  }, [setCurrentScenePath]);

  // Game loop - runs when playing (not paused)
  useEffect(() => {
    if (!isPlaying || isPaused || !sceneRef.current) {
      return;
    }

    const scene = sceneRef.current;
    const renderer = getRenderer();

    const gameLoop = () => {
      const now = performance.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Update time
      Time.update(dt);

      // Update scene
      scene.fixedUpdate();
      scene.update();
      scene.lateUpdate();
      scene.processPendingDestroy();

      // Clear per-frame input state
      Input.update();

      // Render
      renderer.render();

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, isPaused]);

  // Render loop when not playing or paused (still renders, but doesn't update logic)
  useEffect(() => {
    // Only run render-only loop when not in active game loop
    if ((isPlaying && !isPaused) || isLoading) {
      return;
    }

    const renderer = getRenderer();

    const renderLoop = () => {
      renderer.render();
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, isPaused, isLoading]);

  // Handle scene loading requests from AppHeader or ProjectFiles
  useEffect(() => {
    if (!pendingSceneLoad || pendingSceneLoad === currentSceneName) {
      clearPendingSceneLoad();
      return;
    }

    const loadNewScene = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Stop playing if currently playing
        if (isPlaying) {
          setIsPlaying(false);
        }

        // Unload current scene
        if (sceneRef.current) {
          sceneRef.current.unload();
          sceneRef.current = null;
        }

        // Reset scene started flag
        sceneStartedRef.current = false;

        // Load new scene (skip awake/start for editor preview)
        const scene = await loadSceneByName(pendingSceneLoad, { skipStart: true });
        sceneRef.current = scene;
        setCurrentScene(scene);
        setStoreSceneName(pendingSceneLoad);
        setCurrentScenePath(`/scenes/${pendingSceneLoad}.json`);

        // Apply initial camera view
        applyInitialCameraView(scene);

        console.log(`Loaded scene: ${pendingSceneLoad}`, scene.getGameObjects());
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load scene:', err);
        setError(err instanceof Error ? err.message : 'Failed to load scene');
        setIsLoading(false);
      } finally {
        clearPendingSceneLoad();
      }
    };

    loadNewScene();
  }, [pendingSceneLoad, currentSceneName, isPlaying, setIsPlaying, setCurrentScene, setCurrentScenePath, clearPendingSceneLoad, setStoreSceneName]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current || isLoading) return;

    const container = containerRef.current;
    const renderer = getRenderer();

    const handleResize = () => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        renderer.resize(container.clientWidth, container.clientHeight);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isLoading]);

  return (
    <div
      className={`w-full h-full bg-zinc-950 relative group rounded-xl overflow-hidden border-2 transition-colors ${
        isDragOver
          ? 'border-sky-400 bg-sky-400/5'
          : isPlaying && !isPaused
            ? 'border-green-500/50'
            : isPaused
              ? 'border-yellow-500/50'
              : 'border-zinc-800'
      }`}
    >
      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0"
        {...dragTargetProps}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
            <div className="text-zinc-500 text-sm">Loading scene...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        )}
      </div>

      {/* Viewport Toolbar */}
      <div className="absolute inset-0 z-50 pointer-events-none">
        {/* Center: Transport Controls */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 bg-zinc-900/90 p-1 rounded-md border border-zinc-800 shadow-lg backdrop-blur-sm pointer-events-auto items-center">
          {/* Play/Pause button */}
          {isPlaying && !isPaused ? (
            <button
              onClick={handlePause}
              className="p-1.5 rounded transition-colors bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
              title="Pause"
            >
              <Pause size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handlePlay}
              className={`p-1.5 rounded transition-colors ${
                isPaused
                  ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title={isPaused ? 'Resume' : 'Play'}
            >
              <Play size={16} fill={isPaused ? 'currentColor' : 'none'} />
            </button>
          )}
          {/* Stop button */}
          <button
            onClick={handleStop}
            className={`p-1.5 rounded transition-colors ${
              isPlaying || isPaused
                ? 'text-red-400 hover:bg-red-500/20'
                : 'text-zinc-600 cursor-not-allowed'
            }`}
            title="Stop"
            disabled={!isPlaying && !isPaused}
          >
            <Square size={16} fill="currentColor" />
          </button>
        </div>

        {/* Right: Debug Controls */}
        <div className="absolute top-2 right-2 flex gap-1 bg-zinc-900/90 p-1 rounded-md border border-zinc-800 shadow-lg backdrop-blur-sm pointer-events-auto items-center">
          {/* Input debug toggle */}
          <button
            onClick={() => setShowInputDebug(!showInputDebug)}
            className={`p-1.5 rounded transition-colors ${
              showInputDebug
                ? 'bg-sky-400/20 text-sky-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Toggle Input Debug"
          >
            <Keyboard size={16} />
          </button>
        </div>
      </div>

      {/* Input Debug Overlay */}
      {showInputDebug && <InputDebugOverlay />}
    </div>
  );
};
