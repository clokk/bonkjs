/**
 * SpriteComponent - Renders a 2D sprite using PixiJS.
 */

import { Component, registerComponent } from '../Component';
import { getRenderer } from '../rendering';
import type { RenderObject } from '../rendering';
import type { GameObject } from '../GameObject';
import type { SpriteJson, AnyComponentJson } from '../types';

/** Color mapping for different game object tags */
const TAG_COLORS: Record<string, number> = {
  Player: 0x00ff00, // Green
  Enemy: 0xff0000, // Red
  Collectible: 0xffff00, // Yellow
  Platform: 0x888888, // Gray
};

/** Default placeholder color */
const DEFAULT_COLOR = 0xff00ff; // Magenta

export class SpriteComponent extends Component {
  readonly type = 'Sprite';

  /** Image source path */
  src: string;

  /** Anchor point (0-1) */
  anchor: [number, number] = [0.5, 0.5];

  /** Tint color */
  tint?: string;

  /** Alpha transparency */
  alpha: number = 1;

  /** Flip horizontally */
  flipX: boolean = false;

  /** Flip vertically */
  flipY: boolean = false;

  /** Placeholder width (used when no src) */
  width: number = 32;

  /** Placeholder height (used when no src) */
  height: number = 32;

  /** The render object from the renderer */
  private renderObject: RenderObject | null = null;

  constructor(gameObject: GameObject, data?: Partial<SpriteJson & { width?: number; height?: number }>) {
    super(gameObject);
    this.src = data?.src ?? '';
    if (data?.anchor) this.anchor = [...data.anchor];
    this.tint = data?.tint as string | undefined;
    this.alpha = data?.alpha ?? 1;
    this.flipX = data?.flipX ?? false;
    this.flipY = data?.flipY ?? false;
    // Support explicit width/height for placeholders
    if ('width' in (data ?? {})) this.width = (data as { width?: number }).width ?? 32;
    if ('height' in (data ?? {})) this.height = (data as { height?: number }).height ?? 32;
  }

  awake(): void {
    const renderer = getRenderer();

    // Determine color based on tag
    const tag = this.gameObject.tag;
    const color = tag && TAG_COLORS[tag] ? TAG_COLORS[tag] : DEFAULT_COLOR;

    // Create render object
    this.renderObject = renderer.createSprite({
      src: this.src || undefined,
      width: this.width,
      height: this.height,
      color,
      anchor: this.anchor,
      alpha: this.alpha,
      zIndex: this.transform.zIndex,
    });

    // Initial position sync
    this.syncTransform();
  }

  update(): void {
    this.syncTransform();
  }

  /** Sync transform to render object */
  private syncTransform(): void {
    if (!this.renderObject) return;

    const worldPos = this.transform.worldPosition;
    const worldRot = this.transform.worldRotation;
    const worldScale = this.transform.worldScale;

    this.renderObject.setPosition(worldPos[0], worldPos[1]);
    this.renderObject.setRotation(worldRot);

    // Apply flip by negating scale
    const scaleX = this.flipX ? -worldScale[0] : worldScale[0];
    const scaleY = this.flipY ? -worldScale[1] : worldScale[1];
    this.renderObject.setScale(scaleX, scaleY);

    this.renderObject.setAlpha(this.alpha);
    this.renderObject.zIndex = this.transform.zIndex;
    this.renderObject.setVisible(this.enabled && this.gameObject.enabled);
  }

  onDestroy(): void {
    if (this.renderObject) {
      this.renderObject.destroy();
      this.renderObject = null;
    }
  }

  toJSON(): SpriteJson {
    return {
      type: 'Sprite',
      src: this.src,
      anchor: this.anchor,
      tint: this.tint,
      alpha: this.alpha,
      flipX: this.flipX,
      flipY: this.flipY,
    };
  }
}

// Register the component factory
registerComponent('Sprite', (gameObject, data) => {
  return new SpriteComponent(gameObject, data as SpriteJson);
});

export default SpriteComponent;
