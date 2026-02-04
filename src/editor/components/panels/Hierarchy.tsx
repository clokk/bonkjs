import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Box,
  Eye,
  EyeOff,
  Search,
  Camera,
  Image,
  Activity,
  Volume2,
  Copy,
  Trash2,
  Plus,
  Pencil,
} from 'lucide-react';
import { Panel, Input, ContextMenu, RenameDialog } from '@editor/components/ui';
import type { ContextMenuItem } from '@editor/components/ui';
import { useEditorStore } from '@editor/store/editorStore';
import { cn } from '@editor/lib/utils';
import type { GameObject } from '@engine/GameObject';
import { Camera2DComponent } from '@engine/components/Camera2DComponent';
import { SpriteComponent } from '@engine/components/SpriteComponent';
import { AnimatedSpriteComponent } from '@engine/components/AnimatedSpriteComponent';
import { RigidBody2DComponent } from '@engine/components/RigidBody2DComponent';
import { AudioSourceComponent } from '@engine/components/AudioSourceComponent';
import {
  useDragTarget,
  isImageFile,
  fileNameWithoutExtension,
  type DragData,
  DRAG_MIME_TYPE,
  decodeDragData,
} from '@editor/hooks/useDragAndDrop';

function getGameObjectIcon(gameObject: GameObject) {
  if (gameObject.getComponent(Camera2DComponent)) {
    return { Icon: Camera, color: 'text-purple-400' };
  }
  if (
    gameObject.getComponent(SpriteComponent) ||
    gameObject.getComponent(AnimatedSpriteComponent)
  ) {
    return { Icon: Image, color: 'text-green-400' };
  }
  if (gameObject.getComponent(RigidBody2DComponent)) {
    return { Icon: Activity, color: 'text-orange-400' };
  }
  if (gameObject.getComponent(AudioSourceComponent)) {
    return { Icon: Volume2, color: 'text-cyan-400' };
  }
  return { Icon: Box, color: 'text-zinc-500' };
}

interface HierarchyNodeProps {
  gameObject: GameObject;
  depth: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, gameObject: GameObject) => void;
  hierarchyVersion: number; // Forces re-render when hierarchy changes
  onDropOnNode: (data: DragData, parentId: string) => void;
}

const HierarchyNode: React.FC<HierarchyNodeProps> = ({
  gameObject,
  depth,
  expandedIds,
  onToggleExpand,
  onContextMenu,
  hierarchyVersion,
  onDropOnNode,
}) => {
  const selectedIds = useEditorStore((state) => state.selectedGameObjectIds);
  const selectGameObject = useEditorStore((state) => state.selectGameObject);
  const toggleSelection = useEditorStore((state) => state.toggleSelection);

  const isSelected = selectedIds.includes(gameObject.id);
  const isExpanded = expandedIds.has(gameObject.id);
  const hasChildren = gameObject.getChildren().length > 0;

  // Node-level drag and drop state
  const [isNodeDragOver, setIsNodeDragOver] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      toggleSelection(gameObject.id);
    } else {
      selectGameObject(gameObject.id);
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(gameObject.id);
  };

  const handleNodeDragOver = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    if (types.includes(DRAG_MIME_TYPE)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleNodeDragEnter = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    if (types.includes(DRAG_MIME_TYPE)) {
      e.preventDefault();
      e.stopPropagation();
      setIsNodeDragOver(true);
    }
  };

  const handleNodeDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    // Check if we're truly leaving this element (relatedTarget can be null)
    const relatedTarget = e.relatedTarget as Node | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setIsNodeDragOver(false);
    }
  };

  const handleNodeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsNodeDragOver(false);

    const encoded = e.dataTransfer.getData(DRAG_MIME_TYPE);
    if (!encoded) return;

    const data = decodeDragData(encoded);
    if (!data || data.type !== 'file' || !isImageFile(data.path)) return;

    onDropOnNode(data, gameObject.id);
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors select-none',
          isSelected
            ? 'bg-sky-400/20 text-sky-400'
            : 'hover:bg-zinc-800 text-zinc-300',
          !gameObject.enabled && 'opacity-50',
          isNodeDragOver && 'ring-2 ring-sky-400 ring-inset bg-sky-400/20'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, gameObject)}
        onDragOver={handleNodeDragOver}
        onDragEnter={handleNodeDragEnter}
        onDragLeave={handleNodeDragLeave}
        onDrop={handleNodeDrop}
      >
        {/* Expand/Collapse */}
        <button
          className={cn(
            'w-4 h-4 flex items-center justify-center',
            hasChildren ? 'text-zinc-500 hover:text-zinc-300' : 'invisible'
          )}
          onClick={handleToggleExpand}
        >
          {hasChildren &&
            (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
        </button>

        {/* Icon */}
        {(() => {
          const { Icon, color } = getGameObjectIcon(gameObject);
          return <Icon size={12} className={color} />;
        })()}

        {/* Name */}
        <span className="text-xs font-mono truncate flex-1">{gameObject.name}</span>

        {/* Visibility toggle */}
        <button
          className="w-4 h-4 flex items-center justify-center text-zinc-500 hover:text-zinc-300"
          onClick={(e) => {
            e.stopPropagation();
            gameObject.enabled = !gameObject.enabled;
          }}
        >
          {gameObject.enabled ? <Eye size={10} /> : <EyeOff size={10} />}
        </button>
      </div>

      {/* Children */}
      {isExpanded &&
        gameObject.getChildren().map((child) => (
          <HierarchyNode
            key={child.id}
            gameObject={child}
            depth={depth + 1}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onContextMenu={onContextMenu}
            hierarchyVersion={hierarchyVersion}
            onDropOnNode={onDropOnNode}
          />
        ))}
    </>
  );
};

type ContextMenuState =
  | { type: 'gameObject'; position: { x: number; y: number }; gameObject: GameObject }
  | { type: 'empty'; position: { x: number; y: number } }
  | null;

interface RenameDialogState {
  isOpen: boolean;
  id: string;
  name: string;
}

export const Hierarchy: React.FC = () => {
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const currentScene = useEditorStore((state) => state.currentScene);
  const deleteSelectedGameObjects = useEditorStore(
    (state) => state.deleteSelectedGameObjects
  );
  const duplicateSelectedGameObjects = useEditorStore(
    (state) => state.duplicateSelectedGameObjects
  );
  const renameGameObject = useEditorStore((state) => state.renameGameObject);
  const createGameObject = useEditorStore((state) => state.createGameObject);
  const createGameObjectWithSprite = useEditorStore(
    (state) => state.createGameObjectWithSprite
  );
  // Subscribe to hierarchyVersion to trigger re-renders when hierarchy changes
  const hierarchyVersion = useEditorStore((state) => state.hierarchyVersion);

  const [filterQuery, setFilterQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [renameDialog, setRenameDialog] = useState<RenameDialogState>({
    isOpen: false,
    id: '',
    name: '',
  });

  // Handle drop on empty space (create at root)
  const handleDropOnRoot = useCallback(
    (data: DragData) => {
      if (data.type !== 'file' || !isImageFile(data.path)) return;
      const name = fileNameWithoutExtension(data.path);
      createGameObjectWithSprite(name, data.path);
    },
    [createGameObjectWithSprite]
  );

  // Handle drop on a specific node (create as child)
  const handleDropOnNode = useCallback(
    (data: DragData, parentId: string) => {
      if (data.type !== 'file' || !isImageFile(data.path)) return;
      const name = fileNameWithoutExtension(data.path);
      createGameObjectWithSprite(name, data.path, undefined, parentId);
      // Auto-expand the parent
      setExpandedIds((prev) => new Set(prev).add(parentId));
    },
    [createGameObjectWithSprite]
  );

  const { isDragOver: isRootDragOver, dragTargetProps: rootDragTargetProps } =
    useDragTarget(
      handleDropOnRoot,
      (data) => data.type === 'file' && isImageFile(data.path)
    );

  // Get game objects from the current scene
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gameObjects = useMemo(() => {
    return currentScene?.getGameObjects() ?? [];
  }, [currentScene, hierarchyVersion]);

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectGameObject = useEditorStore((state) => state.selectGameObject);

  const handleGameObjectContextMenu = (e: React.MouseEvent, gameObject: GameObject) => {
    e.preventDefault();
    e.stopPropagation();
    // Select the object when right-clicking so delete works
    selectGameObject(gameObject.id);
    setContextMenu({
      type: 'gameObject',
      position: { x: e.clientX, y: e.clientY },
      gameObject,
    });
  };

  const handleEmptyContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    clearSelection();
    setContextMenu({
      type: 'empty',
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const openRenameDialog = (gameObject: GameObject) => {
    setRenameDialog({
      isOpen: true,
      id: gameObject.id,
      name: gameObject.name,
    });
  };

  const closeRenameDialog = () => {
    setRenameDialog({ isOpen: false, id: '', name: '' });
  };

  const handleRenameConfirm = (newName: string) => {
    if (renameDialog.id && newName) {
      renameGameObject(renameDialog.id, newName);
    }
    closeRenameDialog();
  };

  const getGameObjectMenuItems = (gameObject: GameObject): ContextMenuItem[] => {
    return [
      {
        label: 'Duplicate',
        icon: <Copy size={12} />,
        shortcut: '\u2318D',
        onClick: () => {
          duplicateSelectedGameObjects();
        },
      },
      {
        label: 'Rename',
        icon: <Pencil size={12} />,
        onClick: () => {
          openRenameDialog(gameObject);
        },
      },
      {
        label: 'Create Empty Child',
        icon: <Plus size={12} />,
        onClick: () => {
          createGameObject('New GameObject', gameObject.id);
          setExpandedIds((prev) => new Set(prev).add(gameObject.id));
        },
      },
      {
        label: 'Delete',
        icon: <Trash2 size={12} />,
        shortcut: 'Del',
        danger: true,
        onClick: () => {
          deleteSelectedGameObjects();
        },
      },
    ];
  };

  const getEmptyMenuItems = (): ContextMenuItem[] => {
    return [
      {
        label: 'Create Empty',
        icon: <Plus size={12} />,
        onClick: () => {
          createGameObject('New GameObject');
        },
      },
    ];
  };

  // Filter game objects by name
  const filteredGameObjects = useMemo(() => {
    if (!filterQuery) return gameObjects;

    const query = filterQuery.toLowerCase();
    const filterRecursive = (gos: readonly GameObject[]): GameObject[] => {
      return gos.filter((go) => {
        const matches = go.name.toLowerCase().includes(query);
        const hasMatchingChild = filterRecursive(go.getChildren()).length > 0;
        return matches || hasMatchingChild;
      });
    };

    return filterRecursive(gameObjects);
  }, [gameObjects, filterQuery]);

  return (
    <Panel title="Hierarchy" className="h-full">
      <div className="flex flex-col h-full">
        {/* Tree View */}
        <div
          className={cn(
            'flex-1 min-h-0 overflow-y-auto py-1 transition-colors',
            isRootDragOver && 'bg-sky-400/10'
          )}
          onClick={() => clearSelection()}
          onContextMenu={handleEmptyContextMenu}
          {...rootDragTargetProps}
        >
          {filteredGameObjects.length > 0 ? (
            filteredGameObjects.map((go) => (
              <HierarchyNode
                key={go.id}
                gameObject={go}
                depth={0}
                expandedIds={expandedIds}
                onToggleExpand={handleToggleExpand}
                onContextMenu={handleGameObjectContextMenu}
                hierarchyVersion={hierarchyVersion}
                onDropOnNode={handleDropOnNode}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs">
              <Search size={24} className="mb-2 opacity-50" />
              <p>No GameObjects</p>
              <p className="text-zinc-600 mt-1">Load a scene to see hierarchy</p>
            </div>
          )}
        </div>

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
      {contextMenu?.type === 'gameObject' && (
        <ContextMenu
          items={getGameObjectMenuItems(contextMenu.gameObject)}
          position={contextMenu.position}
          onClose={closeContextMenu}
        />
      )}
      {contextMenu?.type === 'empty' && (
        <ContextMenu
          items={getEmptyMenuItems()}
          position={contextMenu.position}
          onClose={closeContextMenu}
        />
      )}

      {/* Rename Dialog */}
      <RenameDialog
        isOpen={renameDialog.isOpen}
        initialValue={renameDialog.name}
        onClose={closeRenameDialog}
        onConfirm={handleRenameConfirm}
      />
    </Panel>
  );
};
