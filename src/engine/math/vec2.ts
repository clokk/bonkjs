import type { Vector2 } from '../types/math';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export const vec2 = {
  // Creation
  zero: (): Vector2 => [0, 0],
  one: (): Vector2 => [1, 1],
  from: (x: number, y: number): Vector2 => [x, y],

  // Arithmetic
  add: (a: Vector2, b: Vector2): Vector2 => [a[0] + b[0], a[1] + b[1]],
  sub: (a: Vector2, b: Vector2): Vector2 => [a[0] - b[0], a[1] - b[1]],
  scale: (v: Vector2, s: number): Vector2 => [v[0] * s, v[1] * s],
  mul: (a: Vector2, b: Vector2): Vector2 => [a[0] * b[0], a[1] * b[1]],
  negate: (v: Vector2): Vector2 => [-v[0], -v[1]],

  // Geometry
  length: (v: Vector2): number => Math.sqrt(v[0] * v[0] + v[1] * v[1]),
  lengthSq: (v: Vector2): number => v[0] * v[0] + v[1] * v[1],
  distance: (a: Vector2, b: Vector2): number => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return Math.sqrt(dx * dx + dy * dy);
  },
  distanceSq: (a: Vector2, b: Vector2): number => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return dx * dx + dy * dy;
  },
  normalize: (v: Vector2): Vector2 => {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    if (len === 0) return [0, 0];
    return [v[0] / len, v[1] / len];
  },
  dot: (a: Vector2, b: Vector2): number => a[0] * b[0] + a[1] * b[1],
  cross: (a: Vector2, b: Vector2): number => a[0] * b[1] - a[1] * b[0],

  // Interpolation
  lerp: (a: Vector2, b: Vector2, t: number): Vector2 => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ],

  // Transformation
  rotate: (v: Vector2, degrees: number): Vector2 => {
    const rad = degrees * DEG_TO_RAD;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return [v[0] * cos - v[1] * sin, v[0] * sin + v[1] * cos];
  },
  reflect: (v: Vector2, normal: Vector2): Vector2 => {
    const d = 2 * (v[0] * normal[0] + v[1] * normal[1]);
    return [v[0] - d * normal[0], v[1] - d * normal[1]];
  },
  perpendicular: (v: Vector2): Vector2 => [-v[1], v[0]],

  // Comparison
  equals: (a: Vector2, b: Vector2, epsilon: number = 1e-6): boolean =>
    Math.abs(a[0] - b[0]) <= epsilon && Math.abs(a[1] - b[1]) <= epsilon,

  // Utility
  angle: (v: Vector2): number => Math.atan2(v[1], v[0]) * RAD_TO_DEG,
  angleBetween: (a: Vector2, b: Vector2): number => {
    const lenA = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
    const lenB = Math.sqrt(b[0] * b[0] + b[1] * b[1]);
    if (lenA === 0 || lenB === 0) return 0;
    const dot = a[0] * b[0] + a[1] * b[1];
    const cos = Math.max(-1, Math.min(1, dot / (lenA * lenB)));
    return Math.acos(cos) * RAD_TO_DEG;
  },
  clampLength: (v: Vector2, max: number): Vector2 => {
    const lenSq = v[0] * v[0] + v[1] * v[1];
    if (lenSq <= max * max) return [v[0], v[1]];
    const len = Math.sqrt(lenSq);
    return [(v[0] / len) * max, (v[1] / len) * max];
  },
};
