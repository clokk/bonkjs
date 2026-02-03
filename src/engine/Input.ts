/**
 * Input system for Bonk Engine.
 * Unity-style input handling with axes, buttons, and raw key access.
 */

import type { Vector2, AxisConfig, ButtonConfig, InputConfig } from './types';

/** Default input configuration */
const DEFAULT_CONFIG: InputConfig = {
  axes: {
    horizontal: {
      negative: ['KeyA', 'ArrowLeft'],
      positive: ['KeyD', 'ArrowRight'],
      smoothing: 10,
    },
    vertical: {
      negative: ['KeyW', 'ArrowUp'],
      positive: ['KeyS', 'ArrowDown'],
      smoothing: 10,
    },
  },
  buttons: {
    jump: { keys: ['Space'] },
    fire: { keys: ['KeyX', 'Mouse0'] },
  },
};

export class Input {
  // ==================== Key State ====================

  /** Keys currently held down */
  private static keysHeld: Set<string> = new Set();

  /** Keys pressed this frame */
  private static keysDown: Set<string> = new Set();

  /** Keys released this frame */
  private static keysUp: Set<string> = new Set();

  // ==================== Mouse State ====================

  /** Mouse buttons currently held (0=left, 1=middle, 2=right) */
  private static mouseButtonsHeld: Set<number> = new Set();

  /** Mouse buttons pressed this frame */
  private static mouseButtonsDown: Set<number> = new Set();

  /** Mouse buttons released this frame */
  private static mouseButtonsUp: Set<number> = new Set();

  /** Current mouse position relative to canvas */
  private static _mousePosition: Vector2 = [0, 0];

  // ==================== Axis State ====================

  /** Smoothed axis values */
  private static axisValues: Map<string, number> = new Map();

  // ==================== Configuration ====================

  /** Current input configuration */
  private static config: InputConfig = DEFAULT_CONFIG;

  /** Canvas element for mouse position calculation */
  private static canvas: HTMLCanvasElement | null = null;

  /** Whether input is initialized */
  private static initialized: boolean = false;

  // ==================== Event Handlers ====================

  private static onKeyDown = (event: KeyboardEvent): void => {
    if (!Input.keysHeld.has(event.code)) {
      Input.keysDown.add(event.code);
    }
    Input.keysHeld.add(event.code);
  };

  private static onKeyUp = (event: KeyboardEvent): void => {
    Input.keysHeld.delete(event.code);
    Input.keysUp.add(event.code);
  };

  private static onMouseDown = (event: MouseEvent): void => {
    if (!Input.mouseButtonsHeld.has(event.button)) {
      Input.mouseButtonsDown.add(event.button);
    }
    Input.mouseButtonsHeld.add(event.button);
  };

  private static onMouseUp = (event: MouseEvent): void => {
    Input.mouseButtonsHeld.delete(event.button);
    Input.mouseButtonsUp.add(event.button);
  };

  private static onMouseMove = (event: MouseEvent): void => {
    if (Input.canvas) {
      const rect = Input.canvas.getBoundingClientRect();
      Input._mousePosition = [
        event.clientX - rect.left,
        event.clientY - rect.top,
      ];
    } else {
      Input._mousePosition = [event.clientX, event.clientY];
    }
  };

  private static onContextMenu = (event: MouseEvent): void => {
    // Prevent right-click menu on canvas
    if (Input.canvas && event.target === Input.canvas) {
      event.preventDefault();
    }
  };

  // ==================== Lifecycle ====================

  /**
   * Initialize the input system.
   * Call once at startup.
   */
  static initialize(canvas?: HTMLCanvasElement): void {
    if (this.initialized) {
      console.warn('Input system already initialized');
      return;
    }

    this.canvas = canvas ?? null;

    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Mouse events
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('contextmenu', this.onContextMenu);

    // Initialize axis values
    for (const axis of Object.keys(this.config.axes)) {
      this.axisValues.set(axis, 0);
    }

    this.initialized = true;
    console.log('Input system initialized');
  }

  /**
   * Update input state.
   * Call at the start of each frame, after Time.update().
   */
  static update(): void {
    // Clear per-frame state from previous frame
    this.keysDown.clear();
    this.keysUp.clear();
    this.mouseButtonsDown.clear();
    this.mouseButtonsUp.clear();

    // Update smoothed axis values
    this.updateAxes();
  }

  /**
   * Destroy the input system and remove all listeners.
   */
  static destroy(): void {
    if (!this.initialized) return;

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('contextmenu', this.onContextMenu);

    this.keysHeld.clear();
    this.keysDown.clear();
    this.keysUp.clear();
    this.mouseButtonsHeld.clear();
    this.mouseButtonsDown.clear();
    this.mouseButtonsUp.clear();
    this.axisValues.clear();

    this.canvas = null;
    this.initialized = false;
    console.log('Input system destroyed');
  }

  // ==================== Axis Updates ====================

  private static updateAxes(): void {
    const dt = 1 / 60; // Use fixed timestep for consistent smoothing

    for (const [name, axisConfig] of Object.entries(this.config.axes)) {
      const rawValue = this.getAxisRaw(name);
      const currentValue = this.axisValues.get(name) ?? 0;
      const smoothing = axisConfig.smoothing ?? 10;

      if (smoothing === 0) {
        // Instant
        this.axisValues.set(name, rawValue);
      } else {
        // Smooth interpolation
        const lerpFactor = Math.min(1, smoothing * dt);
        const newValue = currentValue + (rawValue - currentValue) * lerpFactor;
        // Snap to zero if close enough
        this.axisValues.set(name, Math.abs(newValue) < 0.001 ? 0 : newValue);
      }
    }
  }

  // ==================== Axis API ====================

  /**
   * Get a smoothed axis value between -1 and 1.
   */
  static getAxis(name: string): number {
    return this.axisValues.get(name) ?? 0;
  }

  /**
   * Get raw axis value: -1, 0, or 1 (no smoothing).
   */
  static getAxisRaw(name: string): number {
    const axisConfig = this.config.axes[name];
    if (!axisConfig) return 0;

    let value = 0;

    // Check negative keys
    for (const key of axisConfig.negative) {
      if (this.isKeyOrMouseHeld(key)) {
        value -= 1;
        break;
      }
    }

    // Check positive keys
    for (const key of axisConfig.positive) {
      if (this.isKeyOrMouseHeld(key)) {
        value += 1;
        break;
      }
    }

    return value;
  }

  // ==================== Button API ====================

  /**
   * Check if a button is currently held.
   */
  static getButton(name: string): boolean {
    const buttonConfig = this.config.buttons[name];
    if (!buttonConfig) return false;

    for (const key of buttonConfig.keys) {
      if (this.isKeyOrMouseHeld(key)) return true;
    }
    return false;
  }

  /**
   * Check if a button was pressed this frame.
   */
  static getButtonDown(name: string): boolean {
    const buttonConfig = this.config.buttons[name];
    if (!buttonConfig) return false;

    for (const key of buttonConfig.keys) {
      if (this.isKeyOrMouseDown(key)) return true;
    }
    return false;
  }

  /**
   * Check if a button was released this frame.
   */
  static getButtonUp(name: string): boolean {
    const buttonConfig = this.config.buttons[name];
    if (!buttonConfig) return false;

    for (const key of buttonConfig.keys) {
      if (this.isKeyOrMouseUp(key)) return true;
    }
    return false;
  }

  // ==================== Raw Key API ====================

  /**
   * Check if a key is currently held.
   * @param code KeyboardEvent.code (e.g., 'KeyW', 'Space', 'ArrowUp')
   */
  static getKey(code: string): boolean {
    return this.keysHeld.has(code);
  }

  /**
   * Check if a key was pressed this frame.
   */
  static getKeyDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  /**
   * Check if a key was released this frame.
   */
  static getKeyUp(code: string): boolean {
    return this.keysUp.has(code);
  }

  // ==================== Mouse API ====================

  /**
   * Current mouse position relative to canvas (or window if no canvas).
   */
  static get mousePosition(): Vector2 {
    return [...this._mousePosition] as Vector2;
  }

  /**
   * Check if a mouse button is currently held.
   * @param button 0=left, 1=middle, 2=right
   */
  static getMouseButton(button: number): boolean {
    return this.mouseButtonsHeld.has(button);
  }

  /**
   * Check if a mouse button was pressed this frame.
   */
  static getMouseButtonDown(button: number): boolean {
    return this.mouseButtonsDown.has(button);
  }

  /**
   * Check if a mouse button was released this frame.
   */
  static getMouseButtonUp(button: number): boolean {
    return this.mouseButtonsUp.has(button);
  }

  // ==================== Configuration ====================

  /**
   * Configure an axis.
   */
  static setAxis(name: string, config: AxisConfig): void {
    this.config.axes[name] = config;
    if (!this.axisValues.has(name)) {
      this.axisValues.set(name, 0);
    }
  }

  /**
   * Configure a button.
   */
  static setButton(name: string, config: ButtonConfig): void {
    this.config.buttons[name] = config;
  }

  /**
   * Set the entire input configuration.
   */
  static setConfig(config: InputConfig): void {
    this.config = config;
    // Reset axis values
    this.axisValues.clear();
    for (const axis of Object.keys(config.axes)) {
      this.axisValues.set(axis, 0);
    }
  }

  // ==================== Helpers ====================

  private static isKeyOrMouseHeld(key: string): boolean {
    if (key.startsWith('Mouse')) {
      const button = parseInt(key.slice(5), 10);
      return this.mouseButtonsHeld.has(button);
    }
    return this.keysHeld.has(key);
  }

  private static isKeyOrMouseDown(key: string): boolean {
    if (key.startsWith('Mouse')) {
      const button = parseInt(key.slice(5), 10);
      return this.mouseButtonsDown.has(button);
    }
    return this.keysDown.has(key);
  }

  private static isKeyOrMouseUp(key: string): boolean {
    if (key.startsWith('Mouse')) {
      const button = parseInt(key.slice(5), 10);
      return this.mouseButtonsUp.has(button);
    }
    return this.keysUp.has(key);
  }
}
