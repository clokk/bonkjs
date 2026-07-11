/**
 * Desktop smoke-harness demo — a tiny bonkjs game purpose-built to verify the
 * things a desktop wrapper must get right (see docs/DESKTOP.md → derisk spike):
 *
 *   - hardware WebGL (renderer name on the HUD; chrome://gpu is the deep check)
 *   - audio with NO user gesture (boot blip + live AudioContext state readout)
 *   - Gamepad API in the packaged shell (hot-plug id/buttons/axes readout)
 *   - fixed-step sim keeps ticking when the window is unfocused/occluded
 *     (backgroundThrottling: false — watch ticks/s while alt-tabbed)
 *   - fullscreen toggle (F), input edge detection (Space = blip)
 *
 * window.__bonkSmoke() returns the same readings as JSON for the automated
 * smoke run (main.cjs BONK_SMOKE=1 pulls it and exits).
 *
 * NOTE: game boot is a main() call, NOT top-level await — TLA in the entry
 * chunk deadlocks pixi's dynamic browserAll import in production builds (the
 * chunk statically imports back into the still-evaluating entry).
 */
import { Game, Input, Sound } from 'bonkjs';
import { Graphics, Text } from 'pixi.js';

const W = 1920;
const H = 1080;

async function main() {
  const game = new Game();
  const { canvas, app, world, ui } = await game.init({
    width: W,
    height: H,
    backgroundColor: 0x0a0a1a,
    scaleMode: 'fit',
    preference: 'webgl', // DESKTOP.md's "stay on WebGL" call — explicit, never autodetect-surprised
  });
  document.getElementById('app')!.appendChild(canvas);

  // audio: register a blip and fire it AT BOOT — no gesture. In a browser this
  // stays suspended until a click; in the shell (autoplay-policy flag) it must play.
  const sound = new Sound();
  sound.register('blip', { wave: 'square', freq: 660, freqEnd: 990, duration: 0.08, volume: 0.25 });
  sound.play('blip');
  const audioProbe = new AudioContext();

  // sprite field: 300 bouncing squares, individual Graphics (realistic batching)
  const COUNT = 300;
  const sprites: { g: Graphics; vx: number; vy: number }[] = [];
  for (let i = 0; i < COUNT; i++) {
    const size = 8 + Math.random() * 20;
    const g = new Graphics()
      .rect(-size / 2, -size / 2, size, size)
      .fill(Math.floor(0xcccccc * Math.random()) + 0x333333);
    g.position.set(Math.random() * W, Math.random() * H);
    world.addChild(g);
    sprites.push({ g, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6 });
  }

  const hud = new Text({
    text: '',
    style: { fontFamily: 'monospace', fontSize: 26, fill: 0x00ffff, lineHeight: 34 },
  });
  hud.position.set(24, 20);
  ui.addChild(hud);

  // counters
  let ticks = 0;
  let ticksLastSecond = 0;
  let frames = 0;
  let framesLastSecond = 0;
  let tickRate = 0;
  let fps = 0;
  let hiddenTicks = 0; // ticks accumulated while the document was hidden — the throttling proof
  setInterval(() => {
    tickRate = ticks - ticksLastSecond;
    fps = frames - framesLastSecond;
    ticksLastSecond = ticks;
    framesLastSecond = frames;
  }, 1000);

  game.onFixedUpdate(() => {
    ticks++;
    if (document.visibilityState === 'hidden') hiddenTicks++;
    for (const s of sprites) {
      s.g.x += s.vx;
      s.g.y += s.vy;
      if (s.g.x < 0 || s.g.x > W) s.vx *= -1;
      if (s.g.y < 0 || s.g.y > H) s.vy *= -1;
    }
  });

  function gamepadInfo() {
    const pad = [...navigator.getGamepads()].find((p) => p);
    if (!pad) return { connected: false as const };
    return {
      connected: true as const,
      id: pad.id,
      buttons: pad.buttons.map((b, i) => (b.pressed ? i : -1)).filter((i) => i >= 0),
      axes: pad.axes.slice(0, 2).map((a) => Math.round(a * 100) / 100),
    };
  }

  function readings() {
    return {
      renderer: (app.renderer as { name?: string }).name ?? String(app.renderer.type),
      fps,
      tickRate,
      ticks,
      hiddenTicks,
      audio: audioProbe.state,
      gamepad: gamepadInfo(),
      shell: (window as any).bonkDesktop?.versions?.electron ?? 'browser',
    };
  }
  (window as any).__bonkSmoke = readings;

  game.onUpdate(() => {
    frames++;
    if (Input.getKeyDown('Space')) sound.play('blip');
    if (Input.getKeyDown('KeyF')) {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    }
    const r = readings();
    const pad = r.gamepad.connected
      ? `${r.gamepad.id!.slice(0, 40)}  btns:[${r.gamepad.buttons}]  stick:${r.gamepad.axes}`
      : 'none connected (plug in / press a button)';
    hud.text = [
      `bonk desktop smoke harness   shell: electron ${r.shell}`,
      `renderer: ${r.renderer}   fps: ${r.fps}   sim: ${r.tickRate}/s   hidden ticks: ${r.hiddenTicks}`,
      `audio (no gesture): ${r.audio}`,
      `gamepad: ${pad}`,
      `[Space] blip   [F] fullscreen`,
    ].join('\n');
  });

  game.start();
}

void main();
