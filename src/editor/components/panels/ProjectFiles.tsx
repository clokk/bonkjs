import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  Image,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Loader2,
  AlertCircle,
  Search,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react';
import { Panel, ScrollArea, Input, ContextMenu } from '@editor/components/ui';
import type { ContextMenuItem } from '@editor/components/ui';
import { cn } from '@editor/lib/utils';
import { useEditorStore } from '@editor/store/editorStore';
import { useFileTree } from '@editor/hooks/useFileTree';
import type { FileNode } from '@editor/lib/filesystem';
import {
  createFile,
  createDirectory,
  deleteFileOrDirectory,
  renameFileOrDirectory,
  copyToClipboard,
} from '@editor/lib/filesystem';

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
      return <FileCode size={12} className="text-yellow-400" />;
    case 'mdx':
      return <FileText size={12} className="text-green-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
      return <Image size={12} className="text-sky-400" />;
    default:
      return <FileText size={12} className="text-zinc-400" />;
  }
};

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onLoadScene: (sceneName: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  isRenaming: boolean;
  onRenameSubmit: (newName: string) => void;
  onRenameCancel: () => void;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  depth,
  expandedPaths,
  onToggle,
  selectedPath,
  onSelect,
  onLoadScene,
  onContextMenu,
  isRenaming,
  onRenameSubmit,
  onRenameCancel,
}) => {
  const [renameValue, setRenameValue] = useState(node.name);
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const isFolder = node.type === 'folder';

  const handleClick = () => {
    if (isFolder) {
      onToggle(node.path);
    }
    onSelect(node.path);
  };

  const handleDoubleClick = () => {
    if (!isFolder) {
      // Check if it's a scene file (.mdx in scenes folder)
      if (node.path.startsWith('/scenes/') && node.name.endsWith('.mdx')) {
        const sceneName = node.name.replace('.mdx', '');
        onLoadScene(sceneName);
      } else {
        console.log('Open file:', node.path);
      }
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRenameSubmit(renameValue);
    } else if (e.key === 'Escape') {
      onRenameCancel();
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-colors select-none',
          isSelected
            ? 'bg-sky-400/20 text-sky-400'
            : 'hover:bg-zinc-800 text-zinc-300'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {/* Expand/Collapse or File Icon */}
        {isFolder ? (
          <>
            <span className="w-3 text-zinc-500">
              {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </span>
            {isExpanded ? (
              <FolderOpen size={12} className="text-yellow-400" />
            ) : (
              <Folder size={12} className="text-yellow-400" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" />
            {getFileIcon(node.name)}
          </>
        )}

        {/* Name or Rename Input */}
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={onRenameCancel}
            className="flex-1 bg-zinc-800 text-xs font-mono px-1 py-0 rounded border border-sky-400 outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-xs font-mono truncate">{node.name}</span>
        )}
      </div>

      {/* Children */}
      {isFolder && isExpanded && node.children && (
        <>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onLoadScene={onLoadScene}
              onContextMenu={onContextMenu}
              isRenaming={false}
              onRenameSubmit={() => {}}
              onRenameCancel={() => {}}
            />
          ))}
        </>
      )}
    </>
  );
};

// Filter file tree recursively, showing matching files and their parent folders
function filterFileTree(nodes: FileNode[], query: string): FileNode[] {
  if (!query) return nodes;

  const lowerQuery = query.toLowerCase();

  return nodes
    .map((node) => {
      if (node.type === 'file') {
        return node.name.toLowerCase().includes(lowerQuery) ? node : null;
      }

      // For folders, check children recursively
      const filteredChildren = node.children
        ? filterFileTree(node.children, query)
        : [];

      // Include folder if it has matching children OR matches itself
      if (
        filteredChildren.length > 0 ||
        node.name.toLowerCase().includes(lowerQuery)
      ) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    })
    .filter((node): node is FileNode => node !== null);
}

export const ProjectFiles: React.FC = () => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(['/scenes', '/behaviors'])
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    node: FileNode;
  } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  const loadScene = useEditorStore((state) => state.loadScene);
  const { fileTree, isLoading, error, refresh } = useFileTree();

  // Filter the file tree based on search query
  const filteredFileTree = useMemo(
    () => filterFileTree(fileTree, filterQuery),
    [fileTree, filterQuery]
  );

  const handleToggle = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleRefresh = () => {
    refresh();
  };

  const handleLoadScene = (sceneName: string) => {
    console.log('Loading scene:', sceneName);
    loadScene(sceneName);
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPath(node.path);
    setContextMenu({
      position: { x: e.clientX, y: e.clientY },
      node,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const getContextMenuItems = (node: FileNode): ContextMenuItem[] => {
    const isRootFolder = node.path.split('/').filter(Boolean).length === 1;
    const isFolder = node.type === 'folder';

    if (isFolder && isRootFolder) {
      // Root folder (scenes, behaviors, etc.)
      return [
        {
          label: 'New File',
          icon: <FilePlus size={12} />,
          onClick: async () => {
            const fileName = prompt('Enter file name:');
            if (fileName) {
              try {
                await createFile(`${node.path}/${fileName}`);
                refresh();
              } catch (err) {
                console.error('Failed to create file:', err);
              }
            }
          },
        },
        {
          label: 'New Folder',
          icon: <FolderPlus size={12} />,
          onClick: async () => {
            const folderName = prompt('Enter folder name:');
            if (folderName) {
              try {
                await createDirectory(`${node.path}/${folderName}`);
                refresh();
              } catch (err) {
                console.error('Failed to create folder:', err);
              }
            }
          },
        },
      ];
    }

    if (isFolder) {
      // Non-root folder
      return [
        {
          label: 'New File',
          icon: <FilePlus size={12} />,
          onClick: async () => {
            const fileName = prompt('Enter file name:');
            if (fileName) {
              try {
                await createFile(`${node.path}/${fileName}`);
                refresh();
              } catch (err) {
                console.error('Failed to create file:', err);
              }
            }
          },
        },
        {
          label: 'New Folder',
          icon: <FolderPlus size={12} />,
          onClick: async () => {
            const folderName = prompt('Enter folder name:');
            if (folderName) {
              try {
                await createDirectory(`${node.path}/${folderName}`);
                refresh();
              } catch (err) {
                console.error('Failed to create folder:', err);
              }
            }
          },
        },
        {
          label: 'Rename',
          icon: <Pencil size={12} />,
          onClick: () => {
            const currentPath = node.path;
            const currentName = node.name;
            setTimeout(() => {
              const newName = prompt('Enter new name:', currentName);
              if (newName && newName !== currentName) {
                const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
                renameFileOrDirectory(currentPath, `${parentPath}/${newName}`)
                  .then(() => refresh())
                  .catch((err) => console.error('Failed to rename:', err));
              }
            }, 0);
          },
        },
        {
          label: 'Delete',
          icon: <Trash2 size={12} />,
          danger: true,
          onClick: async () => {
            if (confirm(`Delete "${node.name}" and all its contents?`)) {
              try {
                await deleteFileOrDirectory(node.path);
                refresh();
              } catch (err) {
                console.error('Failed to delete:', err);
              }
            }
          },
        },
      ];
    }

    // File
    return [
      {
        label: 'Copy Path',
        icon: <Copy size={12} />,
        onClick: async () => {
          await copyToClipboard(node.path);
        },
      },
      {
        label: 'Rename',
        icon: <Pencil size={12} />,
        onClick: () => {
          const currentPath = node.path;
          const currentName = node.name;
          setTimeout(() => {
            const newName = prompt('Enter new name:', currentName);
            if (newName && newName !== currentName) {
              const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
              renameFileOrDirectory(currentPath, `${parentPath}/${newName}`)
                .then(() => refresh())
                .catch((err) => console.error('Failed to rename:', err));
            }
          }, 0);
        },
      },
      {
        label: 'Delete',
        icon: <Trash2 size={12} />,
        danger: true,
        onClick: async () => {
          if (confirm(`Delete "${node.name}"?`)) {
            try {
              await deleteFileOrDirectory(node.path);
              refresh();
            } catch (err) {
              console.error('Failed to delete:', err);
            }
          }
        },
      },
    ];
  };

  return (
    <Panel
      title="Project"
      actions={
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className={cn(
            'text-zinc-500 hover:text-zinc-300 transition-colors',
            isLoading && 'animate-spin'
          )}
          title="Refresh"
        >
          <RefreshCw size={12} />
        </button>
      }
      className="h-full"
    >
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-1 min-h-0">
          <div className="py-1">
            {/* Loading state */}
            {isLoading && fileTree.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-4 text-zinc-500">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs">Scanning files...</span>
              </div>
            )}

            {/* Error/browser mode message */}
            {error && fileTree.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-4 px-3 text-center">
                <AlertCircle size={16} className="text-yellow-400" />
                <span className="text-xs text-zinc-400">{error}</span>
                <span className="text-xs text-zinc-500">
                  Run with <code className="text-sky-400">npm run tauri:dev</code>
                </span>
              </div>
            )}

            {/* File tree */}
            {filteredFileTree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                depth={0}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
                onLoadScene={handleLoadScene}
                onContextMenu={handleContextMenu}
                isRenaming={renamingPath === node.path}
                onRenameSubmit={(newName) => {
                  const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
                  renameFileOrDirectory(node.path, `${parentPath}/${newName}`)
                    .then(() => {
                      setRenamingPath(null);
                      refresh();
                    })
                    .catch((err) => console.error('Failed to rename:', err));
                }}
                onRenameCancel={() => setRenamingPath(null)}
              />
            ))}

            {/* No results message when filtering */}
            {filterQuery && filteredFileTree.length === 0 && fileTree.length > 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-500 text-xs">
                <Search size={20} className="mb-2 opacity-50" />
                <p>No matching files</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Filter Input */}
        <div className="p-2 border-t border-zinc-800 bg-zinc-950/50">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <Input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter..."
              className="h-7 text-xs pl-7"
            />
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          items={getContextMenuItems(contextMenu.node)}
          position={contextMenu.position}
          onClose={closeContextMenu}
        />
      )}
    </Panel>
  );
};
