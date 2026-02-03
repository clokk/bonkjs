import { useState, useEffect, useCallback } from 'react';
import { FileNode, readProjectTree } from '@editor/lib/filesystem';

export interface UseFileTreeResult {
  fileTree: FileNode[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing the project file tree.
 * Auto-loads on mount, retries if Tauri isn't ready yet.
 */
export function useFileTree(): UseFileTreeResult {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const tree = await readProjectTree();
      setFileTree(tree);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read project files';
      setError(message);
      console.error('Failed to load file tree:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-load on mount with retry for Tauri initialization
  useEffect(() => {
    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 200; // ms

    const tryLoad = async () => {
      if (cancelled) return;

      try {
        const tree = await readProjectTree();
        if (!cancelled) {
          setFileTree(tree);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        // If Tauri isn't ready yet, retry a few times
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(tryLoad, retryDelay);
        } else {
          if (!cancelled) {
            const message = err instanceof Error ? err.message : 'Failed to read project files';
            setError(message);
            setIsLoading(false);
          }
        }
      }
    };

    tryLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  return { fileTree, isLoading, error, refresh };
}
