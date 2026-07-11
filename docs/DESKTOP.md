# Desktop Builds — Research & Strategy (2026-07-11)

Decision record from a four-track research pass (Mac Gatekeeper/signing reality,
wrapper runtime comparison, GPU headroom outside the browser, the notarization
pipeline). Goal: derisk shipping bonkjs games as desktop builds — Mac first —
via Steam and web download, never the App Store.

Context: Connor HAS a paid Apple Developer account. Notarization is on the
table; the question was whether the headache is worth it. Answer below: yes.

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

Still needs a human at the machine: gamepad hot-plug readout, alt-tab
`hiddenTicks` accumulating (backgroundThrottling proof), the Gatekeeper
"Open Anyway" walk on a second Mac, and the notarization leg (Developer ID
cert + ASC API key — Connor has the account; flip the marked block in
`desktop/electron-builder.yml`).

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
