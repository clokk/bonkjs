/**
 * InputDebugDisplay - Shows real-time input state for debugging.
 * Displays axis values, button states, and mouse position.
 */

import { Behavior } from '../src/engine/Behavior';
import { Input } from '../src/engine/Input';

export default class InputDebugDisplay extends Behavior {
  /** DOM element for the debug display */
  private element: HTMLDivElement | null = null;

  awake(): void {
    this.element = document.createElement('div');
    this.element.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      padding: 12px;
      border-radius: 4px;
      z-index: 9999;
      pointer-events: none;
      min-width: 200px;
    `;
    document.body.appendChild(this.element);
  }

  update(): void {
    if (!this.element) return;

    const horz = this.getAxis('horizontal');
    const vert = this.getAxis('vertical');
    const horzRaw = this.getAxisRaw('horizontal');
    const vertRaw = this.getAxisRaw('vertical');

    const jump = this.getButton('jump');
    const jumpDown = this.getButtonDown('jump');
    const fire = this.getButton('fire');
    const fireDown = this.getButtonDown('fire');

    const mouse = this.mousePosition;
    const mouseLeft = Input.getMouseButton(0);
    const mouseRight = Input.getMouseButton(2);

    // Format axis value with visual bar
    const formatAxis = (value: number): string => {
      const normalized = Math.round((value + 1) * 5); // 0-10
      const bar = '='.repeat(normalized) + '|' + '='.repeat(10 - normalized);
      return `[${bar}] ${value.toFixed(2).padStart(6)}`;
    };

    // Format boolean with color
    const formatBool = (value: boolean, downThisFrame: boolean = false): string => {
      if (downThisFrame) return '<span style="color: #ff0">DOWN!</span>';
      return value ? '<span style="color: #0f0">HELD</span>' : '<span style="color: #666">----</span>';
    };

    this.element.innerHTML = `
      <div style="color: #fff; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 4px;">INPUT DEBUG</div>

      <div style="color: #888; margin-top: 8px;">AXES (smoothed)</div>
      <div>Horizontal: ${formatAxis(horz)}</div>
      <div>Vertical:   ${formatAxis(vert)}</div>

      <div style="color: #888; margin-top: 8px;">AXES (raw)</div>
      <div>Horizontal: ${horzRaw.toString().padStart(2)}</div>
      <div>Vertical:   ${vertRaw.toString().padStart(2)}</div>

      <div style="color: #888; margin-top: 8px;">BUTTONS</div>
      <div>Jump (Space): ${formatBool(jump, jumpDown)}</div>
      <div>Fire (X/LMB): ${formatBool(fire, fireDown)}</div>

      <div style="color: #888; margin-top: 8px;">MOUSE</div>
      <div>Position: ${mouse[0].toFixed(0)}, ${mouse[1].toFixed(0)}</div>
      <div>Left:  ${formatBool(mouseLeft)}</div>
      <div>Right: ${formatBool(mouseRight)}</div>

      <div style="color: #888; margin-top: 8px;">RAW KEYS</div>
      <div>WASD: ${this.getKey('KeyW') ? 'W' : '-'}${this.getKey('KeyA') ? 'A' : '-'}${this.getKey('KeyS') ? 'S' : '-'}${this.getKey('KeyD') ? 'D' : '-'}</div>
      <div>Arrows: ${this.getKey('ArrowUp') ? '^' : '-'}${this.getKey('ArrowLeft') ? '<' : '-'}${this.getKey('ArrowDown') ? 'v' : '-'}${this.getKey('ArrowRight') ? '>' : '-'}</div>
    `;
  }

  onDestroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
