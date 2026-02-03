import React, { useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, Info, Trash2 } from 'lucide-react';
import { Panel, ScrollArea } from '@editor/components/ui';
import { useEditorStore } from '@editor/store/editorStore';
import { cn } from '@editor/lib/utils';

export const ConsolePanel: React.FC = () => {
  const consoleLogs = useEditorStore((state) => state.consoleLogs);
  const addConsoleLog = useEditorStore((state) => state.addConsoleLog);
  const clearConsoleLogs = useEditorStore((state) => state.clearConsoleLogs);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  // Intercept console.log/warn/error and add to store
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    const createLog = (type: 'log' | 'warn' | 'error' | 'info', args: unknown[]) => {
      const message = args
        .map((arg) =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(' ');

      addConsoleLog({
        id: crypto.randomUUID(),
        type,
        message,
        timestamp: Date.now(),
      });
    };

    console.log = (...args) => {
      originalLog.apply(console, args);
      createLog('log', args);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      createLog('warn', args);
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      createLog('error', args);
    };

    console.info = (...args) => {
      originalInfo.apply(console, args);
      createLog('info', args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
    };
  }, [addConsoleLog]);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle size={12} className="text-retro-red" />;
      case 'warn':
        return <AlertTriangle size={12} className="text-retro-yellow" />;
      case 'info':
        return <Info size={12} className="text-retro-blue" />;
      default:
        return null;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Panel
      title="Console"
      actions={
        <button
          onClick={clearConsoleLogs}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Clear Console"
        >
          <Trash2 size={12} />
        </button>
      }
      className="h-full"
    >
      <div ref={scrollRef} className="h-full overflow-y-auto font-mono text-xs">
        {consoleLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <p>No console output</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {consoleLogs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  'flex items-start gap-2 px-2 py-1 hover:bg-white/5',
                  log.type === 'error' && 'bg-retro-red/5',
                  log.type === 'warn' && 'bg-retro-yellow/5'
                )}
              >
                {/* Icon */}
                <span className="mt-0.5 w-3">{getLogIcon(log.type)}</span>

                {/* Message */}
                <span
                  className={cn(
                    'flex-1 whitespace-pre-wrap break-all',
                    log.type === 'error' && 'text-retro-red',
                    log.type === 'warn' && 'text-retro-yellow',
                    log.type === 'info' && 'text-retro-blue',
                    log.type === 'log' && 'text-zinc-300'
                  )}
                >
                  {log.message}
                </span>

                {/* Timestamp */}
                <span className="text-zinc-600 text-[10px] shrink-0">
                  {formatTime(log.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
};
