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

/**
 * Animated sprite configuration.
 * Extends SpriteConfig with frame dimensions for sprite sheet animation.
 */
export interface AnimatedSpriteConfig extends SpriteConfig {
  /** Width of each frame in the sprite sheet (pixels) */
  frameWidth: number;
  /** Height of each frame in the sprite sheet (pixels) */
  frameHeight: number;
  /**
   * Callback invoked when the sprite sheet texture loads successfully.
   * Used by AnimatedSpriteComponent to know when animation can start.
   */
  onTextureReady?: () => void;
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

  /**
   * Update the texture region being displayed (for sprite sheets/animation).
   *
   * ┌─────────────────────────────────┐
   * │  Full Sprite Sheet Texture     │
   * │  ┌─────┬─────┬─────┬─────┐     │
   * │  │  0  │  1  │  2  │  3  │     │
   * │  ├─────┼─────┼─────┼─────┤     │
   * │  │  4  │  5  │ ███ │  7  │     │ ← setTextureRegion selects frame 6
   * │  └─────┴─────┴─────┴─────┘     │
   * └─────────────────────────────────┘
   *
   * @param x - Left edge of region in pixels (from sheet origin)
   * @param y - Top edge of region in pixels (from sheet origin)
   * @param width - Region width in pixels (typically frameWidth)
   * @param height - Region height in pixels (typically frameHeight)
   *
   * WHY optional? Static sprites don't need this method. Only animated
   * sprites call it, so we make it optional to avoid breaking existing code.
   */
  setTextureRegion?(x: number, y: number, width: number, height: number): void;
}

/** Abstract renderer interface */
export interface Renderer {
  /** Initialize the renderer and return the canvas element */
  init(config: RendererConfig): Promise<HTMLCanvasElement>;

  /** Create a sprite render object */
  createSprite(config: SpriteConfig): RenderObject;

  /**
   * Create an animated sprite render object (for sprite sheet animation).
   * Similar to createSprite, but:
   * - Stores the base texture for setTextureRegion() calls
   * - Uses frameWidth/frameHeight for initial display
   * - Calls onTextureReady when the sprite sheet loads
   */
  createAnimatedSprite(config: AnimatedSpriteConfig): RenderObject;

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

  /** Set camera position (world coordinates) */
  setCameraPosition(x: number, y: number): void;

  /** Set camera zoom level */
  setCameraZoom(zoom: number): void;

  /** Get viewport size */
  getViewportSize(): { width: number; height: number };

  /** Get current camera position */
  getCameraPosition(): { x: number; y: number };

  /** Get current camera zoom level */
  getCameraZoom(): number;

  // ==================== PixiJS Internals ====================

  /** Get the PixiJS stage (root container). Returns unknown for backend-agnostic code. */
  getStage(): unknown;

  /** Get the world container (camera-affected). Returns unknown for backend-agnostic code. */
  getWorldContainer(): unknown;

  /** Get the underlying renderer application. Returns unknown for backend-agnostic code. */
  getApp(): unknown;

  // ==================== Background ====================

  /** Set the background color (hex). */
  setBackgroundColor(color: number): void;

  // ==================== UI Support ====================

  /**
   * Get the UI container for screen-space UI elements.
   * UI container is rendered after worldContainer and is not affected by camera.
   */
  getUIContainer(): unknown;

  /**
   * Add a display object to the UI layer.
   * Objects added here render in screen-space, unaffected by camera.
   */
  addToUI(displayObject: unknown): void;

  /**
   * Remove a display object from the UI layer.
   */
  removeFromUI(displayObject: unknown): void;
}
