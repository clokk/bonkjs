# BonkSplash

A drop-in **BonkJS crash-in logo animation** for your game's page load. "BONK"
letters slam in from above with squash-stretch physics — each impact throwing
debris, shockwaves, and a shake — then "js" springs in from the right, a
Sakurai-style burst fires, the logo settles and holds, and the whole thing fades
out to reveal whatever's behind it (your menu).

It's **self-contained**: it owns its particles, a full-screen flash overlay, and
an internal shake (applied to the content only, so the static backdrop never
edge-reveals). No game systems required — just a UI `Container` and your canvas
dimensions.

## Usage

```ts
import { Game, Time, BonkSplash } from 'bonkjs';

const game = new Game();
const { ui } = await game.init({ width: 1920, height: 1080, backgroundColor: 0x07070d });

// Create it on the UI layer, last so it sits on top. Its solid backdrop covers the
// screen from construction, so the menu behind it stays hidden until the fade.
const splash = new BonkSplash(ui, { width: 1920, height: 1080, bgColor: 0x07070d });

let splashActive = true;

// Drive it with real frame dt (seconds) each render frame.
game.onUpdate(() => {
  if (splashActive) splash.update(Time.unscaledDeltaTime);
  // ...your render...
});

// Start the loop NOW — never block game.start() on the font load (a stalled webfont
// would leave the whole game un-startable). Build the letters once the font is ready,
// racing a timeout so a hung fetch can't delay the splash (letters just use fallback
// metrics if it times out).
game.start();

await Promise.race([
  document.fonts.load("140px 'Black Ops One'"),
  new Promise((resolve) => setTimeout(resolve, 1500)),
]).catch(() => {});
splash.buildLetters();
splash.start(() => {
  splash.destroy();
  splashActive = false;
});
```

See **Integrating without breaking input** below before you wire `splashActive` into
your game's input handling — there's one trap that will make the game feel frozen.

## Integrating without breaking input

The splash is **purely visual** — it does not capture input. While it plays, button
presses still reach the game underneath, and you'll want to ignore them (a press
behind the splash shouldn't act on the menu it's covering). Do that **without
freezing your per-frame state/input tick**:

- ❌ **Don't skip your state-machine tick while `isActive()`.** If you stop ticking,
  your edge-detect buffers (e.g. "was confirm held last frame?") go stale. The frame
  the splash ends, a still-held button (natural — players hold a button to skip a
  splash) reads as a *fresh* press and ghost-fires — instantly starting the run /
  dismissing the menu, or making the menu feel dead. This is the #1 integration trap.
- ✅ **Keep ticking every frame** so edge buffers stay current, and gate only the
  *actions*:

```ts
// in your fixed/update tick — runs every frame, splash or not:
const inputLocked = splashActive;
tickMenu(inputLocked);   // always reads + updates input edge buffers;
                         // only navigates / confirms when !inputLocked
```

When the splash ends, buffers are already current, so a held button correctly reads
as "still held" (no fresh edge) — the player releases and re-presses to act.

## Font

The logo uses **Black Ops One** (falls back to `Impact`). Load it in your page (e.g.
the Google Fonts `<link>` below). Build the letters once it's ready so the text
metrics are correct — but **never block your game loop on the font**; race a timeout
(see Usage) so a stalled fetch can't leave the game un-startable.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Black+Ops+One&display=swap" rel="stylesheet">
```

## API

### `new BonkSplash(parent, opts)`
- `parent: Container` — the UI container to attach to (add it last → renders on top; the splash sets a very high `zIndex` too).
- `opts.width` / `opts.height: number` — logical canvas size the logo lays out against.
- `opts.bgColor?: number` — solid backdrop behind the logo. Default `0x0a0a15`.

### `buildLetters(): void`
Builds the letter `Text` objects. Call **after** the font is loaded.

### `start(onComplete: () => void): void`
Begins the animation. `onComplete` fires once the fade finishes — typically
`destroy()` + clear your "splash active" flag there.

### `isActive(): boolean`
`true` while playing. Use it to gate `update()` and input.

### `update(dt: number): void`
Advance one frame. `dt` is **seconds** (e.g. `Time.unscaledDeltaTime`); it's
internally clamped against long frames. It's a presentation animation — drive it
from `onUpdate`, not the fixed-timestep loop.

### `destroy(): void`
Tears down the splash container and all its children.

## Timing

The full sequence runs ~2.2–2.6s: anticipation → letter slams (staggered) → "js"
slide → burst → settle (with end flash) → hold → fade. All timings are baked-in
constants tuned for the BonkJS logo; the colors are the BonkJS brand amber.
