/**
 * AudioSourceComponent - Per-GameObject audio playback with spatial audio support.
 */

import { Howl } from 'howler';
import { Component, registerComponent } from '../Component';
import { AudioManager, getAudioManager, type VolumeCategory } from '../audio';
import { getRenderer } from '../rendering';
import type { GameObject } from '../GameObject';
import type { AudioSourceJson, AnyComponentJson } from '../types';

export class AudioSourceComponent extends Component {
  readonly type = 'AudioSource';

  /** Audio file source path */
  src: string = '';

  /** Base volume (0-1) */
  volume: number = 1;

  /** Whether to loop playback */
  loop: boolean = false;

  /** Play automatically when component awakens */
  playOnAwake: boolean = false;

  /** Volume category for this sound */
  category: 'music' | 'sfx' = 'sfx';

  /** Enable spatial audio (stereo panning based on position) */
  spatial: boolean = false;

  /** Minimum distance for full volume (spatial audio) */
  minDistance: number = 100;

  /** Maximum distance before sound is silent (spatial audio) */
  maxDistance: number = 500;

  /** The loaded Howl instance */
  private sound: Howl | null = null;

  /** Current playing sound ID (for Howl's sprite system) */
  private soundId: number | null = null;

  /** Whether we're waiting for audio unlock to play */
  private pendingPlay: boolean = false;

  /** Cached effective volume for spatial calculations */
  private effectiveVolume: number = 1;

  constructor(gameObject: GameObject, data?: Partial<AudioSourceJson & { category?: 'music' | 'sfx' }>) {
    super(gameObject);
    this.src = data?.src ?? '';
    this.volume = data?.volume ?? 1;
    this.loop = data?.loop ?? false;
    this.playOnAwake = data?.playOnAwake ?? false;
    this.category = (data as { category?: 'music' | 'sfx' })?.category ?? 'sfx';
    this.spatial = data?.spatial ?? false;
    this.minDistance = data?.minDistance ?? 100;
    this.maxDistance = data?.maxDistance ?? 500;
  }

  async awake(): Promise<void> {
    // Initialize AudioManager if not already done
    AudioManager.init();

    // Load the sound if src is provided
    if (this.src) {
      try {
        this.sound = await getAudioManager().getSound(this.src);
      } catch (e) {
        console.error(`AudioSourceComponent: Failed to load ${this.src}`, e);
      }
    }
  }

  start(): void {
    // Handle playOnAwake in start() so editor preview doesn't trigger audio
    if (this.playOnAwake && this.sound) {
      if (AudioManager.isUnlocked()) {
        this.play();
      } else {
        this.pendingPlay = true;
        AudioManager.onUnlock(() => {
          if (this.pendingPlay && this.enabled) {
            this.play();
            this.pendingPlay = false;
          }
        });
      }
    }
  }

  update(): void {
    // Update spatial audio each frame
    if (this.spatial && this.soundId !== null && this.sound?.playing(this.soundId)) {
      this.updateSpatialAudio();
    }
  }

  /**
   * Play the sound.
   */
  play(): void {
    if (!this.sound) {
      console.warn('AudioSourceComponent: No sound loaded');
      return;
    }

    // Stop any currently playing instance
    if (this.soundId !== null) {
      this.sound.stop(this.soundId);
    }

    // Calculate effective volume
    this.effectiveVolume = this.volume * getAudioManager().getEffectiveVolume(this.category);

    // Configure and play
    this.sound.loop(this.loop);
    this.soundId = this.sound.play();
    this.sound.volume(this.effectiveVolume, this.soundId);

    // Apply initial spatial audio
    if (this.spatial) {
      this.updateSpatialAudio();
    }
  }

  /**
   * Pause playback.
   */
  pause(): void {
    if (this.sound && this.soundId !== null) {
      this.sound.pause(this.soundId);
    }
  }

  /**
   * Stop playback and reset position.
   */
  stop(): void {
    if (this.sound && this.soundId !== null) {
      this.sound.stop(this.soundId);
      this.soundId = null;
    }
  }

  /**
   * Resume paused playback.
   */
  resume(): void {
    if (this.sound && this.soundId !== null) {
      this.sound.play(this.soundId);
    }
  }

  /**
   * Seek to a specific time.
   * @param time - Time in seconds
   */
  seek(time: number): void {
    if (this.sound && this.soundId !== null) {
      this.sound.seek(time, this.soundId);
    }
  }

  /**
   * Fade volume over time.
   * @param from - Starting volume (0-1)
   * @param to - Ending volume (0-1)
   * @param duration - Fade duration in milliseconds
   */
  fade(from: number, to: number, duration: number): void {
    if (this.sound && this.soundId !== null) {
      const effectiveFrom = from * getAudioManager().getEffectiveVolume(this.category);
      const effectiveTo = to * getAudioManager().getEffectiveVolume(this.category);
      this.sound.fade(effectiveFrom, effectiveTo, duration, this.soundId);
    }
  }

  /**
   * Check if currently playing.
   */
  get playing(): boolean {
    if (!this.sound || this.soundId === null) return false;
    return this.sound.playing(this.soundId);
  }

  /**
   * Get current playback time in seconds.
   */
  getTime(): number {
    if (!this.sound || this.soundId === null) return 0;
    const seek = this.sound.seek(this.soundId);
    return typeof seek === 'number' ? seek : 0;
  }

  /**
   * Get total duration in seconds.
   */
  getDuration(): number {
    if (!this.sound) return 0;
    return this.sound.duration();
  }

  /**
   * Play a one-shot sound (doesn't interrupt main sound).
   * Useful for rapid SFX like gunshots or footsteps.
   * @param path - Optional different audio path (uses component's src if not provided)
   */
  async playOneShot(path?: string): Promise<void> {
    const audioPath = path ?? this.src;
    if (!audioPath) {
      console.warn('AudioSourceComponent: No path provided for one-shot');
      return;
    }

    try {
      const sound = await getAudioManager().getSound(audioPath);
      const effectiveVolume = this.volume * getAudioManager().getEffectiveVolume(this.category);
      const id = sound.play();
      sound.volume(effectiveVolume, id);

      // Apply spatial audio for one-shot
      if (this.spatial) {
        const { pan, volume } = this.calculateSpatialParams();
        sound.stereo(pan, id);
        sound.volume(effectiveVolume * volume, id);
      }
    } catch (e) {
      console.error(`AudioSourceComponent: Failed to play one-shot ${audioPath}`, e);
    }
  }

  /**
   * Update spatial audio parameters based on position.
   */
  private updateSpatialAudio(): void {
    if (!this.sound || this.soundId === null) return;

    const { pan, volume } = this.calculateSpatialParams();

    this.sound.stereo(pan, this.soundId);
    this.sound.volume(this.effectiveVolume * volume, this.soundId);
  }

  /**
   * Calculate spatial audio parameters.
   * @returns Pan (-1 to 1) and volume multiplier (0 to 1)
   */
  private calculateSpatialParams(): { pan: number; volume: number } {
    const renderer = getRenderer();
    const viewport = renderer.getViewportSize();
    const cameraPos = renderer.getCameraPosition();

    const worldPos = this.transform.worldPosition;

    // Calculate distance from camera center
    const dx = worldPos[0] - cameraPos.x;
    const dy = worldPos[1] - cameraPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate pan based on X offset from camera
    // Normalize to viewport width for panning
    const halfWidth = viewport.width / 2;
    const pan = Math.max(-1, Math.min(1, dx / halfWidth));

    // Calculate volume based on distance
    let volume = 1;
    if (distance > this.minDistance) {
      if (distance >= this.maxDistance) {
        volume = 0;
      } else {
        // Linear falloff between min and max distance
        const range = this.maxDistance - this.minDistance;
        volume = 1 - (distance - this.minDistance) / range;
      }
    }

    return { pan, volume };
  }

  onDestroy(): void {
    // Stop playback when component is destroyed
    this.stop();
    this.sound = null;
    this.pendingPlay = false;
  }

  toJSON(): AudioSourceJson & { category?: 'music' | 'sfx' } {
    const json: AudioSourceJson & { category?: 'music' | 'sfx' } = {
      type: 'AudioSource',
    };

    if (this.src) json.src = this.src;
    if (this.volume !== 1) json.volume = this.volume;
    if (this.loop) json.loop = this.loop;
    if (this.playOnAwake) json.playOnAwake = this.playOnAwake;
    if (this.category !== 'sfx') json.category = this.category;
    if (this.spatial) {
      json.spatial = this.spatial;
      if (this.minDistance !== 100) json.minDistance = this.minDistance;
      if (this.maxDistance !== 500) json.maxDistance = this.maxDistance;
    }

    return json;
  }
}

// Register the component factory
registerComponent('AudioSource', (gameObject, data) => {
  return new AudioSourceComponent(gameObject, data as AudioSourceJson);
});

export default AudioSourceComponent;
