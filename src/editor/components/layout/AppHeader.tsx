import React from 'react';
import { Save, FolderOpen, Settings, PanelLeft, PanelRight, PanelBottom } from 'lucide-react';
import { useEditorStore } from '@editor/store/editorStore';
import { cn } from '@editor/lib/utils';

export const AppHeader: React.FC = () => {
  const isDirty = useEditorStore((state) => state.isDirty);
  const currentScenePath = useEditorStore((state) => state.currentScenePath);

  const showHierarchy = useEditorStore((state) => state.showHierarchy);
  const setShowHierarchy = useEditorStore((state) => state.setShowHierarchy);
  const showInspector = useEditorStore((state) => state.showInspector);
  const setShowInspector = useEditorStore((state) => state.setShowInspector);
  const showBottomPanel = useEditorStore((state) => state.showBottomPanel);
  const setShowBottomPanel = useEditorStore((state) => state.setShowBottomPanel);

  const sceneName = currentScenePath
    ? currentScenePath.split('/').pop()?.replace('.mdx', '') ?? 'Untitled'
    : 'No Scene';

  return (
    <header className="flex items-center justify-between h-10 px-3 bg-zinc-900 border-b border-zinc-800 select-none">
      {/* Left: Logo & Scene */}
      <div className="flex items-center gap-3">
        <span className="text-sky-400 font-bold text-sm tracking-wider">BONK</span>
        <div className="h-4 w-px bg-zinc-700" />
        <span className="text-zinc-400 text-xs font-mono">
          {sceneName}
          {isDirty && <span className="text-yellow-400 ml-1">*</span>}
        </span>
      </div>

      {/* Center: Empty (play controls are in viewport now) */}
      <div />

      {/* Right: Actions & Panel Toggles */}
      <div className="flex items-center gap-2">
        {/* Panel toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHierarchy(!showHierarchy)}
            className={cn(
              'p-1.5 rounded transition-colors',
              showHierarchy ? 'text-sky-400 bg-sky-400/10' : 'text-zinc-500 hover:text-zinc-300'
            )}
            title="Toggle Hierarchy"
          >
            <PanelLeft size={16} />
          </button>
          <button
            onClick={() => setShowBottomPanel(!showBottomPanel)}
            className={cn(
              'p-1.5 rounded transition-colors',
              showBottomPanel ? 'text-sky-400 bg-sky-400/10' : 'text-zinc-500 hover:text-zinc-300'
            )}
            title="Toggle Bottom Panel"
          >
            <PanelBottom size={16} />
          </button>
          <button
            onClick={() => setShowInspector(!showInspector)}
            className={cn(
              'p-1.5 rounded transition-colors',
              showInspector ? 'text-sky-400 bg-sky-400/10' : 'text-zinc-500 hover:text-zinc-300'
            )}
            title="Toggle Inspector"
          >
            <PanelRight size={16} />
          </button>
        </div>

        <div className="h-4 w-px bg-zinc-700" />

        {/* File operations */}
        <button
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Open Scene"
        >
          <FolderOpen size={16} />
        </button>
        <button
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Save Scene"
        >
          <Save size={16} />
        </button>
        <button
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
