import { create } from 'zustand';
import type { Scene } from '@engine/Scene';
import { GameObject } from '@engine/GameObject';

export type BottomPanelTab = 'project' | 'console' | 'claude';

interface EditorState {
  // Selection
  selectedGameObjectIds: string[];
  lastSelectedId: string | null;

  // Scene
  currentScene: Scene | null;
  currentScenePath: string | null;
  pendingSceneLoad: string | null; // Scene name to load
  isDirty: boolean;
  isPlaying: boolean;
  isPaused: boolean;

  // Panel visibility
  showHierarchy: boolean;
  showInspector: boolean;
  showBottomPanel: boolean;

  // Viewport debug options
  showInputDebug: boolean;

  // Panel sizes
  hierarchyWidth: number;
  inspectorWidth: number;
  bottomPanelHeight: number;

  // Bottom panel
  activeBottomPanel: BottomPanelTab;

  // Console
  consoleLogs: ConsoleLog[];

  // Force re-render counter (increment to trigger UI updates)
  hierarchyVersion: number;

  // Actions
  selectGameObject: (id: string) => void;
  toggleSelection: (id: string) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;

  setCurrentScene: (scene: Scene | null) => void;
  setCurrentScenePath: (path: string | null) => void;
  loadScene: (sceneName: string) => void;
  clearPendingSceneLoad: () => void;
  setIsDirty: (dirty: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsPaused: (paused: boolean) => void;

  setShowHierarchy: (show: boolean) => void;
  setShowInspector: (show: boolean) => void;
  setShowBottomPanel: (show: boolean) => void;
  setShowInputDebug: (show: boolean) => void;

  setHierarchyWidth: (width: number) => void;
  setInspectorWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;

  setActiveBottomPanel: (panel: BottomPanelTab) => void;

  addConsoleLog: (log: ConsoleLog) => void;
  clearConsoleLogs: () => void;

  // GameObject operations
  deleteSelectedGameObjects: () => void;
  duplicateSelectedGameObjects: () => void;
  renameGameObject: (id: string, newName: string) => void;
  createGameObject: (name?: string, parentId?: string) => void;
  refreshHierarchy: () => void;
}

interface ConsoleLog {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

export const useEditorStore = create<EditorState>((set) => ({
  // Initial state
  selectedGameObjectIds: [],
  lastSelectedId: null,

  currentScene: null,
  currentScenePath: null,
  pendingSceneLoad: null,
  isDirty: false,
  isPlaying: false,
  isPaused: false,

  showHierarchy: true,
  showInspector: true,
  showBottomPanel: true,
  showInputDebug: false,

  hierarchyWidth: 220,
  inspectorWidth: 300,
  bottomPanelHeight: 200,

  activeBottomPanel: 'console',

  consoleLogs: [],

  hierarchyVersion: 0,

  // Actions
  selectGameObject: (id) =>
    set({
      selectedGameObjectIds: [id],
      lastSelectedId: id,
    }),

  toggleSelection: (id) =>
    set((state) => {
      const isSelected = state.selectedGameObjectIds.includes(id);
      if (isSelected) {
        return {
          selectedGameObjectIds: state.selectedGameObjectIds.filter(
            (i) => i !== id
          ),
          lastSelectedId: id,
        };
      } else {
        return {
          selectedGameObjectIds: [...state.selectedGameObjectIds, id],
          lastSelectedId: id,
        };
      }
    }),

  setSelection: (ids) =>
    set({
      selectedGameObjectIds: ids,
      lastSelectedId: ids[ids.length - 1] ?? null,
    }),

  clearSelection: () =>
    set({
      selectedGameObjectIds: [],
      lastSelectedId: null,
    }),

  setCurrentScene: (scene) => set({ currentScene: scene }),
  setCurrentScenePath: (path) => set({ currentScenePath: path }),
  loadScene: (sceneName) => set({ pendingSceneLoad: sceneName }),
  clearPendingSceneLoad: () => set({ pendingSceneLoad: null }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsPaused: (paused) => set({ isPaused: paused }),

  setShowHierarchy: (show) => set({ showHierarchy: show }),
  setShowInspector: (show) => set({ showInspector: show }),
  setShowBottomPanel: (show) => set({ showBottomPanel: show }),
  setShowInputDebug: (show) => set({ showInputDebug: show }),

  setHierarchyWidth: (width) => set({ hierarchyWidth: width }),
  setInspectorWidth: (width) => set({ inspectorWidth: width }),
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: height }),

  setActiveBottomPanel: (panel) => set({ activeBottomPanel: panel }),

  addConsoleLog: (log) =>
    set((state) => ({
      consoleLogs: [...state.consoleLogs, log].slice(-500), // Keep last 500 logs
    })),

  clearConsoleLogs: () => set({ consoleLogs: [] }),

  deleteSelectedGameObjects: () =>
    set((state) => {
      if (!state.currentScene || state.selectedGameObjectIds.length === 0) {
        return state;
      }

      for (const id of state.selectedGameObjectIds) {
        const go = state.currentScene.findById(id);
        if (go) {
          // Remove from scene first, then destroy
          state.currentScene.remove(go);
          go.destroy();
        }
      }

      return {
        selectedGameObjectIds: [],
        lastSelectedId: null,
        isDirty: true,
        hierarchyVersion: state.hierarchyVersion + 1,
      };
    }),

  duplicateSelectedGameObjects: () =>
    set((state) => {
      if (!state.currentScene || state.selectedGameObjectIds.length === 0) {
        return state;
      }

      const newIds: string[] = [];

      for (const id of state.selectedGameObjectIds) {
        const go = state.currentScene.findById(id);
        if (go) {
          // Create a simple clone by instantiating a new GameObject
          const clone = new GameObject(`${go.name} (Copy)`);
          clone.transform.position = [
            go.transform.position[0] + 20,
            go.transform.position[1] + 20,
          ];
          clone.transform.rotation = go.transform.rotation;
          clone.transform.scale = [...go.transform.scale];
          clone.tag = go.tag;
          state.currentScene.add(clone);
          newIds.push(clone.id);
        }
      }

      return {
        selectedGameObjectIds: newIds,
        lastSelectedId: newIds[newIds.length - 1] ?? null,
        isDirty: true,
        hierarchyVersion: state.hierarchyVersion + 1,
      };
    }),

  renameGameObject: (id, newName) =>
    set((state) => {
      if (!state.currentScene || !newName) return state;

      const go = state.currentScene.findById(id);
      if (!go) {
        console.warn('[renameGameObject] GameObject not found:', id);
        return state;
      }

      go.name = newName;
      return {
        isDirty: true,
        hierarchyVersion: state.hierarchyVersion + 1,
      };
    }),

  createGameObject: (name = 'New GameObject', parentId) =>
    set((state) => {
      if (!state.currentScene) return state;

      const go = new GameObject(name);

      if (parentId) {
        const parent = state.currentScene.findById(parentId);
        if (parent) {
          go.parent = parent;
        }
      }

      state.currentScene.add(go);

      return {
        selectedGameObjectIds: [go.id],
        lastSelectedId: go.id,
        isDirty: true,
        hierarchyVersion: state.hierarchyVersion + 1,
      };
    }),

  refreshHierarchy: () =>
    set((state) => ({
      hierarchyVersion: state.hierarchyVersion + 1,
    })),
}));
