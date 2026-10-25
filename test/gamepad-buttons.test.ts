import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GamepadControls, GamepadButtons, type GamepadButtonMapping } from '../src/GamepadControls';
import { Input } from '../src/Input';

/** One standard-shaped pad in slot 0 whose buttons the test presses by index. */
function fakePad() {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const gp = {
    id: 'Test Pad', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    buttons, axes: [0, 0, 0, 0], vibrationActuator: null,
  } as unknown as Gamepad;
  vi.stubGlobal('window', { addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal('navigator', { getGamepads: () => [gp] });
  return {
    set(button: number, pressed: boolean) {
      buttons[button].pressed = pressed;
      buttons[button].value = pressed ? 1 : 0;
    },
  };
}

function controls(buttons: GamepadButtonMapping[]): GamepadControls {
  const gc = new GamepadControls({ leftStick: false, dpad: false, autoSwitchMode: false, buttons });
  gc.show();
  return gc;
}

/** One frame: clear last frame's edges, then poll the pad. */
function poll(gc: GamepadControls) {
  Input.update();
  gc.update();
}

describe('GamepadControls button mappings', () => {
  let gc: GamepadControls | null = null;
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    gc?.destroy();
    gc = null;
    Input.clearAllVirtualKeys();
    Input.update();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('a single mapping presses on the press edge, holds, and releases on the release edge', () => {
    const pad = fakePad();
    gc = controls([{ button: GamepadButtons.A, key: 'Space' }]);

    pad.set(GamepadButtons.A, true);
    poll(gc);
    expect(Input.getKeyDown('Space')).toBe(true);
    expect(Input.getKey('Space')).toBe(true);

    poll(gc);
    expect(Input.getKeyDown('Space')).toBe(false);
    expect(Input.getKey('Space')).toBe(true);

    pad.set(GamepadButtons.A, false);
    poll(gc);
    expect(Input.getKeyUp('Space')).toBe(true);
    expect(Input.getKey('Space')).toBe(false);
  });

  it('one button mapped to two keys presses and releases both', () => {
    const pad = fakePad();
    gc = controls([
      { button: GamepadButtons.X, key: 'Pad:reload' },
      { button: GamepadButtons.X, key: 'Pad:interact' },
    ]);

    pad.set(GamepadButtons.X, true);
    poll(gc);
    expect(Input.getKeyDown('Pad:reload')).toBe(true);
    expect(Input.getKeyDown('Pad:interact')).toBe(true);

    // Held: neither key is re-pressed on the next poll
    poll(gc);
    expect(Input.getKeyDown('Pad:reload')).toBe(false);
    expect(Input.getKeyDown('Pad:interact')).toBe(false);
    expect(Input.getKey('Pad:reload')).toBe(true);
    expect(Input.getKey('Pad:interact')).toBe(true);

    pad.set(GamepadButtons.X, false);
    poll(gc);
    expect(Input.getKeyUp('Pad:reload')).toBe(true);
    expect(Input.getKeyUp('Pad:interact')).toBe(true);
    expect(Input.getKey('Pad:reload')).toBe(false);
    expect(Input.getKey('Pad:interact')).toBe(false);
  });

  it('a key mapped from two buttons stays held until both are released', () => {
    const pad = fakePad();
    gc = controls([
      { button: GamepadButtons.A, key: 'Space' },
      { button: GamepadButtons.B, key: 'Space' },
    ]);

    pad.set(GamepadButtons.A, true);
    poll(gc);
    pad.set(GamepadButtons.B, true);
    poll(gc);
    pad.set(GamepadButtons.A, false);
    poll(gc);
    expect(Input.getKeyUp('Space')).toBe(false);
    expect(Input.getKey('Space')).toBe(true);

    pad.set(GamepadButtons.B, false);
    poll(gc);
    expect(Input.getKeyUp('Space')).toBe(true);
    expect(Input.getKey('Space')).toBe(false);
  });
});
