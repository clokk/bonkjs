# Desktop Builds — Mac + Windows (Electron)

`bonkjs/desktop` turns a bonk game (a pixi 2D vite bundle) into a native
desktop app. The shared shell logic is a subpath export; a game adds one small
`desktop/` folder of identity + packaging config. Working example: the
`desktop/` folder in this repo.

The shell (`createGameShell` + the remoteBundle updater) is platform-agnostic
— one `main.mjs` serves every OS. Per-platform differences live entirely in
`electron-builder.yml` (targets, icons, signing) plus one Windows-only shell
option (`appUserModelId`, below).

## Using the Mac build target

**1. Game main — `<game>/desktop/main.mjs` (this is the whole Electron main):**

```js
import { createGameShell } from 'bonkjs/desktop';

createGameShell({ width: 1600, height: 900 });
```

`createGameShell(opts)` serves the vite bundle over a privileged `app://`
scheme (module scripts are CORS-blocked on `file://` — the silent-white-screen
gotcha), opens an opaque window with `backgroundThrottling: false` (the
fixed-step sim + websockets keep running when unfocused — the big desktop win)
and gestureless audio, and provides a smoke mode. The window sizes its CONTENT
area (`useContentSize`) and fits it into the display's work area on-ratio at
launch (0.6.8 — Windows display scaling at 125–150% otherwise leaves too little
logical height and the OS clamps the frame off-ratio → gutters), then locks the
aspect ratio during manual resize. Options: `webDir`, `width`/
`height`, `backgroundColor`, `preload`, `scheme`, `smokeProbe`, `smokeDelayMs`
— see `GameShellOptions` in `src/desktop/index.ts`.

**2. Package scaffolding — `<game>/desktop/package.json`:**

```json
{
  "private": true,
  "main": "main.mjs",
  "scripts": {
    "web:build": "npm --prefix .. run build && rm -rf dist-web && cp -R ../dist dist-web",
    "start": "npm run web:build && electron .",
    "smoke": "npm run web:build && BONK_SMOKE=1 electron .",
    "dist": "npm run web:build && electron-builder --mac --arm64",
    "dist:notarized": "npm run web:build && electron-builder --mac --arm64 -c.mac.notarize=true"
  },
  "dependencies": { "bonkjs": "^0.6.4" },
  "devDependencies": { "electron": "^40.0.0", "electron-builder": "^26.0.0" }
}
```

`npm run smoke` boots the real game headed for ~8s, prints a JSON probe
(canvas up? renderer console errors?) to stdout, and exits — verification
without a human at the window.

**3. Packaging — `<game>/desktop/electron-builder.yml`** (per-game identity;
see this repo's `desktop/electron-builder.yml` for the full template):
`appId`, `productName`, `mac.icon: build/icon.png` (a 1024×1024 png —
electron-builder generates the .icns), arm64 `zip`+`dmg` targets, and ONE of
the signing modes below. Plus `build/entitlements.mac.plist` — a hardened-
runtime Electron game needs exactly `com.apple.security.cs.allow-jit` (V8);
the template stages the two Steam-overlay entitlements as comments.

**4. Signing modes** (all $-amounts = Apple Developer Program membership):

| Mode | Config | Good for |
|---|---|---|
| Ad-hoc ($0, no account) | `identity: '-'`, `hardenedRuntime: false` | Steam + itch-app installs (they set no quarantine attr → Gatekeeper never fires); direct downloads hit the "Open Anyway" ritual |
| Developer ID signed | omit `identity` (auto-discovered from the keychain), `hardenedRuntime: true` + entitlements | prerequisite for notarization + Mac auto-update |
| + Notarized | `npm run dist:notarized` with `APPLE_API_KEY` / `APPLE_API_KEY_ID` / `APPLE_API_ISSUER` exported (App Store Connect API key — keep in a gitignored env file) | clean zero-dialog direct downloads; requires Xcode's notarytool (accept the Xcode license once) |

Always ship arm64 (or universal): Apple Silicon requires at least an ad-hoc
signature and Rosetta 2 sunsets with macOS 27.

**Gotcha that will bite anyone porting a game:** the entry module must NOT
top-level-await the game boot — TLA in the entry chunk deadlocks pixi's
dynamic `browserAll` import in production vite builds (silent hang, dev server
unaffected). Boot with `void main()`.

## Using the Windows build target

Same shell, same `main.mjs` — plus one Windows-only option:

```js
createGameShell({
  width: 1600,
  height: 900,
  // Match electron-builder's appId: the NSIS installer stamps Start-menu
  // shortcuts with appId as the App User Model ID; setting it at runtime too
  // makes taskbar pinning/grouping and toast notifications attribute to the
  // installed app instead of the bare exe. No-op on Mac/Linux.
  appUserModelId: 'com.yourstudio.yourgame',
});
```

**Packaging** — add a `win` section to `electron-builder.yml` (full template in
this repo's `desktop/electron-builder.yml`): `icon: build/icon.png` (the same
1024 png used for Mac — electron-builder generates the .ico), `nsis` + `zip`
targets, x64 only (Windows-arm64 runs x64 fine; Steam Deck runs the x64 build
via Proton — see Steam notes below). NSIS defaults worth pinning:
`oneClick: true` (per-user install under `%LocalAppData%`, no admin prompt —
right for a game) and `deleteAppDataOnUninstall: false` (an uninstall keeps
saves + the remoteBundle cache).

**Cross-building from macOS/Linux works** (`npm run dist:win`) — electron-
builder edits PE resources and builds the NSIS installer without wine on
modern versions. Unsigned cross-builds are fine; actual Authenticode signing
is the one step that may force a Windows/CI machine depending on the method.

`remoteBundle` hot updates work unchanged — the cache lives under the game's
`userData` (`%AppData%/<productName>/bundle-cache`); staging, hash
verification, and the atomic pointer swap are plain Node `fs` and behave
identically. Same per-channel rule: **the Steam package omits `remoteBundle`.**

### Windows signing reality (the Gatekeeper analogue)

The blocker is **SmartScreen**, not the OS refusing to run. Per channel:

| Channel | Unsigned ($0) | Authenticode signed |
|---|---|---|
| Steam | works — Steam-delivered exes don't get SmartScreen'd | works |
| itch.io via the itch app | works | works |
| Direct web download | "Windows protected your PC" → More info → Run anyway | EV/Trusted-Signing: clean immediately; OV: clean after reputation accrues |
| Auto-update (electron-updater) | discouraged (unsigned updates) | works |

Since 2023 traditional OV certs require hardware tokens (no more .pfx files),
which breaks CI signing. The modern path is **Azure Trusted Signing** (~$10/mo,
cloud-signed, CI-friendly, SmartScreen reputation included) once the direct-
download Windows funnel matters. Until then: unsigned is the correct $0 mode —
the SmartScreen ritual is two clicks, and the Steam/itch channels never see it.

Smoke mode (`BONK_SMOKE=1`) runs on Windows unchanged for on-machine
verification. Note a cross-built exe can't be smoke-tested on the build Mac —
verify the artifact on real Windows (or Proton) before shipping it.

## Update channels — Steam vs direct download (IMPORTANT)

The app is a ~100MB shell that almost never changes wrapping a few-MB game
bundle that changes constantly. How updates reach players is a PER-CHANNEL
decision, and the two channels must be packaged differently:

| | Steam channel | Direct download (your site / itch) |
|---|---|---|
| Game updates | Steam depots delta-patch natively — upload the new build, done | `remoteBundle` hot updates (below) |
| Shell updates | same — it's just part of the depot | rare; electron-updater (needs signed builds) or "grab the new dmg" |
| `remoteBundle` option | **MUST BE OMITTED** | on |

Why the hard rule: Steam players expect patches to arrive through Steam,
Steam's own delta patching makes it redundant, and self-updating game content
outside Steam's pipeline is policy-gray. Keep one electron-builder config per
channel; the Steam one leaves `remoteBundle` out of `main.mjs` (a build-time
env or a second main file — either works).

### remoteBundle — hot content updates for direct-download builds

```js
createGameShell({
  remoteBundle: { manifestUrl: 'https://your-deploy.example/manifest.json' },
});
```

Launch serves the newest LOCAL bundle instantly (packaged fallback or cached
update — never blocks on the network, offline-safe). In the background the
shell fetches the manifest, downloads only files whose sha256 changed (vite's
content-hashed chunks make most updates a few KB–MB; unchanged files are
reused from local copies by hash — large audio never re-downloads), verifies
every hash, stages atomically under the game's userData, and serves the new
version NEXT launch. A running session is never hot-swapped. Failures log and
leave the current bundle untouched.

Generate the manifest at build time and deploy it beside the bundle (then
every web deploy IS the desktop update — one version everywhere, which also
keeps a multiplayer client protocol-aligned with its server):

```js
// scripts/desktop-manifest.mjs — run after vite build; writes dist/manifest.json
// { version: <hash of all file hashes>, builtAt: ISO, files: { path: sha256 } }
```

(Full reference implementation: afterlight's `scripts/desktop-manifest.mjs`;
manifest fetches are cache-busted with a query param — verify your CDN doesn't
serve stale manifests regardless.)

Verified end-to-end 2026-07-11: launch 1 "serving packaged dac0f415 / up to
date"; deploy mutated → launch 2 "staged fa7a20b1 (1 downloaded, 70 reused)";
launch 3 "serving cache fa7a20b1" with the new content live.

### Shell endpoints — letting the game offer a restart (0.6.9)

Staged updates serve NEXT launch, and desktop sessions are long-lived
(backgroundThrottling off — players leave the app open), so the game should
TELL the player when an update is ready. The bridge is two virtual endpoints
on the privileged scheme the shell already owns — no preload, no IPC,
contextIsolation untouched (a plain `fetch` from the game works because the
page's origin IS the scheme):

```
GET  /__shell/status   → { desktop: true, served, staged, updateReady, platform }
POST /__shell/check    → run a manifest check NOW, respond with status after
POST /__shell/relaunch → app.relaunch() + exit — comes back up on the staged bundle
```

The shell re-checks the manifest every 15 minutes on its own; `/__shell/check`
runs one on demand so the game can check at meaningful moments (entering the
main menu; a multiplayer join rejected for protocol mismatch). Recommended
game-side pattern: POST check on every main-menu entry, surface an "update
ready — restart" menu row when `updateReady`, POST relaunch on confirm. **Ask, never force** — an auto-relaunch
mid-session (especially mid-multiplayer-run) is hostile; menu-level restart is
free. On a pre-0.6.9 shell the status fetch just fails — treat that as
"no update info" and show nothing. (Working example: afterlight's
`src/desktop-shell.ts` + its menu row.)

---

# Research & Strategy record (2026-07-11)

Decision record from a four-track research pass (Mac Gatekeeper/signing
reality, wrapper runtime comparison, GPU headroom outside the browser, the
notarization pipeline). Goal: derisk shipping bonkjs games as desktop builds —
Mac first — via Steam and web download, never the App Store.

## Status: shell EXTRACTED to `bonkjs/desktop` (v0.6.4, same day)

The shell logic is a published subpath export — `import { createGameShell }
from 'bonkjs/desktop'` (src/desktop/index.ts): app:// privileged serving (the
file:// module-CORS fix), opaque window, backgroundThrottling off, gestureless
audio, BONK_SMOKE probe mode. A game's main.mjs is ~5 lines of identity —
every bonk game is a pixi 2D vite bundle, so build targets are an engine
concern, not per-game scaffolding. electron stays runtime-provided by the
game (non-literal dynamic import — no dep, no ambient type leak). Per-game
remains: electron-builder.yml (appId/icon/signing), entitlements, certs.
Consumers: desktop/ here (demo) + afterlight/desktop.

## Status: Mac ARM pipeline BUILT + verified (2026-07-11, same day)

`desktop/` holds the working pipeline: Electron 40 (Chromium 144) shell with
the baseline config below, a smoke-harness demo game (`desktop/src/demo.ts` —
renderer/fps/sim-rate/audio/gamepad readouts on the HUD +
`window.__bonkSmoke()` for automation), and electron-builder packaging.
Intel is DROPPED by decision — arm64-only targets (halves artifacts, no
universal build; Rosetta sunsets with macOS 27 anyway).

Verified on the packaged .app (`npm run dist` → `release/`, 123MB):
`Signature=adhoc`, hardware WebGL, **240fps render on a 240Hz display with
the sim locked at 60/s**, audio `running` with zero user gesture. Commands:
`npm run smoke` (7s automated readout), `npm run start` (play with it),
`npm run dist` (package).

Two build gotchas caught live, both environment-independent (hang in Chrome
too, not Electron quirks):

1. **Top-level await deadlocks pixi in production builds.** The entry module
   pauses on `await app.init()`; pixi dynamically imports its `browserAll`
   chunk; that chunk statically imports shared pixi core from the
   still-evaluating entry chunk → ES-module deadlock. Silent hang, no error,
   only in `vite build` output (dev serves unbundled). **Game boot must be
   `void main()`, never top-level await.**
2. **`loadFile` can't run vite output** — vite emits
   `<script type="module" crossorigin>` and module scripts are CORS-blocked
   on `file://` (silent white screen). The shell serves `dist-web/` over a
   privileged `app://` scheme (`protocol.handle` in `main.cjs`), which also
   provides a real origin for localStorage + future COOP/COEP (SAB) headers.

Also: two pixi copies (root bonkjs node_modules vs desktop's) split the
extension registry — `resolve.dedupe: ['pixi.js']` in the vite config guards
it. And `identity: '-'` in electron-builder does exactly what we want:
ad-hoc-signs, skips notarization.

Verified by hand since: gamepad + hot-plug work in the packaged shell; the
worst-tick-gap probe replaced hiddenTicks (backgroundThrottling:false pins
visibilityState to 'visible', so a hidden-tick counter can never fire — read
the worst gap after alt-tabbing instead: ~17ms = never throttled).

## Verdict

**Electron, signed + notarized, ONE build shipped to every channel
(Steam / itch / direct download).** Notarization in 2026 is a solved, boring
pipeline: one-time ~half-day setup, then ~zero human minutes per release
(+5–15 min CI wall clock). It unlocks the one channel that's otherwise broken
— direct web download — plus Mac auto-update and faster first launch on Tahoe.

- **Wrapper: Electron.** Tauri is disqualified by one hard fact: the Gamepad
  API is still broken/unreliable in WKWebView in 2026 — the community answer is
  a Rust-side polyfill plugin (v0.0.x, no haptics, duplicate-connect bugs). For
  a gamepad-first engine that ends the discussion; WKWebView WebGL jitter
  reports and unconfirmed WebGPU-in-webview seal it. NW.js is alive (Chromium
  144, Jan 2026) but buys nothing over Electron except worse tooling. Every
  successful web-tech Steam game shipped Chromium: pre-Unity Vampire Survivors
  (Phaser + Electron), CrossCode (NW.js), Cookie Clicker, shapez, the RPG
  Maker catalog. Zero shipped a system-webview wrapper.
- **Notarize.** Modern path: Developer ID Application cert + hardened runtime
  + `notarytool` (altool is dead). electron-builder has it built in —
  `notarize: true` + env vars; it signs every nested binary/.node
  automatically (unsigned nested binaries are the #1 rejection). Notarization
  is an automated malware scan, not a review — typically 1–5 min. CI does
  100% of it on a macOS GitHub runner with two secrets (`CSC_LINK` base64
  .p12 + `CSC_KEY_PASSWORD`) + an App Store Connect API key (preferred over
  Apple ID — app-specific passwords die when the Apple ID password changes).
  No provisioning profiles, no fastlane — that's App Store machinery.
- **Gatekeeper context (why notarize):** the block only fires on files
  carrying `com.apple.quarantine` (set by browsers). Steam and the itch app
  don't set it — so Steam/itch never needed signing at all (BG3 ships
  un-notarized on Steam Mac; Valve's checkbox is honor-system). But a browser
  download on Sequoia/Tahoe = blocked dialog → System Settings → "Open
  Anyway" → password (the right-click bypass was removed in Sequoia), and
  signed-but-unnotarized gets the SAME treatment as unsigned. Notarization is
  the only fix for the direct-download funnel.
- **Fallback ($0 floor, e.g. other bonkjs games without an account):**
  ad-hoc signing (`codesign -s -` / electron-builder `mac.identity`) is free,
  needs no account, and is REQUIRED on Apple Silicon (kernel kills unsigned
  arm64). Ad-hoc + Steam/itch-app = fully working; only direct download
  suffers. Gotcha: with no cert found electron-builder SKIPS signing — force
  ad-hoc explicitly, and set `hardenedRuntime: false` in that mode.
- Ship arm64 (or universal) from day one: Rosetta 2 sunsets with macOS 27.
- Developer ID certs last 5 years; already-notarized builds keep working
  after cert expiry (secure timestamp). Set a renewal reminder, nothing else.

## Per-channel requirements (Mac)

| Channel | Unsigned/ad-hoc ($0) | Notarized (recommended) |
|---|---|---|
| Steam | works — no quarantine attr | works; checkbox honestly checked |
| itch.io via the itch app | works (butler skips quarantine, fixes exec bits) | works |
| Direct web zip/dmg | "Open Anyway" ritual per user; sometimes no button at all | clean open, no dialogs |
| Auto-update (electron-updater) | NO — Squirrel.Mac validates signatures | works (notarize the zip target too) |

## Entitlements (hardened runtime)

Plain Electron game needs exactly one exception: `com.apple.security.cs.allow-jit`
(V8). `allow-unsigned-executable-memory` is obsolete on Electron ≥12 — drop it
even though old templates still carry it.

Steam build adds the two Valve-documented entitlements (harmless in the
direct-download build — ship ONE plist everywhere):

```xml
<key>com.apple.security.cs.allow-jit</key><true/>
<!-- Steamworks SDK dylib + overlay lib + any non-Apple-signed native module -->
<key>com.apple.security.cs.disable-library-validation</key><true/>
<!-- Steam overlay injects via DYLD_INSERT_LIBRARIES -->
<key>com.apple.security.cs.allow-dyld-environment-variables</key><true/>
```

Never add `com.apple.security.app-sandbox` — Steam is incompatible with it.

```yaml
# electron-builder
mac:
  category: public.app-category.games
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  notarize: true          # APPLE_API_KEY / APPLE_API_KEY_ID / APPLE_API_ISSUER
  target: [dmg, zip]      # zip required for electron-updater
asarUnpack:
  - "**/*.node"
  - "node_modules/steamworks.js/**"   # native addons can't load from asar
```

The Steam DRM wrapper (steamstub) is Windows-PE-only — nothing on Steam's side
touches the Mac signature. Use `SteamAPI_RestartAppIfNecessary` for launch
enforcement instead.

## Performance: what wrapping actually buys

Honest answer: **consistency, not throughput.** Same V8, same ANGLE→Metal
WebGL pipeline, same compositor as a Chrome tab — there is no mechanism for
Electron to beat a tab on raw WebGL throughput, and misconfigured (transparent
window, GPU fallback) it's slower. The real wins, ranked:

1. **`backgroundThrottling: false`** — the categorical win. The fixed-step sim,
   rAF, and WebSockets keep running when the window is unfocused/minimized.
   For multiplayer this is frozen-ghosts → running.
2. **Environment control** — pinned Chromium version, no extensions, no tab
   neighbors, verified `chrome://gpu`. Kills the p99 jank tail, not the
   average frame.
3. **Friction deletion** — audio with no gesture unlock
   (`autoplay-policy=no-user-gesture-required`), gestureless fullscreen +
   pointer lock, no Esc-to-exit banner.
4. **Node in-process** — a game whose server is already Node can host its
   world-sim inside the Electron main process: zero-latency local server,
   offline and online collapse into one code path. (The most bonkjs-shaped
   win on the list.)
5. **`screen.getPrimaryDisplay().displayFrequency`** — real refresh-rate
   detection for frame pacing instead of rAF-delta heuristics.

**Stay on pixi's WebGL renderer, even in Electron.** The pixi team's own
position: 2D workloads are CPU-bound; WebGPU only wins on heavy batch-breaking
(filters/masks) and still carries a bug tail (silent fallback failures, memory
leaks). Revisit only if a heavy fullscreen post-processing layer lands.

Cargo-cult flags to NOT ship (verified dead weight in 2026):
`--disable-frame-rate-limit`/`--disable-gpu-vsync` (flaky, tearing, pointless
with a fixed-step sim), `--enable-zero-copy`/raster threads (DOM tile
pipeline, not canvas), `--force_high_performance_gpu` (no-op on Apple
Silicon), `--use-angle=metal` (already the default), `--max-old-space-size`
past 4GB (pointer-compression cage caps it anyway). Exclusive fullscreen does
not exist on macOS for anyone — always composited; nothing lost vs native.

### Baseline main-process config

```js
const win = new BrowserWindow({
  backgroundColor: '#000000',       // OPAQUE — transparency/vibrancy kills the fast composite path
  webPreferences: {
    backgroundThrottling: false,    // THE win: sim + ws survive alt-tab
    autoplayPolicy: 'no-user-gesture-required',
  },
});
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
```

On the first packaged build, open `chrome://gpu` in the window and confirm
hardware acceleration across the board — misconfiguration is the only way
wrapping makes a game slower than the tab.

## Steam integration notes

- **steamworks.js** (napi-rs) is the maintained binding; Greenworks is
  abandoned-tier. It wants `nodeIntegration` in the game window — decide the
  preload-bridge vs direct posture once, early.
- **Steam Overlay**: works on Windows via `electronEnableSteamOverlay()`
  (`in-process-gpu`); a game that repaints every frame skips the classic
  static-frame freeze hack. **On macOS the overlay does not work in Electron,
  period** — every shipped web-tech game lives without it there
  (achievements/cloud still work).
- **Steam Deck: ship the Windows build, let Proton run it.** Native Linux
  Electron crashes inside the Steam Linux Runtime, and Electron 35 broke the
  Linux overlay. Proton-run Electron gets overlay + Steam Input free. Steam
  Input presents an emulated Xbox pad through the standard Gamepad API
  mapping — existing `getGamepads()` code works unchanged.
- **Pin the Electron major and test around Steam before releases** — overlay
  regressions land in majors (34→35).

## Derisk spike (when we pick this up)

1. Minimal Electron shell around a bonkjs demo: pinned major, the baseline
   config above.
2. Verify: `chrome://gpu` all-hardware, gamepad hot-plug, WebAudio at boot,
   fullscreen toggle, ws connect, alt-tab with the sim still ticking.
3. One-time signing setup (~half a day): Developer ID Application cert
   (Keychain CSR dance), App Store Connect API key, entitlements plist,
   `notarize: true`, GitHub secrets, one full CI sign+notarize run.
4. Notarized dmg → second Mac via browser download → confirm it opens with
   zero dialogs.
5. Later: steamworks.js init behind a flag; Windows build for Deck testing.
