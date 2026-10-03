import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Game } from '../src/Game';
import { Time } from '../src/Time';
import { Input } from '../src/Input';

/** Fake rAF + clock: `frame(ms)` advances time and runs the one pending frame callback. */
function fakeLoop() {
  let now = 0;
  let pending: (() => void) | null = null;
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => { pending = cb; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { pending = null; });
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  return {
    hasPending: () => pending !== null,
    frame(ms: number) {
      now += ms;
      const cb = pending;
      pending = null;
      cb?.();
    },
  };
}

describe('Game loop', () => {
  beforeEach(() => {
    Time.reset();
    Time.fixedDeltaTime = 1 / 16;   // exact in binary, so tick counts are exact
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Time.fixedDeltaTime = 1 / 60;
  });

  it('keeps running after a callback throws', () => {
    const loop = fakeLoop();
    const game = new Game();
    let frames = 0;
    let boom = false;
    game.onUpdate(() => { frames++; if (boom) throw new Error('boom'); });

    game.start();
    boom = true;
    expect(() => loop.frame(16)).toThrow('boom');
    expect(loop.hasPending()).toBe(true);       // next frame was requested before the tick threw

    boom = false;
    loop.frame(16);
    expect(frames).toBe(3);
    game.stop();
  });

  it('stop() from inside a callback cancels the pending frame', () => {
    const loop = fakeLoop();
    const game = new Game();
    game.onUpdate(() => game.stop());
    game.start();
    expect(loop.hasPending()).toBe(false);
  });

  it('clears per-frame input even when a callback throws', () => {
    const clear = vi.spyOn(Input, 'update');
    const game = new Game();
    game.onUpdate(() => { throw new Error('boom'); });
    expect(() => game.tick(0.016)).toThrow('boom');
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('clamps frame dt to maxDeltaTime (default 0.25, configurable)', () => {
    const loop = fakeLoop();
    const game = new Game();
    let ticks = 0;
    game.onFixedUpdate(() => ticks++);
    game.start();

    loop.frame(1000);                            // 1s gap, default clamp 0.25s → 4 ticks at 16Hz
    expect(ticks).toBe(4);
    expect(Time.deltaTime).toBeCloseTo(0.25);

    ticks = 0;
    game.maxDeltaTime = 1;
    loop.frame(5000);                            // clamped to 1s → 16 ticks
    expect(ticks).toBe(16);
    game.stop();
  });

  it('rejects a non-positive maxDeltaTime', () => {
    const game = new Game();
    expect(() => { game.maxDeltaTime = 0; }).toThrow();
    expect(() => { game.maxDeltaTime = NaN; }).toThrow();
    expect(game.maxDeltaTime).toBe(0.25);
  });
});
