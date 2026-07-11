/**
 * bonkjs/desktop — the Electron main-process shell for bonk games.
 *
 * Every bonk game is a pixi 2D vite bundle, so the desktop shell is identical
 * across games; only identity (appId/icon/electron-builder config) is per-game.
 * This module owns the shared logic and its hard-won gotchas so they never
 * drift per-game (rationale + research record: docs/DESKTOP.md):
 *
 *  - serves the bundle over a privileged `app://` scheme — vite emits
 *    `<script type="module" crossorigin>` and module scripts are CORS-blocked
 *    on file:// (silent white screen); a standard scheme also gives a real
 *    origin (localStorage, future COOP/COEP headers for SharedArrayBuffer)
 *  - opaque window (transparency/vibrancy kills Chromium's fast composite path)
 *  - backgroundThrottling OFF — the fixed-step sim + websockets survive alt-tab
 *  - gestureless audio (autoplay-policy switch; webPreferences alone is unreliable)
 *  - a smoke mode (BONK_SMOKE=1): boots the game, waits, reports a JSON probe +
 *    collected renderer console errors to stdout, exits — CI/agent verification
 *    without a human at the window
 *
 * Usage (the game's whole main.mjs — Electron ≥28 runs ESM mains):
 *
 *   import { createGameShell } from 'bonkjs/desktop';
 *   createGameShell({ width: 1600, height: 900 });
 *
 * `electron` is NOT a bonkjs dependency — this entry is only ever imported
 * inside an Electron main process (the game's devDependency provides it), so
 * it's externalized from the build and imported dynamically at runtime.
 */

import { resolveServedBundle, checkForBundleUpdate, type RemoteBundleOptions } from './remote-bundle';

export type { RemoteBundleOptions, BundleManifest } from './remote-bundle';

export interface GameShellOptions {
  /**
   * Hot content updates for DIRECT-DOWNLOAD builds (dmg/zip from your site or
   * itch): serve the newest local bundle instantly, background-fetch the
   * deploy's manifest.json, download only changed files (hash-verified),
   * serve on next launch. The ~100MB shell itself never re-downloads.
   *
   * STEAM BUILDS MUST OMIT THIS — Steam delta-patches through its own depot
   * system and players expect patches to arrive through Steam; self-updating
   * content outside Steam's pipeline is policy-gray. Package per channel:
   * the Steam electron-builder config leaves `remoteBundle` out.
   */
  remoteBundle?: RemoteBundleOptions;
  /** Absolute path to the built web bundle. Default: `<appPath>/dist-web`. */
  webDir?: string;
  /**
   * Initial window size. Default 1600×900. This sizes the WEB CONTENT area
   * (useContentSize), not the outer frame — so a 16:9 default is a true 16:9
   * render surface with no letterbox gutters (the title bar would otherwise
   * make the frame's content area wider than the size implies).
   */
  width?: number;
  height?: number;
  /**
   * Lock the window to this width/height aspect ratio while the user resizes,
   * so a fit-scaled game never shows letterbox gutters at any window size.
   * Default: derived from width/height (16:9 at the defaults). Pass `0` to
   * allow free-aspect resizing (gutters will appear off-ratio, by design).
   */
  aspectRatio?: number;
  /** Window background. Keep it OPAQUE. Default '#000000'. */
  backgroundColor?: string;
  /** Absolute path to a preload script (contextIsolation stays on). */
  preload?: string;
  /** Privileged scheme name. Default 'app'. */
  scheme?: string;
  /**
   * Windows only: the App User Model ID — set it to your electron-builder
   * `appId` so the running window groups/pins with the installer's Start-menu
   * shortcut (electron-builder's NSIS installer stamps shortcuts with appId)
   * and toast notifications attribute correctly. Ignored on other platforms.
   */
  appUserModelId?: string;
  /**
   * Smoke-mode probe: a JS expression evaluated in the page after `delayMs`
   * (default 8000). Its JSON result + collected renderer console errors print
   * to stdout as `[smoke] {...}`, then the app quits. Smoke mode runs when
   * BONK_SMOKE=1 is set in the environment.
   * Default probe: `({ canvas: !!document.querySelector('canvas'), title: document.title })`.
   */
  smokeProbe?: string;
  smokeDelayMs?: number;
}

/** Create the game window + serving. Call at the top of the Electron main module. */
export async function createGameShell(opts: GameShellOptions = {}): Promise<void> {
  // Runtime-only import — see module docs. Non-literal specifier: electron is
  // resolved by the game's Electron install at runtime; typecheck/bundle must
  // not try (and no ambient `declare module 'electron'` may ship in our types —
  // it would clash with the game's real electron types).
  const electronSpecifier = 'electron';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const electron: any = await import(/* @vite-ignore */ electronSpecifier);
  const { app, BrowserWindow, protocol, net, screen } = electron;
  const path = await import('node:path');
  const { pathToFileURL } = await import('node:url');

  const scheme = opts.scheme ?? 'app';
  const smoke = !!process.env.BONK_SMOKE;
  const rendererErrors: string[] = [];

  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

  if (process.platform === 'win32' && opts.appUserModelId) {
    app.setAppUserModelId(opts.appUserModelId);
  }

  // Must run before app 'ready' — Electron delays 'ready' until the ESM main
  // module (including this await chain) finishes evaluating, so top-of-main is safe.
  protocol.registerSchemesAsPrivileged([
    { scheme, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
  ]);

  await app.whenReady();

  const webDir = opts.webDir ?? path.join(app.getAppPath(), 'dist-web');

  // remoteBundle: pick the newest LOCAL bundle for this launch (never blocks
  // on the network); the update check runs in the background after the window
  // is up and stages new versions for the NEXT launch.
  let servedDir = webDir;
  let servedManifest = null as import('./remote-bundle').BundleManifest | null;
  let cacheDir = '';
  if (opts.remoteBundle) {
    cacheDir = opts.remoteBundle.cacheDir ?? path.join(app.getPath('userData'), 'bundle-cache');
    const served = await resolveServedBundle(webDir, cacheDir);
    servedDir = served.dir;
    servedManifest = served.manifest;
    console.log(`[shell] serving ${served.source} bundle${served.manifest ? ` ${served.manifest.version.slice(0, 8)}` : ''}`);
  }

  protocol.handle(scheme, (req: { url: string }) => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === '/' || p === '') p = '/index.html';
    const abs = path.resolve(servedDir, `.${p}`);
    if (!abs.startsWith(path.resolve(servedDir) + path.sep)) {
      return new Response('forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(abs).toString());
  });

  const winW = opts.width ?? 1600;
  const winH = opts.height ?? 900;
  const ratio = opts.aspectRatio ?? winW / winH;
  const win = new BrowserWindow({
    width: winW,
    height: winH,
    // Size the WEB CONTENT, not the frame — otherwise the title bar shrinks the
    // content area's height and a fit-scaled game pillarboxes at launch.
    useContentSize: true,
    backgroundColor: opts.backgroundColor ?? '#000000',
    show: false, // shown below, after the work-area fit — avoids a visible resize hop
    webPreferences: {
      ...(opts.preload ? { preload: opts.preload } : {}),
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Fit the requested CONTENT size into the display's WORK AREA, preserving ratio.
  // Windows display scaling (125–150% is the OS default on most modern PCs) shrinks
  // the logical work area — e.g. 1080p at 125% leaves ~864 logical px of height, so
  // a 1600×900 request doesn't fit; the OS clamps the frame's height off-ratio and
  // the fit-scaled game gutters at first launch. Measure this window's real frame
  // overhead (title bar + borders vary per platform/theme), scale the content down
  // on-ratio, re-center. Full screen / maximize behave as before.
  if (ratio > 0) {
    const wa = screen.getPrimaryDisplay().workAreaSize;
    const [outerW, outerH] = win.getSize();
    const [cw, ch] = win.getContentSize();
    const fit = Math.min(1, (wa.width - (outerW - cw)) / winW, (wa.height - (outerH - ch)) / winH);
    if (fit < 1) {
      const h = Math.floor(winH * fit);
      win.setContentSize(Math.round(h * ratio), h);
      win.center();
    }
  }
  win.show();

  // Keep the CONTENT area on-ratio during manual resize (no gutters at any size).
  if (ratio > 0) win.setAspectRatio(ratio, { width: 0, height: 0 });

  win.webContents.on('console-message', (_e: unknown, level: number, message: string) => {
    if (level >= 3) rendererErrors.push(String(message).slice(0, 200));
    if (smoke) console.log('[renderer]', message);
  });

  void win.loadURL(`${scheme}://bundle/`);

  const display = screen.getPrimaryDisplay();
  console.log('[shell] display', display.size, `${display.displayFrequency}Hz`, `scale ${display.scaleFactor}`);

  app.on('window-all-closed', () => app.quit());

  if (opts.remoteBundle) {
    void checkForBundleUpdate({
      opts: opts.remoteBundle,
      packagedDir: webDir,
      cacheDir,
      served: servedManifest,
      servedDir,
      fetch: (url: string) => net.fetch(url),
      log: (msg: string) => console.log('[shell]', msg),
    });
  }

  if (smoke) {
    const probe = opts.smokeProbe
      ?? `({ canvas: !!document.querySelector('canvas'), title: document.title })`;
    setTimeout(async () => {
      try {
        const info = await win.webContents.executeJavaScript(probe);
        console.log('[smoke]', JSON.stringify({ ...info, rendererErrors }));
      } catch (err) {
        console.log('[smoke] FAILED', String(err));
        process.exitCode = 1;
      }
      app.quit();
    }, opts.smokeDelayMs ?? 8000);
  }
}
