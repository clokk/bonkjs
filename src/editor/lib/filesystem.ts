/**
 * Filesystem utilities for the editor.
 * Uses Tauri FS plugin when available, falls back gracefully in browser mode.
 */

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  path: string;
}

/**
 * Check if running in Tauri desktop mode.
 * Checks both v1 and v2 style globals.
 */
export const isTauri = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)
  );
};

/**
 * Project directories to scan for the file tree.
 */
const PROJECT_DIRS = ['scenes', 'behaviors', 'prefabs', 'assets'] as const;

/**
 * Recursively read a directory and build a FileNode tree.
 */
async function readDirectoryRecursive(
  dirPath: string,
  basePath: string
): Promise<FileNode[]> {
  const { readDir } = await import('@tauri-apps/plugin-fs');

  try {
    const entries = await readDir(dirPath);
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      // Skip hidden files/folders
      if (entry.name.startsWith('.')) continue;

      const fullPath = `${dirPath}/${entry.name}`;
      const relativePath = `${basePath}/${entry.name}`;

      if (entry.isDirectory) {
        const children = await readDirectoryRecursive(fullPath, relativePath);
        nodes.push({
          name: entry.name,
          type: 'folder',
          path: relativePath,
          children: children.sort(sortFileNodes),
        });
      } else {
        nodes.push({
          name: entry.name,
          type: 'file',
          path: relativePath,
        });
      }
    }

    return nodes.sort(sortFileNodes);
  } catch (err) {
    console.warn(`Failed to read directory ${dirPath}:`, err);
    return [];
  }
}

/**
 * Sort file nodes: folders first, then alphabetically.
 */
function sortFileNodes(a: FileNode, b: FileNode): number {
  if (a.type === 'folder' && b.type === 'file') return -1;
  if (a.type === 'file' && b.type === 'folder') return 1;
  return a.name.localeCompare(b.name);
}

/**
 * Get the project root directory path.
 * The Tauri binary runs from src-tauri/, so we go up one level.
 */
async function getProjectRoot(): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core');
  const cwd = await invoke<string>('get_cwd');
  // Go up from src-tauri/ to project root
  return cwd.replace(/\/src-tauri\/?$/, '');
}

/**
 * Read the project file tree from the filesystem.
 * Scans: scenes/, behaviors/, prefabs/, assets/
 */
export async function readProjectTree(): Promise<FileNode[]> {
  // Try to import and use Tauri FS - this will fail gracefully in browser mode
  let fsModule;
  try {
    fsModule = await import('@tauri-apps/plugin-fs');
  } catch (err) {
    console.error('[filesystem] Failed to import @tauri-apps/plugin-fs:', err);
    throw new Error('File browser requires Tauri desktop mode');
  }

  const { exists } = fsModule;

  // Get project root (current working directory)
  const projectRoot = await getProjectRoot();
  const nodes: FileNode[] = [];

  for (const dir of PROJECT_DIRS) {
    const fullPath = `${projectRoot}/${dir}`;
    const dirExists = await exists(fullPath);

    if (dirExists) {
      const children = await readDirectoryRecursive(fullPath, `/${dir}`);
      nodes.push({
        name: dir,
        type: 'folder',
        path: `/${dir}`,
        children,
      });
    } else {
      // Show empty folder for expected directories
      nodes.push({
        name: dir,
        type: 'folder',
        path: `/${dir}`,
        children: [],
      });
    }
  }

  return nodes;
}

/**
 * Set up file watchers on project directories.
 * Calls onChange when files are created, modified, or removed.
 * Returns an unwatch function for cleanup.
 */
export async function watchProjectTree(
  onChange: () => void,
  options?: { debounceMs?: number }
): Promise<() => void> {
  const { watch } = await import('@tauri-apps/plugin-fs');
  const projectRoot = await getProjectRoot();
  const debounceMs = options?.debounceMs ?? 300;

  const unwatchFns: (() => void)[] = [];

  for (const dir of PROJECT_DIRS) {
    const fullPath = `${projectRoot}/${dir}`;

    try {
      const unwatch = await watch(
        fullPath,
        (event) => {
          // Only trigger on meaningful file changes
          const eventType = event.type;
          if (
            typeof eventType === 'object' &&
            ('create' in eventType || 'modify' in eventType || 'remove' in eventType)
          ) {
            onChange();
          }
        },
        {
          recursive: true,
          delayMs: debounceMs,
        }
      );
      unwatchFns.push(unwatch);
    } catch (err) {
      // Directory might not exist yet, that's ok
      console.warn(`[filesystem] Could not watch ${dir}:`, err);
    }
  }

  // Return combined unwatch function
  return () => {
    for (const unwatch of unwatchFns) {
      unwatch();
    }
  };
}

/**
 * Create a new file with optional content.
 */
export async function createFile(
  relativePath: string,
  content: string = ''
): Promise<void> {
  const { writeTextFile } = await import('@tauri-apps/plugin-fs');
  const projectRoot = await getProjectRoot();
  const fullPath = `${projectRoot}${relativePath}`;
  await writeTextFile(fullPath, content);
}

/**
 * Create a new directory.
 */
export async function createDirectory(relativePath: string): Promise<void> {
  const { mkdir } = await import('@tauri-apps/plugin-fs');
  const projectRoot = await getProjectRoot();
  const fullPath = `${projectRoot}${relativePath}`;
  await mkdir(fullPath, { recursive: true });
}

/**
 * Delete a file or directory.
 */
export async function deleteFileOrDirectory(relativePath: string): Promise<void> {
  const { remove } = await import('@tauri-apps/plugin-fs');
  const projectRoot = await getProjectRoot();
  const fullPath = `${projectRoot}${relativePath}`;
  await remove(fullPath, { recursive: true });
}

/**
 * Rename/move a file or directory.
 */
export async function renameFileOrDirectory(
  oldRelativePath: string,
  newRelativePath: string
): Promise<void> {
  const { rename } = await import('@tauri-apps/plugin-fs');
  const projectRoot = await getProjectRoot();
  const oldFullPath = `${projectRoot}${oldRelativePath}`;
  const newFullPath = `${projectRoot}${newRelativePath}`;
  await rename(oldFullPath, newFullPath);
}

/**
 * Copy text to clipboard.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}
