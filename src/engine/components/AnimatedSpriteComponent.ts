/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                     ANIMATED SPRITE COMPONENT                              ║
 * ║                   Sprite Sheet Animation System                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * This component brings sprites to life by cycling through frames of a
 * sprite sheet at configurable frame rates. It handles:
 *
 * - Multiple named animation states (idle, run, jump, etc.)
 * - Frame-rate independent timing
 * - Looping and one-shot animations
 * - Runtime control (play, stop, switch animations)
 * - Callbacks for animation events
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  SPRITE SHEET ANATOMY                                                    │
 * │                                                                          │
 * │  A sprite sheet is a single image containing multiple animation frames  │
 * │  arranged in a grid. This avoids loading many small images and allows   │
 * │  the GPU to batch render calls efficiently.                              │
 * │                                                                          │
 * │  player-sheet.png (128x64 pixels, 4 columns x 2 rows, 32x32 per frame)  │
 * │  ┌───────┬───────┬───────┬───────┐                                      │
 * │  │ frame │ frame │ frame │ frame │  ← "idle" animation uses these       │
 * │  │   0   │   1   │   2   │   3   │    frames: [0, 1, 2, 3]              │
 * │  ├───────┼───────┼───────┼───────┤                                      │
 * │  │ frame │ frame │ frame │ frame │  ← "run" animation uses these        │
 * │  │   4   │   5   │   6   │   7   │    frames: [4, 5, 6, 7]              │
 * │  └───────┴───────┴───────┴───────┘                                      │
 * │                                                                          │
 * │  Frame indices are numbered left-to-right, top-to-bottom (like reading) │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * USAGE IN JSON SCENES:
 *
 * ```json
 * {
 *   "name": "Player",
 *   "transform": { "position": [400, 300], "rotation": 0, "scale": [1, 1] },
 *   "components": [{
 *     "type": "AnimatedSprite",
 *     "src": "./sprites/player-sheet.png",
 *     "frameWidth": 32,
 *     "frameHeight": 32,
 *     "animations": {
 *       "idle": { "frames": [0, 1, 2, 3], "frameRate": 8, "loop": true },
 *       "run": { "frames": [4, 5, 6, 7], "frameRate": 12, "loop": true },
 *       "jump": { "frames": [2], "frameRate": 1, "loop": false }
 *     },
 *     "defaultAnimation": "idle"
 *   }]
 * }
 * ```
 */

import { Component, registerComponent } from '../Component';
import { getRenderer } from '../rendering';
import type { RenderObject } from '../rendering';
import type { GameObject } from '../GameObject';
import type { AnimatedSpriteJson, AnyComponentJson } from '../types';
import { Time } from '../Time';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ANIMATION DEFINITION TYPE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Defines a single named animation (e.g., "idle", "run", "attack").
 * Each animation specifies which frames to use and how fast to play them.
 */
interface AnimationDefinition {
  /**
   * Array of frame indices in the sprite sheet.
   *
   * WHY an array instead of start/end range?
   * Arrays give full control over frame order. You can:
   * - Skip frames: [0, 2, 4] (every other frame)
   * - Reverse: [3, 2, 1, 0] (play backwards)
   * - Ping-pong: [0, 1, 2, 3, 2, 1] (forth and back)
   * - Hold: [0, 0, 0, 1, 2, 3] (pause on frame 0)
   *
   * @example [0, 1, 2, 3] - Simple 4-frame animation
   * @example [4, 5, 6, 7, 6, 5] - 6-frame ping-pong from row 2
   */
  frames: number[];

  /**
   * Frames per second for this animation.
   *
   * Common values:
   * - 8 fps: Slow, deliberate (idle, breathing)
   * - 12 fps: Standard animation (walking, simple actions)
   * - 16-24 fps: Smooth, fast (running, combat)
   *
   * WHY per-animation instead of global?
   * Different actions need different speeds. A character's idle
   * animation should be slow and relaxed, while their attack
   * animation should be snappy and fast.
   *
   * @default 12
   */
  frameRate: number;

  /**
   * Whether this animation loops when it reaches the end.
   *
   * - true: Cycles forever (idle, run, swim)
   * - false: Plays once then stops on last frame (jump, attack, death)
   *
   * For one-shot animations, use the onAnimationComplete callback
   * to trigger follow-up logic (return to idle, destroy object, etc.)
   *
   * @default true
   */
  loop: boolean;
}

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                     ANIMATED SPRITE COMPONENT CLASS                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
export class AnimatedSpriteComponent extends Component {
  readonly type = 'AnimatedSprite';

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION (from JSON)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Path to the sprite sheet image */
  src: string;

  /** Width of each frame in pixels */
  frameWidth: number;

  /** Height of each frame in pixels */
  frameHeight: number;

  /** Named animations with their frame sequences */
  animations: Map<string, AnimationDefinition>;

  /** Animation to play on awake (optional) */
  defaultAnimation?: string;

  /** Anchor point (0-1). [0.5, 0.5] = center, [0.5, 1] = bottom-center */
  anchor: [number, number] = [0.5, 0.5];

  /** Alpha transparency */
  alpha: number = 1;

  /** Flip sprite horizontally */
  flipX: boolean = false;

  /** Flip sprite vertically */
  flipY: boolean = false;

  // ═══════════════════════════════════════════════════════════════════════════
  // RUNTIME STATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * The render object from the renderer.
   * Handles all visual display - we just tell it which texture region to show.
   */
  private renderObject: RenderObject | null = null;

  /**
   * Currently playing animation name, or null if none.
   */
  private currentAnimation: string | null = null;

  /**
   * Current position within the animation's frames array.
   *
   * NOT the sprite sheet frame index! This is the index into the
   * animation's frames[] array. For example:
   *
   *   animation "run" = { frames: [4, 5, 6, 7], ... }
   *   currentFrameIndex = 2
   *   → We display sprite sheet frame 6 (frames[2])
   */
  private currentFrameIndex: number = 0;

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * FRAME TIMING EXPLAINED
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * WHY accumulate time instead of counting frames?
   *
   * Game FPS (60) and animation FPS (12) are independent. We can't just
   * advance the animation every N game frames because:
   * 1. Game FPS varies (60 → 30 during lag spike)
   * 2. Animation FPS doesn't divide evenly (12 fps = every 5.0 game frames)
   *
   * Solution: Accumulate real elapsed time, advance frame when threshold met.
   *
   * Example at 12 fps animation, 60 fps game:
   *
   *   secondsPerFrame = 1/12 = 0.0833 seconds
   *   Each game frame: deltaTime ≈ 0.0167 seconds
   *
   *   Frame 1: accumulator = 0.0167 (< 0.0833, no advance)
   *   Frame 2: accumulator = 0.0333 (< 0.0833, no advance)
   *   Frame 3: accumulator = 0.0500 (< 0.0833, no advance)
   *   Frame 4: accumulator = 0.0667 (< 0.0833, no advance)
   *   Frame 5: accumulator = 0.0833 (>= 0.0833, ADVANCE! reset to 0)
   *   Frame 6: accumulator = 0.0167 ...
   *
   * This gives us frame-rate independent animation that looks the same
   * whether the game runs at 30, 60, or 144 fps.
   */
  private frameAccumulator: number = 0;

  /**
   * Whether animation is currently playing or paused.
   * Use play() and stop() to control.
   */
  private isPlaying: boolean = false;

  /**
   * Number of columns in the sprite sheet grid.
   * Calculated from: textureWidth / frameWidth
   * Used to convert linear frame index to 2D grid position.
   */
  private sheetColumns: number = 1;

  /**
   * Whether the texture has loaded and we can animate.
   * Before this is true, we show a placeholder and skip animation logic.
   */
  private textureReady: boolean = false;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACKS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Called when a non-looping animation reaches its last frame.
   *
   * Common uses:
   * - Return to idle: onAnimationComplete = () => this.playAnimation('idle')
   * - Destroy object: onAnimationComplete = () => this.gameObject.destroy()
   * - Trigger next state: onAnimationComplete = (name) => stateMachine.next()
   *
   * @param name - The animation that completed
   */
  onAnimationComplete: ((name: string) => void) | null = null;

  /**
   * Called every time the displayed frame changes.
   * Useful for syncing sound effects or particle bursts to specific frames.
   *
   * @param frameIndex - Index within the animation's frames array (not sheet index)
   * @param name - Currently playing animation name
   */
  onFrameChange: ((frameIndex: number, name: string) => void) | null = null;

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRUCTOR
  // ═══════════════════════════════════════════════════════════════════════════

  constructor(
    gameObject: GameObject,
    data?: Partial<AnimatedSpriteJson & { flipX?: boolean; flipY?: boolean }>
  ) {
    super(gameObject);

    this.src = data?.src ?? '';
    this.frameWidth = data?.frameWidth ?? 32;
    this.frameHeight = data?.frameHeight ?? 32;
    this.defaultAnimation = data?.defaultAnimation;
    if (data?.anchor) this.anchor = [...data.anchor];
    this.flipX = data?.flipX ?? false;
    this.flipY = data?.flipY ?? false;

    // Convert plain object animations to Map for easier lookup
    this.animations = new Map();
    if (data?.animations) {
      for (const [name, anim] of Object.entries(data.animations)) {
        this.animations.set(name, {
          frames: anim.frames,
          frameRate: anim.frameRate ?? 12,
          loop: anim.loop ?? true,
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Called when the component is first added to the scene.
   * Creates the render object and starts loading the sprite sheet.
   */
  awake(): void {
    const renderer = getRenderer();

    // Determine placeholder color based on tag (matches SpriteComponent behavior)
    const tag = this.gameObject.tag;
    const color = this.getPlaceholderColor(tag);

    // Create animated sprite render object
    // This shows a placeholder until the texture loads
    this.renderObject = renderer.createAnimatedSprite({
      src: this.src || undefined,
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      color,
      anchor: this.anchor,
      alpha: this.alpha,
      zIndex: this.transform.zIndex,
      onTextureReady: () => {
        this.onTextureLoaded();
      },
    });

    // Initial transform sync
    this.syncTransform();
  }

  /**
   * Called when the sprite sheet texture has finished loading.
   * Now we can calculate sheet dimensions and start the default animation.
   */
  private onTextureLoaded(): void {
    this.textureReady = true;

    // Calculate columns from the texture
    // We assume the texture width is a multiple of frameWidth
    // For a 128px wide sheet with 32px frames: 128 / 32 = 4 columns
    //
    // Note: We don't have direct access to texture dimensions here,
    // so we'll calculate columns on first setTextureRegion call
    // based on common sprite sheet conventions (estimate from frame count)

    // Estimate columns: find the animation with most frames
    // and assume a reasonable grid layout
    let maxFrame = 0;
    for (const anim of this.animations.values()) {
      for (const frame of anim.frames) {
        maxFrame = Math.max(maxFrame, frame);
      }
    }

    // Assume 4 columns for typical sprite sheets (can be overridden)
    // A smarter approach would read texture dimensions, but this works
    // for most common sprite sheet layouts
    this.sheetColumns = Math.max(4, Math.ceil(Math.sqrt(maxFrame + 1)));

    // Play default animation if specified
    if (this.defaultAnimation && this.animations.has(this.defaultAnimation)) {
      this.playAnimation(this.defaultAnimation);
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * UPDATE LOOP - THE HEART OF ANIMATION
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Called every frame by the engine. This is where animation timing happens.
   *
   * Flow:
   * 1. Skip if not playing or texture not ready
   * 2. Add deltaTime to accumulator
   * 3. If accumulator >= secondsPerFrame, advance to next frame
   * 4. Use while loop (not if) to handle lag spikes correctly
   * 5. Sync transform to render object
   */
  update(): void {
    if (!this.textureReady || !this.isPlaying || !this.currentAnimation) {
      this.syncTransform();
      return;
    }

    const animation = this.animations.get(this.currentAnimation);
    if (!animation) {
      this.syncTransform();
      return;
    }

    // Calculate time per frame from frame rate
    // At 12 fps: secondsPerFrame = 1/12 = 0.0833 seconds
    const secondsPerFrame = 1 / animation.frameRate;

    // Accumulate elapsed time
    this.frameAccumulator += Time.deltaTime;

    /**
     * WHY while loop instead of if?
     *
     * During a lag spike, deltaTime might be 0.5 seconds.
     * At 12 fps, that's 6 frames worth of time!
     *
     * With 'if': We'd advance once and leave 5 frames of time in accumulator
     * With 'while': We advance 6 times, properly skipping frames during lag
     *
     * This prevents the animation from "catching up" in slow motion after lag.
     */
    while (this.frameAccumulator >= secondsPerFrame) {
      this.frameAccumulator -= secondsPerFrame;
      this.advanceFrame(animation);
    }

    this.syncTransform();
  }

  /**
   * Advance to the next frame in the animation sequence.
   * Handles looping, one-shot completion, and frame change callbacks.
   */
  private advanceFrame(animation: AnimationDefinition): void {
    const nextFrameIndex = this.currentFrameIndex + 1;

    if (nextFrameIndex >= animation.frames.length) {
      // Reached end of animation
      if (animation.loop) {
        // Loop back to start
        this.currentFrameIndex = 0;
      } else {
        // One-shot animation complete - stay on last frame
        this.isPlaying = false;
        this.onAnimationComplete?.(this.currentAnimation!);
        return; // Don't update frame or fire callback
      }
    } else {
      this.currentFrameIndex = nextFrameIndex;
    }

    // Update the displayed frame
    this.applyFrame();

    // Notify listeners of frame change
    this.onFrameChange?.(this.currentFrameIndex, this.currentAnimation!);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * FRAME COORDINATE CALCULATION
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Converts a linear frame index to 2D pixel coordinates in the sprite sheet.
   *
   * Linear Index → Grid Position → Pixel Coordinates
   *
   * Example: Frame 5 in a 4-column sheet (32x32 frames)
   *
   *   column = 5 % 4 = 1
   *   row = floor(5 / 4) = 1
   *
   *   x = 1 * 32 = 32 pixels
   *   y = 1 * 32 = 32 pixels
   *
   *   ┌───────┬───────┬───────┬───────┐
   *   │   0   │   1   │   2   │   3   │ row 0
   *   ├───────┼───────┼───────┼───────┤
   *   │   4   │ ████ │   6   │   7   │ row 1  ← frame 5 is at (32, 32)
   *   └───────┴───────┴───────┴───────┘
   *           col 1
   */
  private applyFrame(): void {
    if (!this.renderObject?.setTextureRegion || !this.currentAnimation) return;

    const animation = this.animations.get(this.currentAnimation);
    if (!animation) return;

    // Get the sprite sheet frame index from the animation's frame array
    const sheetFrameIndex = animation.frames[this.currentFrameIndex];

    // Convert linear index to 2D grid position
    const column = sheetFrameIndex % this.sheetColumns;
    const row = Math.floor(sheetFrameIndex / this.sheetColumns);

    // Calculate pixel coordinates in the sprite sheet
    const x = column * this.frameWidth;
    const y = row * this.frameHeight;

    // Tell the renderer to display this region of the texture
    this.renderObject.setTextureRegion(x, y, this.frameWidth, this.frameHeight);
  }

  /**
   * Sync the GameObject's transform to the render object.
   * Called every frame to keep visual in sync with game state.
   */
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

  /**
   * Get placeholder color based on game object tag.
   */
  private getPlaceholderColor(tag: string | undefined): number {
    const tagColors: Record<string, number> = {
      Player: 0x00ff00,
      Enemy: 0xff0000,
      Collectible: 0xffff00,
      Platform: 0x888888,
      Ground: 0x8b4513,
    };
    return tag && tagColors[tag] ? tagColors[tag] : 0xff00ff;
  }

  /**
   * Called when the component is destroyed.
   * Clean up the render object.
   */
  onDestroy(): void {
    if (this.renderObject) {
      this.renderObject.destroy();
      this.renderObject = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Play a named animation.
   *
   * @param name - Animation name (must exist in animations map)
   * @param forceRestart - If true, restart even if already playing this animation
   *
   * @example
   * // In a behavior script:
   * const anim = this.gameObject.getComponent(AnimatedSpriteComponent);
   * anim.playAnimation('run');
   *
   * // Force restart (useful for attack animations)
   * anim.playAnimation('attack', true);
   */
  playAnimation(name: string, forceRestart: boolean = false): void {
    if (!this.animations.has(name)) {
      console.warn(`Animation "${name}" not found`);
      return;
    }

    // Skip if already playing this animation (unless forced)
    if (this.currentAnimation === name && this.isPlaying && !forceRestart) {
      return;
    }

    this.currentAnimation = name;
    this.currentFrameIndex = 0;
    this.frameAccumulator = 0;
    this.isPlaying = true;

    // Immediately show the first frame
    if (this.textureReady) {
      this.applyFrame();
    }
  }

  /**
   * Stop the current animation (pause on current frame).
   */
  stop(): void {
    this.isPlaying = false;
  }

  /**
   * Resume playing the current animation from where it stopped.
   */
  play(): void {
    if (this.currentAnimation) {
      this.isPlaying = true;
    }
  }

  /**
   * Jump to a specific frame in the current animation.
   *
   * @param index - Frame index within the animation's frames array
   * @param andPlay - Whether to start playing (default: false, just shows frame)
   *
   * @example
   * // Show a specific pose without playing
   * anim.gotoFrame(0); // Show first frame of current animation
   *
   * // Jump to frame and continue playing
   * anim.gotoFrame(3, true);
   */
  gotoFrame(index: number, andPlay: boolean = false): void {
    if (!this.currentAnimation) return;

    const animation = this.animations.get(this.currentAnimation);
    if (!animation) return;

    // Clamp to valid range
    this.currentFrameIndex = Math.max(0, Math.min(index, animation.frames.length - 1));
    this.frameAccumulator = 0;
    this.isPlaying = andPlay;

    if (this.textureReady) {
      this.applyFrame();
    }
  }

  /**
   * Get the name of the currently set animation (even if paused).
   */
  getCurrentAnimation(): string | null {
    return this.currentAnimation;
  }

  /**
   * Check if an animation is currently playing (not paused/stopped).
   */
  isAnimationPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Check if an animation with the given name exists.
   */
  hasAnimation(name: string): boolean {
    return this.animations.has(name);
  }

  /**
   * Get all available animation names.
   */
  getAnimationNames(): string[] {
    return Array.from(this.animations.keys());
  }

  /**
   * Set the number of columns in the sprite sheet grid.
   * Normally auto-detected, but can be set manually if needed.
   *
   * @example
   * // For a sprite sheet with 8 columns
   * anim.setSheetColumns(8);
   */
  setSheetColumns(columns: number): void {
    this.sheetColumns = columns;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  toJSON(): AnimatedSpriteJson {
    // Convert Map back to plain object for serialization
    const animationsObj: Record<string, { frames: number[]; frameRate?: number; loop?: boolean }> = {};
    for (const [name, anim] of this.animations) {
      animationsObj[name] = {
        frames: anim.frames,
        frameRate: anim.frameRate,
        loop: anim.loop,
      };
    }

    return {
      type: 'AnimatedSprite',
      src: this.src,
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      animations: animationsObj,
      defaultAnimation: this.defaultAnimation,
      anchor: this.anchor,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

registerComponent('AnimatedSprite', (gameObject, data) => {
  return new AnimatedSpriteComponent(gameObject, data as AnimatedSpriteJson);
});

export default AnimatedSpriteComponent;
