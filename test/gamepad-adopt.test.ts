import { describe, it, expect } from 'vitest';
import { isAdoptableGamepad } from '../src/GamepadControls';

function pad(over: Partial<Gamepad> & { buttons?: number; axes?: number }): Gamepad {
  const { buttons = 17, axes = 4, ...rest } = over;
  return {
    id: 'Test Pad', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    buttons: Array.from({ length: buttons }, () => ({ pressed: false, touched: false, value: 0 })),
    axes: Array.from({ length: axes }, () => 0),
    vibrationActuator: null as unknown as GamepadHapticActuator,
    ...rest,
  } as unknown as Gamepad;
}

describe('isAdoptableGamepad', () => {
  it('rejects empty slots and disconnected pads', () => {
    expect(isAdoptableGamepad(null, true)).toBe(false);
    expect(isAdoptableGamepad(undefined, true)).toBe(false);
    expect(isAdoptableGamepad(pad({ connected: false }), true)).toBe(false);
  });

  it('always adopts standard-mapped pads', () => {
    expect(isAdoptableGamepad(pad({}), true)).toBe(true);
    expect(isAdoptableGamepad(pad({}), false)).toBe(true);
    // a sparse "standard" pad is still the browser's call — trust the label
    expect(isAdoptableGamepad(pad({ buttons: 10, axes: 2 }), false)).toBe(true);
  });

  it("adopts a standard-SHAPED non-standard pad (Chromium generic mapping, e.g. AYN Thor → mapping '')", () => {
    const thor = pad({ id: 'Xbox 360 Controller (Vendor: 045e Product: 028e)', mapping: '' as GamepadMappingType, buttons: 17, axes: 4 });
    expect(isAdoptableGamepad(thor, true)).toBe(true);
    expect(isAdoptableGamepad(pad({ mapping: '' as GamepadMappingType, buttons: 16, axes: 4 }), true)).toBe(true);
  });

  it('refuses non-standard pads that lack the standard shape (sticks, wheels, 2-axis retro pads)', () => {
    expect(isAdoptableGamepad(pad({ mapping: '' as GamepadMappingType, buttons: 12, axes: 4 }), true)).toBe(false);
    expect(isAdoptableGamepad(pad({ mapping: '' as GamepadMappingType, buttons: 20, axes: 2 }), true)).toBe(false);
  });

  it('strict mode refuses every non-standard pad regardless of shape', () => {
    expect(isAdoptableGamepad(pad({ mapping: '' as GamepadMappingType, buttons: 17, axes: 4 }), false)).toBe(false);
  });
});
