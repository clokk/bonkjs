/**
 * Coordinate conversion utilities for the editor.
 */

import type { Renderer } from '@engine/rendering';

/**
 * Converts screen coordinates (relative to the canvas) to world coordinates.
 *
 * The conversion accounts for:
 * - Camera position (world is translated so camera looks at its position)
 * - Camera zoom (world is scaled around viewport center)
 * - Viewport size (screen coordinates are relative to canvas)
 *
 * @param screenX - X position relative to canvas left edge
 * @param screenY - Y position relative to canvas top edge
 * @param renderer - The renderer instance
 * @returns World coordinates as [x, y]
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  renderer: Renderer
): [number, number] {
  const viewport = renderer.getViewportSize();
  const camera = renderer.getCameraPosition();
  const zoom = renderer.getCameraZoom();

  // The renderer positions the world container at:
  //   x = viewportWidth/2 - cameraX * zoom
  //   y = viewportHeight/2 - cameraY * zoom
  //
  // To convert screen coords to world coords, we reverse this:
  //   worldX = (screenX - viewportWidth/2) / zoom + cameraX
  //   worldY = (screenY - viewportHeight/2) / zoom + cameraY

  const worldX = (screenX - viewport.width / 2) / zoom + camera.x;
  const worldY = (screenY - viewport.height / 2) / zoom + camera.y;

  return [worldX, worldY];
}
