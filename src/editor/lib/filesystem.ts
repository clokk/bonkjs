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
