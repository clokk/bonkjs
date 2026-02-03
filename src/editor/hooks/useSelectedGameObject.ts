import { useMemo } from 'react';
import { useEditorStore } from '@editor/store/editorStore';
import type { GameObject } from '@engine/GameObject';

interface UseSelectedGameObjectResult {
  gameObject: GameObject | null;
  isMultiSelect: boolean;
  selectedCount: number;
}

export function useSelectedGameObject(): UseSelectedGameObjectResult {
  const selectedIds = useEditorStore((state) => state.selectedGameObjectIds);
  const currentScene = useEditorStore((state) => state.currentScene);

  const gameObject = useMemo(() => {
    if (selectedIds.length !== 1 || !currentScene) {
      return null;
    }
    return currentScene.findById(selectedIds[0]) ?? null;
  }, [selectedIds, currentScene]);

  return {
    gameObject,
    isMultiSelect: selectedIds.length > 1,
    selectedCount: selectedIds.length,
  };
}
