import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Panel } from '@editor/components/ui';
import { Play, Square, Trash2, RefreshCw, Terminal as TerminalIcon } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

// Check if we're in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

interface PtySession {
  id: string;
  isRunning: boolean;
}

export const ClaudeTerminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [session, setSession] = useState<PtySession | null>(null);

  // Initialize xterm
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: '#0c0a09',     // retro-bg (stone-950)
        foreground: '#e4e4e7',
        cursor: '#38bdf8',         // retro-blue (sky-400)
        cursorAccent: '#0c0a09',
        selectionBackground: 'rgba(56, 189, 248, 0.3)',
        black: '#0c0a09',
        red: '#ff2a6d',            // retro-red
        green: '#00ff9f',          // retro-green
        yellow: '#facc15',         // retro-yellow (yellow-400)
        blue: '#38bdf8',           // retro-blue (sky-400)
        magenta: '#bd00ff',        // retro-purple
        cyan: '#38bdf8',           // retro-blue
        white: '#e4e4e7',
      },
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      fontSize: 13,
      cursorBlink: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalRef.current);

    // Initial fit after a small delay
    setTimeout(() => fitAddon.fit(), 0);

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalRef.current);

    // Welcome message
    terminal.writeln('\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[36m║     Bonk Engine - Claude Terminal        ║\x1b[0m');
    terminal.writeln('\x1b[36m╚══════════════════════════════════════════╝\x1b[0m');
    terminal.writeln('');

    if (!isTauri()) {
      terminal.writeln('\x1b[33m⚠ Running in browser mode.\x1b[0m');
      terminal.writeln('\x1b[33m  Run with `npm run tauri:dev` for full terminal support.\x1b[0m');
      terminal.writeln('');
    } else {
      terminal.writeln('\x1b[32m✓ Tauri detected. Click "Start" to launch Claude CLI.\x1b[0m');
      terminal.writeln('');
    }

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Set up Tauri event listeners
  useEffect(() => {
    if (!isTauri()) return;

    const setupListeners = async () => {
      const { listen } = await import('@tauri-apps/api/event');

      const unlistenData = await listen<{ session_id: string; data: string }>(
        'pty-data',
        (event) => {
          if (event.payload.session_id === session?.id && xtermRef.current) {
            xtermRef.current.write(event.payload.data);
          }
        }
      );

      const unlistenExit = await listen<{ session_id: string; code: number }>(
        'pty-exit',
        (event) => {
          if (event.payload.session_id === session?.id) {
            setSession((prev) => (prev ? { ...prev, isRunning: false } : null));
            xtermRef.current?.writeln(
              `\r\n\x1b[90m[Process exited with code ${event.payload.code}]\x1b[0m`
            );
          }
        }
      );

      return () => {
        unlistenData();
        unlistenExit();
      };
    };

    const cleanup = setupListeners();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [session?.id]);

  // Handle user input
  useEffect(() => {
    if (!xtermRef.current || !session?.isRunning || !isTauri()) return;

    const terminal = xtermRef.current;

    const disposable = terminal.onData(async (data) => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('write_pty', { sessionId: session.id, data });
    });

    return () => disposable.dispose();
  }, [session?.id, session?.isRunning]);

  // Spawn Claude CLI
  const handleSpawn = useCallback(async () => {
    if (!isTauri()) {
      xtermRef.current?.writeln('\x1b[31mError: Terminal only works in Tauri mode.\x1b[0m');
      return;
    }

    const sessionId = crypto.randomUUID();
    xtermRef.current?.clear();
    xtermRef.current?.writeln('\x1b[36mStarting Claude CLI...\x1b[0m\r\n');

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('spawn_pty', { sessionId, cwd: process.cwd() });
      setSession({ id: sessionId, isRunning: true });

      // Resize to match terminal
      if (xtermRef.current && fitAddonRef.current) {
        fitAddonRef.current.fit();
        await invoke('resize_pty', {
          sessionId,
          cols: xtermRef.current.cols,
          rows: xtermRef.current.rows,
        });
      }
    } catch (err) {
      xtermRef.current?.writeln(`\r\n\x1b[31mFailed to start Claude: ${err}\x1b[0m`);
      setSession(null);
    }
  }, []);

  // Kill session
  const handleKill = useCallback(async () => {
    if (!session?.id || !isTauri()) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('kill_pty', { sessionId: session.id });
      setSession(null);
    } catch (err) {
      console.error('Failed to kill session:', err);
    }
  }, [session?.id]);

  // Clear terminal
  const handleClear = useCallback(() => {
    xtermRef.current?.clear();
  }, []);

  // Restart
  const handleRestart = useCallback(async () => {
    await handleKill();
    setTimeout(handleSpawn, 100);
  }, [handleKill, handleSpawn]);

  return (
    <Panel
      title="Claude"
      actions={
        <div className="flex items-center gap-2">
          {!session?.isRunning ? (
            <button
              onClick={handleSpawn}
              disabled={!isTauri()}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-sky-400/20 text-sky-400 hover:bg-sky-400/30 disabled:opacity-50 disabled:cursor-not-allowed border border-sky-400/30"
              title="Start Claude CLI"
            >
              <Play size={12} /> Start
            </button>
          ) : (
            <button
              onClick={handleKill}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-400/20 text-red-400 hover:bg-red-400/30 border border-red-400/30"
              title="Stop Claude CLI"
            >
              <Square size={12} /> Stop
            </button>
          )}

          <div className="h-4 w-px bg-zinc-700" />

          <button
            onClick={handleClear}
            className="text-zinc-500 hover:text-zinc-300"
            title="Clear Terminal"
          >
            <Trash2 size={14} />
          </button>

          <button
            onClick={handleRestart}
            disabled={!session?.isRunning}
            className="text-zinc-500 hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Restart Claude"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      }
      className="h-full"
    >
      <div className="relative h-full w-full">
        <div ref={terminalRef} className="h-full w-full p-2" />
      </div>
    </Panel>
  );
};
