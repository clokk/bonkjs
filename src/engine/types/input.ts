/**
 * Input system type definitions.
 */

import type { Vector2 } from './math';

/** Configuration for an axis (e.g., horizontal, vertical) */
export interface AxisConfig {
  /** Keys that contribute -1 to this axis */
  negative: string[];
  /** Keys that contribute +1 to this axis */
  positive: string[];
  /** Smoothing factor (0 = instant, higher = smoother). Default: 10 */
  smoothing?: number;
}

/** Configuration for a button (e.g., jump, fire) */
export interface ButtonConfig {
  /** Keys that trigger this button. Use "Mouse0", "Mouse1", "Mouse2" for mouse buttons */
  keys: string[];
}

/** Full input configuration */
export interface InputConfig {
  axes: Record<string, AxisConfig>;
  buttons: Record<string, ButtonConfig>;
}

/** Re-export Vector2 for convenience */
export type { Vector2 };
