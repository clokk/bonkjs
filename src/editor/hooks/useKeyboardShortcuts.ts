import { useEffect } from 'react';
import { useEditorStore } from '@editor/store/editorStore';

/**
 * Check if the user is currently typing in an input element.
 */
function isTypingInInput(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea') {
    return true;
  }

  // Check for contenteditable
  if (activeElement.getAttribute('contenteditable') === 'true') {
    return true;
  }

  return false;
}

/**
 * Global keyboard shortcuts for the editor.
 *
 * Shortcuts:
 * - Delete/Backspace: Delete selected GameObjects
 * - Cmd+D: Duplicate selected GameObjects
 * - Cmd+S: Save current scene (placeholder)
 * - Cmd+R: Refresh the page
 * - Escape: Clear selection
 */
export function useKeyboardShortcuts(): void {
  const deleteSelectedGameObjects = useEditorStore(
    (state) => state.deleteSelectedGameObjects
  );
  const duplicateSelectedGameObjects = useEditorStore(
    (state) => state.duplicateSelectedGameObjects
  );
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const selectedGameObjectIds = useEditorStore(
    (state) => state.selectedGameObjectIds
  );
  const currentScene = useEditorStore((state) => state.currentScene);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (isTypingInInput()) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      // Cmd+R - Refresh page
      if (isMeta && e.key === 'r') {
        e.preventDefault();
        window.location.reload();
        return;
      }

      // Cmd+S - Save scene (placeholder for now)
      if (isMeta && e.key === 's') {
        e.preventDefault();
        if (currentScene) {
          console.log('Save scene (not yet implemented)');
          // TODO: Implement scene saving
        }
        return;
      }

      // Cmd+D - Duplicate selected GameObjects
      if (isMeta && e.key === 'd') {
        e.preventDefault();
        if (selectedGameObjectIds.length > 0) {
          duplicateSelectedGameObjects();
        }
        return;
      }

      // Delete/Backspace - Delete selected GameObjects
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedGameObjectIds.length > 0) {
          e.preventDefault();
          deleteSelectedGameObjects();
        }
        return;
      }

      // Escape - Clear selection
      if (e.key === 'Escape') {
        clearSelection();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    deleteSelectedGameObjects,
    duplicateSelectedGameObjects,
    clearSelection,
    selectedGameObjectIds,
    currentScene,
  ]);
}
