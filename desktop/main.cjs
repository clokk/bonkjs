/**
 * Electron main — the baseline game-shell config from docs/DESKTOP.md.
 * Deliberately minimal: opaque window, backgroundThrottling off, gestureless
 * audio. No cargo-cult GPU flags (see the doc for why each was rejected).
 *
 * BONK_SMOKE=1 → loads the demo, waits 7s, pulls window.__bonkSmoke() +
 * GPU feature status to stdout, exits. Used by `npm run smoke` for automated
 * verification without a human at the window.
 */
const { app, BrowserWindow, screen, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Serve the vite bundle over app:// instead of loadFile — vite emits
// `<script type="module" crossorigin>` and module scripts are CORS-blocked on
// file:// (silent white screen). A privileged standard scheme also gives us a
// real origin (localStorage keys, future COOP/COEP headers for SAB).
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

const SMOKE = !!process.env.BONK_SMOKE;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#000000', // OPAQUE — transparency/vibrancy kills the fast composite path
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false, // THE win: sim + ws survive alt-tab
      autoplayPolicy: 'no-user-gesture-required',
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.on('console-message', (_e, _level, message) => {
    console.log('[renderer]', message);
  });

  // BONK_DEV_URL: point the shell at a dev/preview server (HMR, or isolating
  // app://-serving issues) instead of the packaged bundle.
  win.loadURL(process.env.BONK_DEV_URL || 'app://bundle/');
  return win;
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === '/' || p === '') p = '/index.html';
    return net.fetch(pathToFileURL(path.join(__dirname, 'dist-web', p)).toString());
  });

  const win = createWindow();

  const display = screen.getPrimaryDisplay();
  console.log('[shell] display', display.size, `${display.displayFrequency}Hz`, `scale ${display.scaleFactor}`);

  if (SMOKE) {
    setTimeout(async () => {
      try {
        console.log('[smoke] gpu', JSON.stringify(app.getGPUFeatureStatus()));
        const info = await win.webContents.executeJavaScript(
          'window.__bonkSmoke ? window.__bonkSmoke() : { bootErr: window.__bootErr, canvas: !!document.querySelector("canvas") }'
        );
        console.log('[smoke]', JSON.stringify(info));
      } catch (err) {
        console.log('[smoke] FAILED', String(err));
        process.exitCode = 1;
      }
      app.quit();
    }, 7000);
  }
});

app.on('window-all-closed', () => app.quit());
