/**
 * bonkjs — PixiJS game toolkit
 */

// Types
export type { Vector2, Vector3, Color, HexColor, ColorValue, AxisConfig, ButtonConfig, InputConfig } from './types';

// Core
export { Game, type GameInitConfig, type GameInitResult } from './Game';
export { Time } from './Time';
export { Camera, type CameraConfig } from './Camera';

// Input
export { Input, type InputMode } from './Input';
export { Keys } from './Keys';
export { TouchControls, type TouchControlsConfig, type TouchJoystickConfig, type TouchButtonConfig } from './TouchControls';
export { GamepadControls, GamepadButtons, type GamepadControlsConfig, type GamepadStickConfig, type GamepadButtonMapping } from './GamepadControls';

// Math
export { vec2 } from './vec2';

// Dev Tools
export { Tweaker, type TweakerConfig, type RegisterOptions, type FieldHint, type TweakerTheme } from './devtools';
