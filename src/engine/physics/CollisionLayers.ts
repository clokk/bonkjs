/**
 * CollisionLayerRegistry - Maps human-readable layer names to bitmask positions.
 * Used by MatterPhysicsWorld to configure Matter.js collision filters.
 *
 * 32 layers max (matching Matter.js 32-bit collision filter integers).
 * Auto-registers unknown names on first use — no upfront config required.
 */

class CollisionLayerRegistry {
  private nameToIndex = new Map<string, number>();
  private nextIndex = 0;

  constructor() {
    // "default" is always index 0 (category 0x0001), matching Matter.js defaults
    this.register('default');
  }

  /** Register a named layer. Returns the bit index. No-op if already registered. */
  register(name: string): number {
    const existing = this.nameToIndex.get(name);
    if (existing !== undefined) return existing;

    if (this.nextIndex >= 32) {
      console.warn(
        `[CollisionLayers] Maximum 32 layers reached. Cannot register "${name}".`
      );
      return 0; // Fall back to default layer
    }

    const index = this.nextIndex++;
    this.nameToIndex.set(name, index);
    return index;
  }

  /** Get bitmask category for a layer name. Auto-registers if unknown. */
  category(name: string): number {
    const index = this.register(name);
    return 1 << index;
  }

  /** Get combined bitmask from an array of layer names. Empty = collide with all. */
  mask(names: string[]): number {
    if (names.length === 0) return 0xFFFFFFFF;

    let result = 0;
    for (const name of names) {
      result |= this.category(name);
    }
    return result;
  }

  /** Get all registered layer names (in registration order). */
  getLayerNames(): string[] {
    return Array.from(this.nameToIndex.keys());
  }

  /** Clear the registry. Useful for testing or scene transitions. */
  reset(): void {
    this.nameToIndex.clear();
    this.nextIndex = 0;
    this.register('default');
  }
}

export const CollisionLayers = new CollisionLayerRegistry();
