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

// Create it on the UI layer, last so it sits on top.
const splash = new BonkSplash(ui, { width: 1920, height: 1080, bgColor: 0x07070d });

let splashActive = true;

// Letter metrics need the font — load it, then build + start.
await document.fonts.load("140px 'Black Ops One'").catch(() => {});
splash.buildLetters();
splash.start(() => {
  splash.destroy();
  splashActive = false;
});

// Drive it with real frame dt (seconds) each render frame:
game.onUpdate(() => {
  if (splashActive) splash.update(Time.unscaledDeltaTime);
  // ...your render...
});

game.start();
```

While `splashActive`, gate any menu/confirm input so a click behind the splash
can't act on the screen it's covering.

## Font

The logo uses **Black Ops One** (falls back to `Impact`). Load it in your page and
`await document.fonts.load(...)` *before* `buildLetters()` so the text metrics are
correct. With Google Fonts:

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
