/**
 * Renderer - Abstract interface for 2D rendering.
 * Allows swapping rendering backends (PixiJS, Canvas2D, etc).
 */

/** Renderer configuration */
export interface RendererConfig {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Background color (hex) */
  backgroundColor?: number;
  /** Whether to use antialiasing */
  antialias?: boolean;
  /** Device pixel ratio (default: window.devicePixelRatio) */
  resolution?: number;
}

/** Sprite configuration */
export interface SpriteConfig {
  /** Image source path */
  src?: string;
  /** Width in pixels (for placeholder rectangles) */
  width?: number;
  /** Height in pixels (for placeholder rectangles) */
  height?: number;
  /** Fill color (hex) for placeholder rectangles */
  color?: number;
  /** Anchor point (0-1) */
  anchor?: [number, number];
  /** Initial alpha */
  alpha?: number;
  /** Initial z-index */
  zIndex?: number;
}

/** Abstract render object that represents a visual element */
export interface RenderObject {
  /** Set position in world space */
  setPosition(x: number, y: number): void;
  /** Set rotation in degrees */
  setRotation(degrees: number): void;
  /** Set scale */
  setScale(x: number, y: number): void;
  /** Set alpha transparency (0-1) */
  setAlpha(alpha: number): void;
  /** Set visibility */
  setVisible(visible: boolean): void;
  /** Get/set z-index for render ordering */
  zIndex: number;
  /** Destroy and remove from renderer */
  destroy(): void;
}

/** Abstract renderer interface */
export interface Renderer {
  /** Initialize the renderer and return the canvas element */
  init(config: RendererConfig): Promise<HTMLCanvasElement>;

  /** Create a sprite render object */
  createSprite(config: SpriteConfig): RenderObject;

  /** Remove a render object from the scene */
  removeObject(object: RenderObject): void;

  /** Render the current frame */
  render(): void;

  /** Resize the renderer */
  resize(width: number, height: number): void;

  /** Get the canvas element */
  getCanvas(): HTMLCanvasElement | null;

  /** Destroy the renderer and clean up resources */
  destroy(): void;
}
