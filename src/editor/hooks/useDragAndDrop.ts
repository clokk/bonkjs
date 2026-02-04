/**
 * Drag and drop utilities and hooks for the editor.
 */

import { useState, useCallback, useMemo } from 'react';

/** MIME type used for internal drag operations */
export const DRAG_MIME_TYPE = 'application/x-bonk-editor';

/** Image file extensions we support for drag-and-drop sprite creation */
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

/**
 * Check if a file path is an image file based on extension.
 */
export function isImageFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Extract the file name without extension from a path.
 * e.g., "/assets/player.png" -> "player"
 */
export function fileNameWithoutExtension(path: string): string {
  const fileName = path.split('/').pop() ?? path;
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

/** Data passed during drag operations */
export interface DragData {
  type: 'file';
  path: string;
}

/**
 * Encode drag data for dataTransfer.
 */
export function encodeDragData(data: DragData): string {
  return JSON.stringify(data);
}

/**
 * Decode drag data from dataTransfer.
 */
export function decodeDragData(encoded: string): DragData | null {
  try {
    return JSON.parse(encoded) as DragData;
  } catch {
    return null;
  }
}

/** Callback when a drop occurs */
export type OnDropCallback = (data: DragData, event: React.DragEvent) => void;

/** Filter function to determine if a drop should be accepted */
export type AcceptsCallback = (data: DragData) => boolean;

/**
 * Hook for making an element a drop target.
 *
 * @param onDrop - Callback when a valid drop occurs
 * @param accepts - Optional filter function (default: accepts all)
 * @returns isDragOver state and props to spread on the drop target element
 */
export function useDragTarget(
  onDrop: OnDropCallback,
  accepts?: AcceptsCallback
) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Check if this is our custom drag type
    // Note: dataTransfer.types is a DOMStringList, use Array.from to check
    const types = Array.from(e.dataTransfer.types);
    const hasType = types.includes(DRAG_MIME_TYPE);
    if (hasType) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    const hasType = types.includes(DRAG_MIME_TYPE);
    if (hasType) {
      e.preventDefault();
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only set to false if we're leaving the actual target, not a child
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const encoded = e.dataTransfer.getData(DRAG_MIME_TYPE);
      if (!encoded) return;

      const data = decodeDragData(encoded);
      if (!data) return;

      // Check if drop is accepted
      if (accepts && !accepts(data)) return;

      onDrop(data, e);
    },
    [onDrop, accepts]
  );

  const dragTargetProps = useMemo(
    () => ({
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    }),
    [handleDragOver, handleDragEnter, handleDragLeave, handleDrop]
  );

  return { isDragOver, dragTargetProps };
}

/**
 * Hook for making an element draggable with our custom data.
 *
 * @param data - The drag data to attach
 * @returns Props to spread on the draggable element
 */
export function useDraggable(data: DragData) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData(DRAG_MIME_TYPE, encodeDragData(data));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [data]
  );

  const draggableProps = useMemo(
    () => ({
      draggable: true,
      onDragStart: handleDragStart,
    }),
    [handleDragStart]
  );

  return { draggableProps };
}
