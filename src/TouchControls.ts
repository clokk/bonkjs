/**
 * Virtual touch controls for bonkjs.
 * Provides a joystick + configurable action buttons that inject into Input's key state.
 * All game logic, multiplayer networking, and axis/button systems work with zero changes.
 */

import { Container, Graphics, Text, type FederatedPointerEvent } from 'pixi.js';
import { Input } from './Input';

/** Convert DOM pointer coordinates to virtual canvas coordinates. */
function domToVirtual(clientX: number, clientY: number, canvasWidth: number, canvasHeight: number): { x: number; y: number } | null {
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * canvasWidth,
    y: ((clientY - rect.top) / rect.height) * canvasHeight,
  };
}

// ==================== Config Types ====================

export interface TouchJoystickConfig {
  /** Position as fraction of canvas [x, y]. Default: [0.15, 0.7] */
  position?: [number, number];
  /** Outer ring radius in pixels. Default: 80 */
  radius?: number;
  /** Key codes for each direction. Default: arrow keys */
  keys?: { up?: string; down?: string; left?: string; right?: string };
  /** Fraction of radius for deadzone. Default: 0.2 */
  deadzone?: number;
  /** Enable 8-way input (diagonals). Default: true */
  eightWay?: boolean;
}

export interface TouchButtonConfig {
  /** Key code to inject (e.g. 'Space'). */
  key: string;
  /** Label text (e.g. 'FIRE'). */
  label?: string;
  /** Position as fraction of canvas [x, y]. */
  position?: [number, number];
  /** Button radius in pixels. Default: 50 */
  radius?: number;
  /** Tint color. Default: 0xffffff */
  color?: number;
  /** Compound button: key injected on press (instead of key), released on any release. */
  holdKey?: string;
  /** Compound button: drag outside cancel radius → release holdKey without tapping key. */
  cancelOnLeave?: boolean;
  /** Button becomes an analog aim stick (drag to aim, release to fire). */
  aimStick?: boolean;
  /** Aim stick deadzone fraction. Default: 0.2 */
  aimStickDeadzone?: number;
  /** Cancel zone multiplier of radius. Default: 1.5, use 2.5 for aim stick. */
  cancelRadius?: number;
}

export interface TouchControlsConfig {
  /** Canvas width in virtual pixels (for position calculation). */
  canvasWidth: number;
  /** Canvas height in virtual pixels (for position calculation). */
  canvasHeight: number;
  /** Joystick config, or false to disable. Default: enabled with defaults. */
  joystick?: TouchJoystickConfig | false;
  /** Action button configs. Default: none. */
  buttons?: TouchButtonConfig[];
  /** Base alpha for controls. Default: 0.35 */
  alpha?: number;
  /** Auto-swap between touch/keyboard mode based on last input type. Default: true */
  autoHideOnKeyboard?: boolean;
}

// ==================== Defaults ====================

const DEFAULT_JOYSTICK: Required<TouchJoystickConfig> = {
  position: [0.15, 0.7],
  radius: 80,
  keys: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' },
  deadzone: 0.2,
  eightWay: true,
};

const DEFAULT_BUTTON: Required<Omit<TouchButtonConfig, 'key' | 'label' | 'holdKey' | 'cancelOnLeave' | 'aimStick' | 'aimStickDeadzone' | 'cancelRadius'>> = {
  position: [0.85, 0.7],
  radius: 50,
  color: 0xffffff,
};

// ==================== TouchControls Class ====================

export class TouchControls {
  /** Root container — add children or restyle. */
  readonly container: Container;
  /** Joystick sub-container, or null if disabled. */
  readonly joystickContainer: Container | null = null;
  /** Button sub-containers in config order. */
  readonly buttonContainers: Container[] = [];

  private readonly uiContainer: Container;
  private readonly config: TouchControlsConfig;
  private readonly baseAlpha: number;

  // Joystick state
  private joystickKnob: Graphics | null = null;
  private joystickCenterX = 0;
  private joystickCenterY = 0;
  private joystickRadius = 80;
  private joystickDeadzone = 0.2;
  private joystickEightWay = true;
  private joystickKeys = DEFAULT_JOYSTICK.keys;
  private joystickPointerId: number | null = null;
  private joystickActiveKeys: Set<string> = new Set();
  private joystickOuter: Graphics | null = null;

  // Button state
  private buttonData: {
    key: string; holdKey?: string; cancelOnLeave?: boolean;
    centerX: number; centerY: number; cancelled: boolean;
    pointerId: number | null; gfx: Graphics; radius: number;
    aimStick: boolean; aimStickDeadzone: number; cancelRadiusMult: number;
    knob: Graphics | null; labelText: Text | null; originalLabel: string;
    inCancelZone: boolean; originalColor: number;
  }[] = [];

  // Aim stick analog value (like gamepad right stick)
  private _aimStickValue = { x: 0, y: 0 };
  /** Current aim stick analog value (x, y in -1..1 range). */
  get aimStickValue(): Readonly<{ x: number; y: number }> { return this._aimStickValue; }

  // Input mode detection — two independent visibility layers:
  //   _enabled: game-level (menu vs gameplay) — controlled by show()/hide()
  //   Input.inputMode: shared 'keyboard' | 'touch' | 'gamepad' — controlled by auto-hide system
  // Container visible = _enabled && Input.inputMode === 'touch'
  private autoHide: boolean;
  private onTouchStartForShow: (() => void) | null = null;
  private onVisibilityChange: (() => void) | null = null;
  private unsubscribeInputMode: (() => void) | null = null;

  // Bound handler refs for cleanup
  private onWindowPointerMove: ((e: PointerEvent) => void) | null = null;
  private onWindowPointerUp: ((e: PointerEvent) => void) | null = null;

  private _enabled = true;
  private destroyed = false;

  constructor(uiContainer: Container, config: TouchControlsConfig) {
    this.uiContainer = uiContainer;
    this.config = config;
    this.baseAlpha = config.alpha ?? 0.35;
    this.autoHide = config.autoHideOnKeyboard ?? true;

    this.container = new Container();
    this.container.alpha = this.baseAlpha;
    this.container.interactiveChildren = true;
    uiContainer.addChild(this.container);

    // Build joystick
    if (config.joystick !== false) {
      const jcfg = { ...DEFAULT_JOYSTICK, ...config.joystick };
      this.joystickRadius = jcfg.radius;
      this.joystickDeadzone = jcfg.deadzone;
      this.joystickEightWay = jcfg.eightWay;
      this.joystickKeys = { ...DEFAULT_JOYSTICK.keys, ...jcfg.keys };
      this.joystickCenterX = jcfg.position[0] * config.canvasWidth;
      this.joystickCenterY = jcfg.position[1] * config.canvasHeight;
      this.joystickContainer = this.buildJoystick();
      this.container.addChild(this.joystickContainer);
    }

    // Build buttons
    if (config.buttons) {
      for (const bcfg of config.buttons) {
        const btn = this.buildButton(bcfg);
        this.container.addChild(btn);
        this.buttonContainers.push(btn);
      }
    }

    // All drag/release tracking via DOM events — PixiJS events on uiContainer
    // are unreliable because it has no eventMode set.
    this.onWindowPointerMove = (e: PointerEvent) => this.handleWindowPointerMove(e);
    this.onWindowPointerUp = (e: PointerEvent) => this.handleWindowPointerUp(e);
    window.addEventListener('pointermove', this.onWindowPointerMove);
    window.addEventListener('pointerup', this.onWindowPointerUp);
    window.addEventListener('pointercancel', this.onWindowPointerUp);

    // Input mode detection — instant swap via shared Input.inputMode.
    // Any keypress → keyboard mode (Input.onKeyDown calls setInputMode('keyboard'))
    // Any touch → touch mode (touchstart calls setInputMode('touch'))
    // Any gamepad input → gamepad mode (GamepadControls calls setInputMode('gamepad'))
    // Subscribe to shared mode changes to show/hide controls.
    if (this.autoHide) {
      this.onTouchStartForShow = () => {
        if (this.destroyed) return;
        Input.setInputMode('touch');
      };

      this.unsubscribeInputMode = Input.onInputModeChange((mode) => {
        if (this.destroyed) return;
        if (mode === 'touch') {
          if (this._enabled) {
            this.container.visible = true;
          }
        } else {
          if (this._enabled) {
            this.container.visible = false;
            Input.clearAllVirtualKeys();
            this.releaseAllJoystickKeys();
            this.releaseAllButtons();
          }
        }
      });

      window.addEventListener('touchstart', this.onTouchStartForShow);
    }

    // Tab switch — clear all virtual keys to prevent stuck inputs
    this.onVisibilityChange = () => {
      if (document.hidden) {
        Input.clearAllVirtualKeys();
        this.releaseAllJoystickKeys();
        this.releaseAllButtons();
      }
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  // ==================== Joystick ====================

  private buildJoystick(): Container {
    const c = new Container();
    c.position.set(this.joystickCenterX, this.joystickCenterY);

    // Outer ring — subtle fill + stroke for visibility on dark backgrounds
    const outer = new Graphics();
    outer.circle(0, 0, this.joystickRadius);
    outer.fill({ color: 0xffffff, alpha: 0.04 });
    outer.circle(0, 0, this.joystickRadius);
    outer.stroke({ width: 3, color: 0xffffff, alpha: 0.4 });
    outer.alpha = 0.5;
    c.addChild(outer);
    this.joystickOuter = outer;

    // Inner knob
    const knob = new Graphics();
    knob.circle(0, 0, this.joystickRadius * 0.35);
    knob.fill({ color: 0xffffff, alpha: 0.6 });
    c.addChild(knob);
    this.joystickKnob = knob;

    // Hit area — generous touch target
    const hitBg = new Graphics();
    hitBg.circle(0, 0, this.joystickRadius * 1.3);
    hitBg.fill({ color: 0x000000, alpha: 0.001 }); // near-invisible but interactive
    hitBg.eventMode = 'static';
    hitBg.cursor = 'pointer';
    c.addChildAt(hitBg, 0);

    hitBg.on('pointerdown', (e: FederatedPointerEvent) => {
      if (this.joystickPointerId !== null) return; // already tracking
      this.joystickPointerId = e.pointerId;
      // Use PixiJS local coords for the initial press (hit area guarantees accuracy)
      const local = this.joystickContainer!.toLocal(e.global);
      this.updateJoystickFromLocal(local.x, local.y);
      if (this.joystickOuter) this.joystickOuter.alpha = 0.8;
    });

    return c;
  }

  /** Update joystick from local coordinates (relative to joystick center). */
  private updateJoystickFromLocal(dx: number, dy: number): void {
    if (!this.joystickKnob) return;

    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp knob to radius
    const clampedDist = Math.min(dist, this.joystickRadius);
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;
    this.joystickKnob.position.set(knobX, knobY);

    // Determine active keys
    const newKeys = new Set<string>();
    const norm = dist / this.joystickRadius;

    if (norm > this.joystickDeadzone) {
      const nx = dx / dist;
      const ny = dy / dist;

      if (this.joystickEightWay) {
        // 8-way: independent axis thresholds
        const threshold = 0.4;
        if (nx < -threshold && this.joystickKeys.left) newKeys.add(this.joystickKeys.left);
        if (nx > threshold && this.joystickKeys.right) newKeys.add(this.joystickKeys.right);
        if (ny < -threshold && this.joystickKeys.up) newKeys.add(this.joystickKeys.up);
        if (ny > threshold && this.joystickKeys.down) newKeys.add(this.joystickKeys.down);
      } else {
        // 4-way: strongest axis wins
        if (Math.abs(nx) > Math.abs(ny)) {
          if (nx < 0 && this.joystickKeys.left) newKeys.add(this.joystickKeys.left);
          if (nx > 0 && this.joystickKeys.right) newKeys.add(this.joystickKeys.right);
        } else {
          if (ny < 0 && this.joystickKeys.up) newKeys.add(this.joystickKeys.up);
          if (ny > 0 && this.joystickKeys.down) newKeys.add(this.joystickKeys.down);
        }
      }
    }

    // Diff: release old, press new
    for (const key of this.joystickActiveKeys) {
      if (!newKeys.has(key)) {
        Input.setVirtualKey(key, false);
      }
    }
    for (const key of newKeys) {
      if (!this.joystickActiveKeys.has(key)) {
        Input.setVirtualKey(key, true);
      }
    }
    this.joystickActiveKeys = newKeys;
  }

  private releaseJoystick(): void {
    this.joystickPointerId = null;
    if (this.joystickKnob) this.joystickKnob.position.set(0, 0);
    if (this.joystickOuter) this.joystickOuter.alpha = 0.5;
    this.releaseAllJoystickKeys();
  }

  private releaseAllJoystickKeys(): void {
    for (const key of this.joystickActiveKeys) {
      Input.setVirtualKey(key, false);
    }
    this.joystickActiveKeys.clear();
  }

  // ==================== Buttons ====================

  private buildButton(bcfg: TouchButtonConfig): Container {
    const c = new Container();
    const pos = bcfg.position ?? DEFAULT_BUTTON.position;
    const radius = bcfg.radius ?? DEFAULT_BUTTON.radius;
    const color = bcfg.color ?? DEFAULT_BUTTON.color;
    const isAimStick = bcfg.aimStick ?? false;

    c.position.set(pos[0] * this.config.canvasWidth, pos[1] * this.config.canvasHeight);

    // Circle — subtle fill + stroke for visibility on dark backgrounds
    const gfx = new Graphics();
    gfx.circle(0, 0, radius);
    gfx.fill({ color, alpha: 0.08 });
    gfx.circle(0, 0, radius);
    gfx.stroke({ width: 3, color, alpha: 0.5 });
    c.addChild(gfx);

    // Label — sized proportionally to button radius for mobile readability
    let labelText: Text | null = null;
    if (bcfg.label) {
      labelText = new Text({
        text: bcfg.label,
        style: {
          fontFamily: 'monospace',
          fontSize: Math.round(radius * 0.45),
          fontWeight: 'bold',
          fill: color,
          align: 'center',
        },
      });
      labelText.anchor.set(0.5);
      labelText.alpha = 0.8;
      c.addChild(labelText);
    }

    // Aim stick knob — initially hidden, shown on press
    let knob: Graphics | null = null;
    if (isAimStick) {
      knob = new Graphics();
      knob.circle(0, 0, radius * 0.35);
      knob.fill({ color: 0xffffff, alpha: 0.6 });
      knob.visible = false;
      c.addChild(knob);
    }

    // Hit area — aim stick gets a larger touch target for generous drag zone
    const hitBg = new Graphics();
    hitBg.circle(0, 0, radius * (isAimStick ? 2.8 : 1.3));
    hitBg.fill({ color: 0x000000, alpha: 0.001 });
    hitBg.eventMode = 'static';
    hitBg.cursor = 'pointer';
    c.addChildAt(hitBg, 0);

    const centerX = pos[0] * this.config.canvasWidth;
    const centerY = pos[1] * this.config.canvasHeight;
    const data = {
      key: bcfg.key, holdKey: bcfg.holdKey, cancelOnLeave: bcfg.cancelOnLeave,
      centerX, centerY, cancelled: false, pointerId: null as number | null, gfx, radius,
      aimStick: isAimStick, aimStickDeadzone: bcfg.aimStickDeadzone ?? 0.2,
      cancelRadiusMult: bcfg.cancelRadius ?? 1.5,
      knob, labelText, originalLabel: bcfg.label ?? '', inCancelZone: false,
      originalColor: color,
    };
    this.buttonData.push(data);
    const idx = this.buttonData.length - 1;

    hitBg.on('pointerdown', (e: FederatedPointerEvent) => {
      const d = this.buttonData[idx];
      if (d.pointerId !== null) return;
      d.pointerId = e.pointerId;
      d.cancelled = false;
      d.inCancelZone = false;
      if (d.holdKey) {
        // Compound button: press holdKey, not key
        Input.setVirtualKey(d.holdKey, true);
      } else {
        Input.setVirtualKey(d.key, true);
      }
      // Show knob at center for aim stick buttons
      if (d.aimStick && d.knob) {
        d.knob.position.set(0, 0);
        d.knob.visible = true;
      }
      // Visual feedback — bright neon fill + stroke
      d.gfx.clear();
      d.gfx.circle(0, 0, d.radius);
      d.gfx.fill({ color, alpha: 0.25 });
      d.gfx.circle(0, 0, d.radius);
      d.gfx.stroke({ width: 4, color, alpha: 1.0 });
    });

    // Release handled by window-level pointerup (covers all cases)
    return c;
  }

  private releaseButton(idx: number, pointerId: number): void {
    const d = this.buttonData[idx];
    if (d.pointerId !== pointerId) return;
    d.pointerId = null;

    if (d.holdKey) {
      // Compound button: release holdKey, pulse key only if not cancelled
      Input.setVirtualKey(d.holdKey, false);
      if (!d.cancelled) {
        Input.setVirtualKey(d.key, true);
        setTimeout(() => Input.setVirtualKey(d.key, false), 50);
      }
    } else {
      Input.setVirtualKey(d.key, false);
    }

    // Aim stick cleanup
    if (d.aimStick) {
      this._aimStickValue = { x: 0, y: 0 };
      if (d.knob) d.knob.visible = false;
      if (d.labelText) d.labelText.text = d.originalLabel;
      d.inCancelZone = false;
    }

    // Visual feedback — back to subtle fill + outline (always use original color)
    const color = d.originalColor;
    d.gfx.clear();
    d.gfx.circle(0, 0, d.radius);
    d.gfx.fill({ color, alpha: 0.08 });
    d.gfx.circle(0, 0, d.radius);
    d.gfx.stroke({ width: 3, color, alpha: 0.5 });
  }

  private releaseAllButtons(): void {
    for (let i = 0; i < this.buttonData.length; i++) {
      const d = this.buttonData[i];
      if (d.pointerId !== null) {
        d.pointerId = null;
        if (d.holdKey) {
          Input.setVirtualKey(d.holdKey, false);
        }
        Input.setVirtualKey(d.key, false);
        d.cancelled = false;
        // Aim stick cleanup
        if (d.aimStick) {
          if (d.knob) d.knob.visible = false;
          if (d.labelText) d.labelText.text = d.originalLabel;
          d.inCancelZone = false;
        }
        const color = d.originalColor;
        d.gfx.clear();
        d.gfx.circle(0, 0, d.radius);
        d.gfx.fill({ color, alpha: 0.08 });
        d.gfx.circle(0, 0, d.radius);
        d.gfx.stroke({ width: 3, color, alpha: 0.5 });
      }
    }
    // Reset aim stick value even if no button was active (safety net)
    this._aimStickValue = { x: 0, y: 0 };
  }

  // ==================== DOM Pointer Handlers ====================

  private handleWindowPointerMove(e: PointerEvent): void {
    // Joystick drag — convert DOM coords to virtual canvas space
    if (this.joystickPointerId !== null && e.pointerId === this.joystickPointerId) {
      const pos = domToVirtual(e.clientX, e.clientY, this.config.canvasWidth, this.config.canvasHeight);
      if (pos) {
        this.updateJoystickFromLocal(pos.x - this.joystickCenterX, pos.y - this.joystickCenterY);
      }
    }

    // Button drag tracking — aim stick analog + cancel zone (both aim stick and regular cancelOnLeave)
    for (let i = 0; i < this.buttonData.length; i++) {
      const d = this.buttonData[i];
      if (d.pointerId !== e.pointerId) continue;
      // Skip buttons that have no drag behavior
      if (!d.aimStick && (!d.holdKey || !d.cancelOnLeave)) continue;

      const pos = domToVirtual(e.clientX, e.clientY, this.config.canvasWidth, this.config.canvasHeight);
      if (!pos) continue;
      const dx = pos.x - d.centerX;
      const dy = pos.y - d.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Aim stick: compute analog value + position knob
      if (d.aimStick) {
        if (!d.cancelled) {
          const norm = dist / d.radius;
          if (norm > d.aimStickDeadzone) {
            const rescaled = Math.min((norm - d.aimStickDeadzone) / (1 - d.aimStickDeadzone), 1);
            this._aimStickValue = { x: (dx / dist) * rescaled, y: (dy / dist) * rescaled };
          } else {
            this._aimStickValue = { x: 0, y: 0 };
          }
        }
        // Position knob clamped to button radius
        if (d.knob) {
          const clampedDist = Math.min(dist, d.radius);
          const angle = Math.atan2(dy, dx);
          d.knob.position.set(Math.cos(angle) * clampedDist, Math.sin(angle) * clampedDist);
          if (!d.cancelled) d.knob.visible = true;
        }
      }

      // Cancel zone check — works for both aimStick and regular cancelOnLeave buttons
      if (d.holdKey && d.cancelOnLeave) {
        const cancelDist = d.cancelRadiusMult * d.radius;
        if (!d.cancelled && dist > cancelDist) {
          // Entering cancel zone
          d.cancelled = true;
          d.inCancelZone = true;
          Input.setVirtualKey(d.holdKey, false);
          if (d.aimStick) {
            this._aimStickValue = { x: 0, y: 0 };
            if (d.knob) d.knob.visible = false;
            if (d.labelText) d.labelText.text = 'X';
            // Redraw button in cancel color
            const cancelColor = 0xff6644;
            d.gfx.clear();
            d.gfx.circle(0, 0, d.radius);
            d.gfx.fill({ color: cancelColor, alpha: 0.25 });
            d.gfx.circle(0, 0, d.radius);
            d.gfx.stroke({ width: 4, color: cancelColor, alpha: 1.0 });
          }
        } else if (d.cancelled && d.inCancelZone && dist <= cancelDist) {
          // Leaving cancel zone (drag back in) — resume
          d.cancelled = false;
          d.inCancelZone = false;
          Input.setVirtualKey(d.holdKey, true);
          if (d.aimStick) {
            if (d.knob) d.knob.visible = true;
            if (d.labelText) d.labelText.text = d.originalLabel;
            // Restore original button color
            const color = d.originalColor;
            d.gfx.clear();
            d.gfx.circle(0, 0, d.radius);
            d.gfx.fill({ color, alpha: 0.25 });
            d.gfx.circle(0, 0, d.radius);
            d.gfx.stroke({ width: 4, color, alpha: 1.0 });
          }
        }
      }
    }
  }

  private handleWindowPointerUp(e: PointerEvent): void {
    // Joystick release
    if (this.joystickPointerId !== null && e.pointerId === this.joystickPointerId) {
      this.releaseJoystick();
    }
    // Button releases
    for (let i = 0; i < this.buttonData.length; i++) {
      if (this.buttonData[i].pointerId === e.pointerId) {
        this.releaseButton(i, e.pointerId);
      }
    }
  }

  // ==================== Visibility ====================

  /** Enable touch controls (e.g. entering gameplay). Respects current input mode. */
  show(): void {
    this._enabled = true;
    // Only make visible if in touch mode — keyboard/gamepad mode keeps them hidden
    this.container.visible = Input.inputMode === 'touch';
  }

  /** Disable touch controls (e.g. entering menu). Releases all virtual keys. */
  hide(): void {
    this._enabled = false;
    this.container.visible = false;
    Input.clearAllVirtualKeys();
    this.releaseAllJoystickKeys();
    this.releaseAllButtons();
  }

  /** Whether controls are enabled (game-level). May still be hidden by keyboard mode. */
  get isVisible(): boolean {
    return this._enabled;
  }

  /** Current input mode — reads from shared Input.inputMode. */
  get inputMode(): string {
    return Input.inputMode;
  }

  // ==================== Runtime Reconfiguration ====================

  /** Swap joystick key mappings at runtime (e.g. L/R-only during aiming, full 8-way otherwise). */
  setJoystick(keys: { up?: string; down?: string; left?: string; right?: string }): void {
    this.releaseAllJoystickKeys();
    this.joystickKeys = { ...keys };
    // Re-evaluate current touch position with new key mapping
    if (this.joystickPointerId !== null && this.joystickKnob) {
      this.updateJoystickFromLocal(this.joystickKnob.position.x, this.joystickKnob.position.y);
    }
  }

  // ==================== Cleanup ====================

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    Input.clearAllVirtualKeys();

    // Remove pointer listeners
    if (this.onWindowPointerMove) {
      window.removeEventListener('pointermove', this.onWindowPointerMove);
    }
    if (this.onWindowPointerUp) {
      window.removeEventListener('pointerup', this.onWindowPointerUp);
      window.removeEventListener('pointercancel', this.onWindowPointerUp);
    }

    // Remove DOM listeners
    if (this.onTouchStartForShow) {
      window.removeEventListener('touchstart', this.onTouchStartForShow);
    }
    if (this.unsubscribeInputMode) {
      this.unsubscribeInputMode();
    }
    if (this.onVisibilityChange) {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }

    this.container.destroy({ children: true });
  }
}
