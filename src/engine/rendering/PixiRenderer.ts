/**
 * PixiRenderer - PixiJS v8 implementation of the Renderer interface.
 */

import { Application, Container, Graphics, Sprite, Texture, Assets, Rectangle } from 'pixi.js';
import type { Renderer, RendererConfig, SpriteConfig, AnimatedSpriteConfig, RenderObject } from './Renderer';

/** PixiJS implementation of RenderObject */
class PixiRenderObject implements RenderObject {
  private displayObject: Sprite | Graphics;
  private container: Container;
  private config: SpriteConfig;

  /**
   * The base texture for sprite sheet operations.
   *
   * WHY store this separately from displayObject.texture?
   * When we call setTextureRegion(), we create NEW Texture objects that
   * reference different rectangular regions of this base texture. The
   * displayObject.texture changes each frame, but baseTexture stays constant.
   *
   * Without storing baseTexture, we'd lose the original full-sheet texture
   * after the first setTextureRegion() call, making subsequent region
   * changes impossible.
   */
  private baseTexture: Texture | null = null;

  constructor(displayObject: Sprite | Graphics, container: Container, config: SpriteConfig) {
    this.displayObject = displayObject;
    this.container = container;
    this.config = config;
    container.addChild(displayObject);
  }

  /** Replace the display object (used when texture loads) */
  replaceDisplayObject(newObject: Sprite | Graphics): void {
    // Copy properties from old to new
    newObject.position.copyFrom(this.displayObject.position);
    newObject.rotation = this.displayObject.rotation;
    newObject.scale.copyFrom(this.displayObject.scale);
    newObject.alpha = this.displayObject.alpha;
    newObject.visible = this.displayObject.visible;
    newObject.zIndex = this.displayObject.zIndex;

    // Swap in container
    const index = this.container.getChildIndex(this.displayObject);
    this.container.removeChildAt(index);
    this.displayObject.destroy();
    this.container.addChildAt(newObject, index);
    this.displayObject = newObject;
  }

  setPosition(x: number, y: number): void {
    this.displayObject.position.set(x, y);
  }

  setRotation(degrees: number): void {
    this.displayObject.rotation = (degrees * Math.PI) / 180;
  }

  setScale(x: number, y: number): void {
    this.displayObject.scale.set(x, y);
  }

  setAlpha(alpha: number): void {
    this.displayObject.alpha = alpha;
  }

  setVisible(visible: boolean): void {
    this.displayObject.visible = visible;
  }

  get zIndex(): number {
    return this.displayObject.zIndex;
  }

  set zIndex(value: number) {
    this.displayObject.zIndex = value;
  }

  destroy(): void {
    this.container.removeChild(this.displayObject);
    this.displayObject.destroy();
  }

  /**
   * Store the base texture for sprite sheet animation.
   * Called once when the full sprite sheet texture is loaded.
   */
  setBaseTexture(texture: Texture): void {
    this.baseTexture = texture;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * TEXTURE REGION SELECTION (Sprite Sheet Animation)
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * This method creates a "view" into a portion of the sprite sheet texture.
   * Each animation frame is a rectangular region of the larger texture.
   *
   * How PixiJS Texture Frames Work:
   * ┌─────────────────────────────────────────────────────────────┐
   * │  baseTexture (full sprite sheet, e.g. 128x64 pixels)       │
   * │  ┌───────┬───────┬───────┬───────┐                         │
   * │  │ frame │ frame │ frame │ frame │                         │
   * │  │   0   │   1   │   2   │   3   │  ← Row 0                │
   * │  ├───────┼───────┼───────┼───────┤                         │
   * │  │ frame │ frame │ frame │ frame │                         │
   * │  │   4   │   5   │   6   │   7   │  ← Row 1                │
   * │  └───────┴───────┴───────┴───────┘                         │
   * │          ↑                                                  │
   * │    new Texture({ source: baseTexture.source,               │
   * │                  frame: Rectangle(32, 0, 32, 32) })        │
   * │    Creates a texture showing ONLY frame 1                   │
   * └─────────────────────────────────────────────────────────────┘
   *
   * WHY create new Texture objects instead of modifying the existing one?
   * PixiJS Texture objects are immutable after creation. The frame property
   * is set at construction time. To show a different region, we must create
   * a new Texture with a different frame Rectangle.
   *
   * @param x - Left edge of the frame in pixels
   * @param y - Top edge of the frame in pixels
   * @param width - Frame width in pixels
   * @param height - Frame height in pixels
   */
  setTextureRegion(x: number, y: number, width: number, height: number): void {
    // Guard: Need a base texture and a Sprite (not Graphics placeholder)
    if (!this.baseTexture) return;
    if (!(this.displayObject instanceof Sprite)) return;

    // Create a Rectangle defining the region of the sprite sheet to display
    const frame = new Rectangle(x, y, width, height);

    // Create a new Texture that views only this rectangular region
    // The 'source' is the underlying image data (shared across all frames)
    const regionTexture = new Texture({
      source: this.baseTexture.source,
      frame: frame,
    });

    // Swap the sprite's texture to show the new frame
    this.displayObject.texture = regionTexture;
  }
}

/** PixiJS v8 Renderer implementation */
export class PixiRenderer implements Renderer {
  private app: Application | null = null;
  private worldContainer: Container | null = null;
  /**
   * UI container for screen-space UI elements.
   *
   * ┌─────────────────────────────────────────────────────────────────┐
   * │                    PIXI.JS APPLICATION                          │
   * ├─────────────────────────────────────────────────────────────────┤
   * │  app.stage                                                      │
   * │  ├── worldContainer (camera-affected)                           │
   * │  │   └── Game sprites, tilemaps, etc.                          │
   * │  │                                                              │
   * │  └── uiContainer (screen-space, fixed at 0,0)                  │
   * │      └── UI elements (panels, text, buttons)                   │
   * └─────────────────────────────────────────────────────────────────┘
   *
   * WHY separate containers?
   * - worldContainer is transformed by camera (position, zoom)
   * - uiContainer stays fixed at screen origin, ignores camera
   * - UI always renders on top of game world
   */
  private uiContainer: Container | null = null;
  private textureCache = new Map<string, Texture>();
  private viewportWidth: number = 800;
  private viewportHeight: number = 600;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private cameraZoom: number = 1;

  async init(config: RendererConfig): Promise<HTMLCanvasElement> {
    this.app = new Application();
    this.viewportWidth = config.width;
    this.viewportHeight = config.height;

    await this.app.init({
      width: config.width,
      height: config.height,
      backgroundColor: config.backgroundColor ?? 0x1a1a2e,
      antialias: config.antialias ?? true,
      resolution: config.resolution ?? window.devicePixelRatio,
      autoDensity: true,
    });

    // Create world container with sortable children for z-index
    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
    this.app.stage.addChild(this.worldContainer);

    // Create UI container (added after worldContainer so it renders on top)
    this.uiContainer = new Container();
    this.uiContainer.sortableChildren = true;
    this.app.stage.addChild(this.uiContainer);

    return this.app.canvas as HTMLCanvasElement;
  }

  createSprite(config: SpriteConfig): RenderObject {
    if (!this.worldContainer) {
      throw new Error('Renderer not initialized. Call init() first.');
    }

    const width = config.width ?? 32;
    const height = config.height ?? 32;
    const color = config.color ?? 0xff00ff; // Magenta default

    // Always start with a colored rectangle placeholder
    const graphics = new Graphics();
    graphics.rect(-width / 2, -height / 2, width, height);
    graphics.fill(color);

    // Set initial properties
    if (config.alpha !== undefined) {
      graphics.alpha = config.alpha;
    }
    if (config.zIndex !== undefined) {
      graphics.zIndex = config.zIndex;
    }

    const renderObject = new PixiRenderObject(graphics, this.worldContainer, config);

    // If there's a src, try to load the texture and swap to a Sprite on success
    if (config.src) {
      this.loadTexture(config.src).then((texture) => {
        if (texture && texture !== Texture.WHITE) {
          const sprite = new Sprite(texture);
          sprite.anchor.set(config.anchor?.[0] ?? 0.5, config.anchor?.[1] ?? 0.5);

          // Use explicit dimensions if provided, otherwise use texture size
          if (config.width || config.height) {
            sprite.width = width;
            sprite.height = height;
          }

          renderObject.replaceDisplayObject(sprite);
        }
      });
    }

    return renderObject;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * CREATE ANIMATED SPRITE
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Creates a RenderObject optimized for sprite sheet animation:
   * - Stores the base texture for later setTextureRegion() calls
   * - Uses frame dimensions instead of scaling the texture
   * - Notifies via callback when texture is ready for animation
   *
   * Flow:
   * 1. Create placeholder Graphics immediately (so we have something to show)
   * 2. Load texture asynchronously
   * 3. When loaded, store as baseTexture and swap to Sprite
   * 4. Call onTextureReady so AnimatedSpriteComponent can start animating
   */
  createAnimatedSprite(config: AnimatedSpriteConfig): RenderObject {
    if (!this.worldContainer) {
      throw new Error('Renderer not initialized. Call init() first.');
    }

    const { frameWidth, frameHeight } = config;
    const color = config.color ?? 0xff00ff; // Magenta placeholder

    // Start with a colored rectangle placeholder (sized to one frame)
    const graphics = new Graphics();
    graphics.rect(-frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight);
    graphics.fill(color);

    if (config.alpha !== undefined) {
      graphics.alpha = config.alpha;
    }
    if (config.zIndex !== undefined) {
      graphics.zIndex = config.zIndex;
    }

    const renderObject = new PixiRenderObject(graphics, this.worldContainer, config);

    // Load the sprite sheet texture
    if (config.src) {
      this.loadTexture(config.src).then((texture) => {
        if (texture && texture !== Texture.WHITE) {
          // Create initial sprite showing first frame region
          const initialFrame = new Rectangle(0, 0, frameWidth, frameHeight);
          const frameTexture = new Texture({
            source: texture.source,
            frame: initialFrame,
          });

          const sprite = new Sprite(frameTexture);
          sprite.anchor.set(config.anchor?.[0] ?? 0.5, config.anchor?.[1] ?? 0.5);

          // Store the full sprite sheet as base texture (for setTextureRegion)
          renderObject.setBaseTexture(texture);
          renderObject.replaceDisplayObject(sprite);

          // Notify that animation can now start
          config.onTextureReady?.();
        }
      });
    }

    return renderObject;
  }

  removeObject(object: RenderObject): void {
    object.destroy();
  }

  render(): void {
    // PixiJS v8 uses its own render loop via requestAnimationFrame
    // If we need manual control, we can call app.render()
    // For now, PixiJS handles this automatically
  }

  resize(width: number, height: number): void {
    if (this.app) {
      this.app.renderer.resize(width, height);
      this.viewportWidth = width;
      this.viewportHeight = height;
      // Re-apply camera position after resize
      this.updateWorldContainer();
    }
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.app?.canvas as HTMLCanvasElement | null;
  }

  destroy(): void {
    if (this.uiContainer) {
      this.uiContainer.destroy({ children: true });
      this.uiContainer = null;
    }
    if (this.worldContainer) {
      this.worldContainer.destroy({ children: true });
      this.worldContainer = null;
    }
    if (this.app) {
      this.app.destroy(true);
      this.app = null;
    }
    this.textureCache.clear();
  }

  setCameraPosition(x: number, y: number): void {
    this.cameraX = x;
    this.cameraY = y;
    this.updateWorldContainer();
  }

  setCameraZoom(zoom: number): void {
    this.cameraZoom = zoom;
    this.updateWorldContainer();
  }

  getViewportSize(): { width: number; height: number } {
    return { width: this.viewportWidth, height: this.viewportHeight };
  }

  getCameraPosition(): { x: number; y: number } {
    return { x: this.cameraX, y: this.cameraY };
  }

  getCameraZoom(): number {
    return this.cameraZoom;
  }

  // ==================== UI Support ====================

  getUIContainer(): Container | null {
    return this.uiContainer;
  }

  addToUI(displayObject: Container): void {
    if (!this.uiContainer) {
      throw new Error('Renderer not initialized. Call init() first.');
    }
    this.uiContainer.addChild(displayObject);
  }

  removeFromUI(displayObject: Container): void {
    if (!this.uiContainer) return;
    this.uiContainer.removeChild(displayObject);
  }

  /** Update world container transform based on camera position and zoom */
  private updateWorldContainer(): void {
    if (!this.worldContainer) return;

    // Apply zoom
    this.worldContainer.scale.set(this.cameraZoom, this.cameraZoom);

    // Offset world container so camera position is at viewport center
    // The camera looks at (cameraX, cameraY), so we move the world in the opposite direction
    this.worldContainer.position.set(
      this.viewportWidth / 2 - this.cameraX * this.cameraZoom,
      this.viewportHeight / 2 - this.cameraY * this.cameraZoom
    );
  }

  /** Load a texture with caching */
  private async loadTexture(src: string): Promise<Texture | null> {
    if (this.textureCache.has(src)) {
      return this.textureCache.get(src)!;
    }

    try {
      const texture = await Assets.load(src);
      this.textureCache.set(src, texture);
      return texture;
    } catch {
      // Texture not found - this is normal during development when using placeholders
      // Use colored rectangles instead (already handled by createSprite)
      return null;
    }
  }
}
