/**
 * PixiRenderer - PixiJS v8 implementation of the Renderer interface.
 */

import { Application, Container, Graphics, Sprite, Texture, Assets } from 'pixi.js';
import type { Renderer, RendererConfig, SpriteConfig, RenderObject } from './Renderer';

/** PixiJS implementation of RenderObject */
class PixiRenderObject implements RenderObject {
  private displayObject: Sprite | Graphics;
  private container: Container;

  constructor(displayObject: Sprite | Graphics, container: Container) {
    this.displayObject = displayObject;
    this.container = container;
    container.addChild(displayObject);
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
}

/** PixiJS v8 Renderer implementation */
export class PixiRenderer implements Renderer {
  private app: Application | null = null;
  private worldContainer: Container | null = null;
  private textureCache = new Map<string, Texture>();

  async init(config: RendererConfig): Promise<HTMLCanvasElement> {
    this.app = new Application();

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

    return this.app.canvas as HTMLCanvasElement;
  }

  createSprite(config: SpriteConfig): RenderObject {
    if (!this.worldContainer) {
      throw new Error('Renderer not initialized. Call init() first.');
    }

    let displayObject: Sprite | Graphics;

    if (config.src) {
      // Create a sprite with texture
      // Start with a placeholder and load texture async
      const sprite = new Sprite(Texture.WHITE);
      sprite.width = config.width ?? 32;
      sprite.height = config.height ?? 32;

      // Load texture asynchronously
      this.loadTexture(config.src).then((texture) => {
        sprite.texture = texture;
        // Reset size if no explicit dimensions were given
        if (!config.width && !config.height) {
          sprite.width = texture.width;
          sprite.height = texture.height;
        }
      });

      displayObject = sprite;
    } else {
      // Create a colored rectangle placeholder
      const graphics = new Graphics();
      const width = config.width ?? 32;
      const height = config.height ?? 32;
      const color = config.color ?? 0xff00ff; // Magenta default

      graphics.rect(-width / 2, -height / 2, width, height);
      graphics.fill(color);

      displayObject = graphics;
    }

    // Set anchor for sprites
    if (displayObject instanceof Sprite && config.anchor) {
      displayObject.anchor.set(config.anchor[0], config.anchor[1]);
    }

    // Set initial properties
    if (config.alpha !== undefined) {
      displayObject.alpha = config.alpha;
    }
    if (config.zIndex !== undefined) {
      displayObject.zIndex = config.zIndex;
    }

    return new PixiRenderObject(displayObject, this.worldContainer);
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
    }
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.app?.canvas as HTMLCanvasElement | null;
  }

  destroy(): void {
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

  /** Load a texture with caching */
  private async loadTexture(src: string): Promise<Texture> {
    if (this.textureCache.has(src)) {
      return this.textureCache.get(src)!;
    }

    try {
      const texture = await Assets.load(src);
      this.textureCache.set(src, texture);
      return texture;
    } catch (error) {
      console.warn(`Failed to load texture: ${src}`, error);
      return Texture.WHITE;
    }
  }
}
