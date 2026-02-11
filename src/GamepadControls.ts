/**
 * Gamepad/controller support for bonkjs.
 * Polls the browser Gamepad API and injects virtual keys via Input.setVirtualKey().
 * All game logic, multiplayer networking, and input systems work with zero changes.
 */

import { Input } from './Input';

// ==================== Standard Button Constants ====================

export const GamepadButtons = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  Back: 8, Start: 9, LS: 10, RS: 11,
  DpadUp: 12, DpadDown: 13, DpadLeft: 14, DpadRight: 15,
  Home: 16,
} as const;

// ==================== Config Types ====================

export interface GamepadStickConfig {
  /** Key codes for each direction. Default: arrow keys */
  keys?: { up?: string; down?: string; left?: string; right?: string };
  /** Scaled radial deadzone (0–1). Default: 0.25 */
  deadzone?: number;
  /** Enable 8-way input (diagonals). Default: true */
  eightWay?: boolean;
}

export interface GamepadButtonMapping {
  /** Standard gamepad button index (use GamepadButtons constants). */
  button: number;
  /** Key code to inject (e.g. 'Space'). */
  key: string;
}

export interface GamepadControlsConfig {
  /** Left stick config, or false to disable. Default: arrow keys */
  leftStick?: GamepadStickConfig | false;
  /** Right stick config, or false to disable. Default: disabled */
  rightStick?: GamepadStickConfig | false;
  /** Button mappings. Default: none */
  buttons?: GamepadButtonMapping[];
  /** D-pad key mappings, or false to disable. Default: same keys as left stick */
  dpad?: { up?: string; down?: string; left?: string; right?: string } | false;
  /** Gamepad index to use. Default: 0 */
  gamepadIndex?: number;
  /** Auto-switch input mode when gamepad input detected. Default: true */
  autoSwitchMode?: boolean;
}

// ==================== Defaults ====================

const DEFAULT_STICK_KEYS = {
  up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
};

const DEFAULT_DEADZONE = 0.25;
const STICK_DIGITAL_THRESHOLD = 0.4;

// ==================== GamepadControls Class ====================

export class GamepadControls {
  private readonly config: Required<Pick<GamepadControlsConfig, 'gamepadIndex' | 'autoSwitchMode'>>;
  private leftStickConfig: { keys: NonNullable<GamepadStickConfig['keys']>; deadzone: number; eightWay: boolean } | null;
  private readonly rightStickConfig: { keys: NonNullable<GamepadStickConfig['keys']>; deadzone: number; eightWay: boolean } | null;
  private buttonMappings: GamepadButtonMapping[];
  private readonly dpadKeys: { up?: string; down?: string; left?: string; right?: string } | null;

  // Active key tracking — separate sets per source to avoid conflicts
  private activeStickKeys = new Set<string>();
  private activeDpadKeys = new Set<string>();
  private activeRightStickKeys = new Set<string>();
  private activeButtonKeys = new Set<string>();

  // Previous button states for edge detection
  private prevButtonStates = new Map<number, boolean>();

  // Raw analog stick values (post-deadzone, cached during update)
  private _leftStickValue = { x: 0, y: 0 };
  private _rightStickValue = { x: 0, y: 0 };
  private _leftStickDeadzone: number;
  private _rightStickDeadzone: number;

  private _enabled = false;
  private _connected = false;
  private destroyed = false;

  // Event handler refs for cleanup
  private onGamepadConnected: ((e: GamepadEvent) => void) | null = null;
  private onGamepadDisconnected: ((e: GamepadEvent) => void) | null = null;
  private unsubscribeInputMode: (() => void) | null = null;

  constructor(config?: GamepadControlsConfig) {
    this.config = {
      gamepadIndex: config?.gamepadIndex ?? 0,
      autoSwitchMode: config?.autoSwitchMode ?? true,
    };

    // Left stick
    if (config?.leftStick === false) {
      this.leftStickConfig = null;
    } else {
      const stickCfg = config?.leftStick ?? {};
      this.leftStickConfig = {
        keys: stickCfg.keys ? { ...stickCfg.keys } : { ...DEFAULT_STICK_KEYS },
        deadzone: stickCfg.deadzone ?? DEFAULT_DEADZONE,
        eightWay: stickCfg.eightWay ?? true,
      };
    }

    // Right stick
    if (!config?.rightStick) {
      this.rightStickConfig = null;
    } else {
      const stickCfg = config.rightStick;
      this.rightStickConfig = {
        keys: stickCfg.keys ? { ...stickCfg.keys } : { ...DEFAULT_STICK_KEYS },
        deadzone: stickCfg.deadzone ?? DEFAULT_DEADZONE,
        eightWay: stickCfg.eightWay ?? true,
      };
    }

    // Buttons
    this.buttonMappings = config?.buttons ?? [];

    // D-pad — defaults to same keys as left stick
    if (config?.dpad === false) {
      this.dpadKeys = null;
    } else if (config?.dpad) {
      this.dpadKeys = config.dpad;
    } else if (this.leftStickConfig) {
      this.dpadKeys = { ...this.leftStickConfig.keys };
    } else {
      this.dpadKeys = null;
    }

    // Cache deadzones for raw value processing (used even if digital injection is disabled)
    this._leftStickDeadzone = this.leftStickConfig?.deadzone ?? DEFAULT_DEADZONE;
    this._rightStickDeadzone = this.rightStickConfig?.deadzone ?? DEFAULT_DEADZONE;

    // Connection detection
    this.onGamepadConnected = (e: GamepadEvent) => {
      if (e.gamepad.index === this.config.gamepadIndex && e.gamepad.mapping === 'standard') {
        this._connected = true;
        console.log(`[GamepadControls] connected: ${e.gamepad.id}`);
      }
    };
    this.onGamepadDisconnected = (e: GamepadEvent) => {
      if (e.gamepad.index === this.config.gamepadIndex) {
        this._connected = false;
        this.releaseAllKeys();
        console.log(`[GamepadControls] disconnected: ${e.gamepad.id}`);
      }
    };
    window.addEventListener('gamepadconnected', this.onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);

    // Check if already connected
    this.checkInitialConnection();

    // Subscribe to input mode changes — release keys when mode switches away from gamepad
    if (this.config.autoSwitchMode) {
      this.unsubscribeInputMode = Input.onInputModeChange((mode) => {
        if (mode !== 'gamepad') {
          this.releaseAllKeys();
        }
      });
    }
  }

  // ==================== Polling ====================

  /** Poll gamepad state and inject virtual keys. Call once per frame in onUpdate(). */
  update(): void {
    if (!this._enabled || this.destroyed) return;

    const gamepad = this.getGamepad();
    if (!gamepad) {
      this._leftStickValue.x = 0; this._leftStickValue.y = 0;
      this._rightStickValue.x = 0; this._rightStickValue.y = 0;
      return;
    }

    let hadInput = false;

    // Cache raw analog values (always, regardless of digital config).
    // Does NOT contribute to hadInput — prevents idle stick drift from triggering mode switch.
    this._leftStickValue = this.applyRadialDeadzone(gamepad.axes[0], gamepad.axes[1], this._leftStickDeadzone);
    this._rightStickValue = this.applyRadialDeadzone(gamepad.axes[2], gamepad.axes[3], this._rightStickDeadzone);

    // Left stick — digital key injection
    if (this.leftStickConfig) {
      const result = this.pollStick(gamepad.axes[0], gamepad.axes[1], this.leftStickConfig, this.activeStickKeys, 'stick');
      if (result) hadInput = true;
    }

    // Right stick — digital key injection
    if (this.rightStickConfig) {
      const result = this.pollStick(gamepad.axes[2], gamepad.axes[3], this.rightStickConfig, this.activeRightStickKeys, 'rightStick');
      if (result) hadInput = true;
    }

    // D-pad
    if (this.dpadKeys) {
      const result = this.pollDpad(gamepad.buttons, this.dpadKeys);
      if (result) hadInput = true;
    }

    // Buttons
    const buttonResult = this.pollButtons(gamepad.buttons);
    if (buttonResult) hadInput = true;

    // Switch input mode on any gamepad input
    if (hadInput && this.config.autoSwitchMode) {
      Input.setInputMode('gamepad');
    }
  }

  // ==================== Stick Polling ====================

  private pollStick(
    rawX: number, rawY: number,
    config: { keys: NonNullable<GamepadStickConfig['keys']>; deadzone: number; eightWay: boolean },
    activeKeys: Set<string>,
    source: 'stick' | 'rightStick',
  ): boolean {
    // Scaled radial deadzone
    const magnitude = Math.sqrt(rawX * rawX + rawY * rawY);
    let nx = 0, ny = 0;

    if (magnitude > config.deadzone) {
      // Rescale [deadzone..1] to [0..1]
      const rescaled = Math.min((magnitude - config.deadzone) / (1 - config.deadzone), 1);
      nx = (rawX / magnitude) * rescaled;
      ny = (rawY / magnitude) * rescaled;
    }

    // Convert to digital keys
    const newKeys = new Set<string>();
    if (magnitude > config.deadzone) {
      if (config.eightWay) {
        if (nx < -STICK_DIGITAL_THRESHOLD && config.keys.left) newKeys.add(config.keys.left);
        if (nx > STICK_DIGITAL_THRESHOLD && config.keys.right) newKeys.add(config.keys.right);
        if (ny < -STICK_DIGITAL_THRESHOLD && config.keys.up) newKeys.add(config.keys.up);
        if (ny > STICK_DIGITAL_THRESHOLD && config.keys.down) newKeys.add(config.keys.down);
      } else {
        // 4-way: strongest axis wins
        if (Math.abs(nx) > Math.abs(ny)) {
          if (nx < 0 && config.keys.left) newKeys.add(config.keys.left);
          if (nx > 0 && config.keys.right) newKeys.add(config.keys.right);
        } else {
          if (ny < 0 && config.keys.up) newKeys.add(config.keys.up);
          if (ny > 0 && config.keys.down) newKeys.add(config.keys.down);
        }
      }
    }

    // Diff: release old, press new
    for (const key of activeKeys) {
      if (!newKeys.has(key)) {
        activeKeys.delete(key);
        if (this.shouldReleaseKey(key, source)) {
          Input.setVirtualKey(key, false);
        }
      }
    }
    for (const key of newKeys) {
      if (!activeKeys.has(key)) {
        activeKeys.add(key);
        Input.setVirtualKey(key, true);
      }
    }

    // Only report input when digital keys are active (intentional deflection, not idle drift)
    return newKeys.size > 0;
  }

  // ==================== D-pad Polling ====================

  private pollDpad(
    buttons: readonly GamepadButton[],
    dpadKeys: { up?: string; down?: string; left?: string; right?: string },
  ): boolean {
    const newKeys = new Set<string>();
    let hadInput = false;

    if (buttons[GamepadButtons.DpadUp]?.pressed && dpadKeys.up) { newKeys.add(dpadKeys.up); hadInput = true; }
    if (buttons[GamepadButtons.DpadDown]?.pressed && dpadKeys.down) { newKeys.add(dpadKeys.down); hadInput = true; }
    if (buttons[GamepadButtons.DpadLeft]?.pressed && dpadKeys.left) { newKeys.add(dpadKeys.left); hadInput = true; }
    if (buttons[GamepadButtons.DpadRight]?.pressed && dpadKeys.right) { newKeys.add(dpadKeys.right); hadInput = true; }

    // Diff: release old, press new
    for (const key of this.activeDpadKeys) {
      if (!newKeys.has(key)) {
        this.activeDpadKeys.delete(key);
        if (this.shouldReleaseKey(key, 'dpad')) {
          Input.setVirtualKey(key, false);
        }
      }
    }
    for (const key of newKeys) {
      if (!this.activeDpadKeys.has(key)) {
        this.activeDpadKeys.add(key);
        Input.setVirtualKey(key, true);
      }
    }

    return hadInput;
  }

  // ==================== Button Polling ====================

  private pollButtons(buttons: readonly GamepadButton[]): boolean {
    let hadInput = false;

    for (const mapping of this.buttonMappings) {
      const btn = buttons[mapping.button];
      if (!btn) continue;

      const wasPressed = this.prevButtonStates.get(mapping.button) ?? false;
      const isPressed = btn.pressed;
      this.prevButtonStates.set(mapping.button, isPressed);

      if (isPressed && !wasPressed) {
        // Button just pressed
        this.activeButtonKeys.add(mapping.key);
        Input.setVirtualKey(mapping.key, true);
        hadInput = true;
      } else if (!isPressed && wasPressed) {
        // Button just released
        this.activeButtonKeys.delete(mapping.key);
        if (this.shouldReleaseKey(mapping.key, 'button')) {
          Input.setVirtualKey(mapping.key, false);
        }
        hadInput = true;
      } else if (isPressed) {
        hadInput = true;
      }
    }

    return hadInput;
  }

  // ==================== Key Conflict Resolution ====================

  /** Check if a key can be released — only if no other source still holds it. */
  private shouldReleaseKey(key: string, excludeSource: 'stick' | 'dpad' | 'button' | 'rightStick'): boolean {
    if (excludeSource !== 'stick' && this.activeStickKeys.has(key)) return false;
    if (excludeSource !== 'dpad' && this.activeDpadKeys.has(key)) return false;
    if (excludeSource !== 'button' && this.activeButtonKeys.has(key)) return false;
    if (excludeSource !== 'rightStick' && this.activeRightStickKeys.has(key)) return false;
    return true;
  }

  /** Release all virtual keys held by gamepad. */
  private releaseAllKeys(): void {
    for (const key of this.activeStickKeys) Input.setVirtualKey(key, false);
    for (const key of this.activeDpadKeys) Input.setVirtualKey(key, false);
    for (const key of this.activeRightStickKeys) Input.setVirtualKey(key, false);
    for (const key of this.activeButtonKeys) Input.setVirtualKey(key, false);
    this.activeStickKeys.clear();
    this.activeDpadKeys.clear();
    this.activeRightStickKeys.clear();
    this.activeButtonKeys.clear();
    this.prevButtonStates.clear();
  }

  // ==================== Connection ====================

  private getGamepad(): Gamepad | null {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.config.gamepadIndex];
    if (gp && gp.mapping === 'standard' && gp.connected) {
      this._connected = true;
      return gp;
    }
    return null;
  }

  /** Apply scaled radial deadzone — returns processed {x, y} with smooth 0→1 ramp. */
  private applyRadialDeadzone(rawX: number, rawY: number, deadzone: number): { x: number; y: number } {
    const magnitude = Math.sqrt(rawX * rawX + rawY * rawY);
    if (magnitude < deadzone) return { x: 0, y: 0 };
    const rescaled = Math.min((magnitude - deadzone) / (1 - deadzone), 1);
    return { x: (rawX / magnitude) * rescaled, y: (rawY / magnitude) * rescaled };
  }

  private checkInitialConnection(): void {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.config.gamepadIndex];
    if (gp && gp.mapping === 'standard' && gp.connected) {
      this._connected = true;
      console.log(`[GamepadControls] already connected: ${gp.id}`);
    }
  }

  /** Whether a gamepad is currently connected. */
  get connected(): boolean {
    return this._connected;
  }

  // ==================== Analog Stick Values ====================

  /** Left stick analog value (post-deadzone). x/y range: -1 to 1. Updated during update(). */
  get leftStickValue(): Readonly<{ x: number; y: number }> {
    return this._leftStickValue;
  }

  /** Right stick analog value (post-deadzone). x/y range: -1 to 1. Updated during update(). */
  get rightStickValue(): Readonly<{ x: number; y: number }> {
    return this._rightStickValue;
  }

  // ==================== Visibility ====================

  /** Enable gamepad polling (e.g. entering gameplay). */
  show(): void {
    this._enabled = true;
  }

  /** Disable gamepad polling and release all keys (e.g. entering menu). */
  hide(): void {
    this._enabled = false;
    this.releaseAllKeys();
  }

  /** Whether gamepad polling is enabled. */
  get isVisible(): boolean {
    return this._enabled;
  }

  // ==================== Dynamic Mapping ====================

  /** Swap button mappings at runtime (e.g. different mappings for menus vs gameplay).
   *  Releases all currently active button keys and resets edge detection state. */
  setButtons(mappings: GamepadButtonMapping[]): void {
    // Release all active button keys cleanly
    for (const key of this.activeButtonKeys) {
      if (this.shouldReleaseKey(key, 'button')) {
        Input.setVirtualKey(key, false);
      }
    }
    this.activeButtonKeys.clear();
    this.prevButtonStates.clear();
    this.buttonMappings = mappings;
  }

  /** Swap left stick config at runtime (e.g. movement-only during aiming, full 8-way during DI).
   *  Releases all currently active left stick keys. Pass false to disable. */
  setLeftStick(config: GamepadStickConfig | false): void {
    for (const key of this.activeStickKeys) {
      if (this.shouldReleaseKey(key, 'stick')) {
        Input.setVirtualKey(key, false);
      }
    }
    this.activeStickKeys.clear();
    if (config === false) {
      this.leftStickConfig = null;
    } else {
      this.leftStickConfig = {
        keys: config.keys ? { ...config.keys } : { ...DEFAULT_STICK_KEYS },
        deadzone: config.deadzone ?? this.leftStickConfig?.deadzone ?? DEFAULT_DEADZONE,
        eightWay: config.eightWay ?? this.leftStickConfig?.eightWay ?? true,
      };
    }
  }

  // ==================== Vibration ====================

  /** Trigger gamepad vibration. Silently fails on unsupported browsers/gamepads. */
  vibrate(duration: number, weakMagnitude = 0.5, strongMagnitude = 0.5): void {
    const gamepad = this.getGamepad();
    if (!gamepad?.vibrationActuator) return;
    try {
      gamepad.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration,
        weakMagnitude,
        strongMagnitude,
      });
    } catch {
      // Unsupported — silent fail
    }
  }

  // ==================== Cleanup ====================

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.releaseAllKeys();

    if (this.onGamepadConnected) {
      window.removeEventListener('gamepadconnected', this.onGamepadConnected);
    }
    if (this.onGamepadDisconnected) {
      window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    }
    if (this.unsubscribeInputMode) {
      this.unsubscribeInputMode();
    }
  }
}
