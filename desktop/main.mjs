// bonk desktop demo — the whole Electron main. Shell logic lives in bonkjs/desktop
// (app:// serving, baseline window config, smoke mode); this file is per-game identity only.
import { createGameShell } from 'bonkjs/desktop';
import path from 'node:path';

createGameShell({
  width: 1280,
  height: 720,
  preload: path.join(import.meta.dirname, 'preload.cjs'),
  smokeProbe: 'window.__bonkSmoke ? window.__bonkSmoke() : { canvas: !!document.querySelector("canvas") }',
  smokeDelayMs: 7000,
});
