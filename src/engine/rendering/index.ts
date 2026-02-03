/**
 * Rendering module exports.
 */

export type {
  Renderer,
  RenderObject,
  RendererConfig,
  SpriteConfig,
} from './Renderer';

export { PixiRenderer } from './PixiRenderer';

import { PixiRenderer } from './PixiRenderer';
import type { Renderer } from './Renderer';

/** Global renderer singleton */
let globalRenderer: Renderer | null = null;

/** Get the global renderer instance */
export function getRenderer(): Renderer {
  if (!globalRenderer) {
    globalRenderer = new PixiRenderer();
  }
  return globalRenderer;
}

/** Set the global renderer instance (for testing or alternative backends) */
export function setRenderer(renderer: Renderer): void {
  if (globalRenderer) {
    globalRenderer.destroy();
  }
  globalRenderer = renderer;
}

/** Destroy the global renderer */
export function destroyRenderer(): void {
  if (globalRenderer) {
    globalRenderer.destroy();
    globalRenderer = null;
  }
}
