import React from 'react';
import { AppHeader } from './AppHeader';
import { Hierarchy } from '@editor/components/panels/Hierarchy';
import { Inspector } from '@editor/components/panels/Inspector';
import { EditorViewport } from '@editor/components/viewport/EditorViewport';
import { ProjectFiles } from '@editor/components/panels/ProjectFiles';
import { ConsolePanel } from '@editor/components/panels/ConsolePanel';
import { ClaudeTerminal } from '@editor/components/panels/ClaudeTerminal';
import { ResizeHandle } from '@editor/components/ui';
import { useEditorStore } from '@editor/store/editorStore';
import { cn } from '@editor/lib/utils';

export const EditorLayout: React.FC = () => {
  // Layout State
  const hierarchyWidth = useEditorStore((state) => state.hierarchyWidth);
  const setHierarchyWidth = useEditorStore((state) => state.setHierarchyWidth);
  const inspectorWidth = useEditorStore((state) => state.inspectorWidth);
  const setInspectorWidth = useEditorStore((state) => state.setInspectorWidth);
  const bottomPanelHeight = useEditorStore((state) => state.bottomPanelHeight);
  const setBottomPanelHeight = useEditorStore((state) => state.setBottomPanelHeight);

  // Panel Visibility
  const showHierarchy = useEditorStore((state) => state.showHierarchy);
  const showInspector = useEditorStore((state) => state.showInspector);
  const showBottomPanel = useEditorStore((state) => state.showBottomPanel);

  // Bottom Panel Tabs
  const activeBottomPanel = useEditorStore((state) => state.activeBottomPanel);
  const setActiveBottomPanel = useEditorStore((state) => state.setActiveBottomPanel);

  const bottomPanelTabs = [
    { id: 'project' as const, label: 'Project' },
    { id: 'console' as const, label: 'Console' },
    { id: 'claude' as const, label: 'Claude' },
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-200 font-sans overflow-hidden">
      <AppHeader />

      {/* Main Workspace */}
      <main className="flex-1 flex min-h-0 bg-zinc-950 p-1 gap-1">
        {/* Left Sidebar: Hierarchy */}
        {showHierarchy && (
          <>
            <aside
              className="flex-shrink-0 flex flex-col min-h-0 min-w-0"
              style={{ width: hierarchyWidth }}
            >
              <Hierarchy />
            </aside>

            <ResizeHandle
              orientation="vertical"
              onResize={(delta) =>
                setHierarchyWidth(Math.max(150, Math.min(400, hierarchyWidth + delta)))
              }
            />
          </>
        )}

        {/* Center Column: Viewport + Bottom Panel */}
        <div className="flex-1 flex flex-col min-w-0 gap-1">
          {/* Viewport */}
          <section className="flex-1 bg-zinc-950 relative min-h-0 min-w-0">
            <EditorViewport />
          </section>

          {/* Bottom Panel Resizer */}
          {showBottomPanel && (
            <ResizeHandle
              orientation="horizontal"
              onResize={(delta) =>
                setBottomPanelHeight(Math.max(100, Math.min(500, bottomPanelHeight - delta)))
              }
            />
          )}

          {/* Bottom Panel: Project / Console / Claude */}
          {showBottomPanel && (
            <section
              className="flex-shrink-0 flex flex-col min-w-0"
              style={{ height: bottomPanelHeight }}
            >
              {/* Tab Bar */}
              <div className="flex bg-zinc-950 gap-0.5 overflow-hidden flex-shrink-0">
                {bottomPanelTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveBottomPanel(tab.id)}
                    className={cn(
                      'px-4 py-1 text-xs rounded-t-lg cursor-pointer select-none transition-colors font-mono',
                      activeBottomPanel === tab.id
                        ? 'bg-zinc-900 text-sky-400 font-bold border-t-2 border-sky-400'
                        : 'bg-zinc-900/30 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0 relative">
                <div className={cn('h-full', activeBottomPanel === 'project' ? '' : 'hidden')}>
                  <ProjectFiles />
                </div>
                <div className={cn('h-full', activeBottomPanel === 'console' ? '' : 'hidden')}>
                  <ConsolePanel />
                </div>
                <div className={cn('h-full', activeBottomPanel === 'claude' ? '' : 'hidden')}>
                  <ClaudeTerminal />
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Inspector Resizer */}
        {showInspector && (
          <ResizeHandle
            orientation="vertical"
            onResize={(delta) =>
              setInspectorWidth(Math.max(200, Math.min(500, inspectorWidth - delta)))
            }
            onDoubleClick={() => setInspectorWidth(300)}
          />
        )}

        {/* Right Sidebar: Inspector */}
        {showInspector && (
          <aside
            className="flex-shrink-0 flex flex-col min-h-0"
            style={{ width: inspectorWidth }}
          >
            <Inspector />
          </aside>
        )}
      </main>
    </div>
  );
};
