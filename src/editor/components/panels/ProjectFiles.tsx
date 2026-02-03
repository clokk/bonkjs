import React, { useState } from 'react';
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
} from 'lucide-react';
import { Panel, ScrollArea } from '@editor/components/ui';
import { cn } from '@editor/lib/utils';
import { useEditorStore } from '@editor/store/editorStore';
import { useFileTree } from '@editor/hooks/useFileTree';
import type { FileNode } from '@editor/lib/filesystem';

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
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  depth,
  expandedPaths,
  onToggle,
  selectedPath,
  onSelect,
  onLoadScene,
}) => {
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

        {/* Name */}
        <span className="text-xs font-mono truncate">{node.name}</span>
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
            />
          ))}
        </>
      )}
    </>
  );
};

export const ProjectFiles: React.FC = () => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(['/scenes', '/behaviors'])
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const loadScene = useEditorStore((state) => state.loadScene);
  const { fileTree, isLoading, error, refresh } = useFileTree();

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
      <ScrollArea className="h-full">
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
          {fileTree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              expandedPaths={expandedPaths}
              onToggle={handleToggle}
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
              onLoadScene={handleLoadScene}
            />
          ))}
        </div>
      </ScrollArea>
    </Panel>
  );
};
