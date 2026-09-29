import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from 'pixi.js';
import { Game } from '../src/Game';
import { Time } from '../src/Time';
import { Camera } from '../src/Camera';

describe('Game.tick + Time.alpha', () => {
  beforeEach(() => {
    Time.reset();
    Time.fixedDeltaTime = 1 / 20;
  });

  it('runs fixed ticks at the configured rate and exposes the leftover as alpha', () => {
    const game = new Game();
    let ticks = 0;
    const alphas: number[] = [];
    game.onFixedUpdate(() => ticks++);
    game.onUpdate(() => alphas.push(Time.alpha));

    game.tick(0.025);                 // half a 20Hz step
    expect(ticks).toBe(0);
    expect(alphas[0]).toBeCloseTo(0.5);

    game.tick(0.0375);                // accumulator 0.0625 → 1 tick, 0.0125 left
    expect(ticks).toBe(1);
    expect(alphas[1]).toBeCloseTo(0.25);
  });

  it('timeScale 0 freezes ticks and alpha', () => {
    const game = new Game();
    let ticks = 0;
    game.onFixedUpdate(() => ticks++);
    game.tick(0.025);
    Time.timeScale = 0;
    game.tick(1);
    expect(ticks).toBe(0);
    expect(Time.alpha).toBeCloseTo(0.5);
  });

  it('rejects a non-positive fixed step', () => {
    expect(() => { Time.fixedDeltaTime = 0; }).toThrow();
    expect(Time.fixedDeltaTime).toBeCloseTo(1 / 20);
  });

  it('reset() leaves the fixed step alone', () => {
    Time.reset();
    expect(Time.fixedDeltaTime).toBeCloseTo(1 / 20);
  });
});

describe('Camera', () => {
  beforeEach(() => {
    Time.reset();
    Time.fixedDeltaTime = 1 / 60;
  });

  it('worldToScreen inverts screenToWorld (no shake)', () => {
    const cam = new Camera(new Container(), { viewport: { width: 800, height: 600 }, zoom: 2 });
    cam.snapTo(100, 50);
    const [sx, sy] = cam.worldToScreen(110, 40);
    expect([sx, sy]).toEqual([420, 280]);
    const [wx, wy] = cam.screenToWorld(sx, sy);
    expect(wx).toBeCloseTo(110);
    expect(wy).toBeCloseTo(40);
  });

  it('interpolate: apply() renders between the last two ticks by Time.alpha', () => {
    const world = new Container();
    let target: [number, number] = [0, 0];
    const cam = new Camera(world, { viewport: { width: 800, height: 600 }, followSmoothing: 60, interpolate: true });
    cam.follow(() => target);
    target = [60, 0];
    cam.tick();                       // smoothing*dt = 1 → snaps to 60 this tick
    Time.alpha = 0.5;
    cam.apply();
    expect(world.position.x).toBeCloseTo(400 - 30);
    expect(cam.screenToWorld(400, 300)[0]).toBeCloseTo(30);
  });
});
