# Audio System

Bonk Engine's audio system provides Unity-familiar patterns for audio playback using [Howler.js](https://howlerjs.com/) under the hood.

## Architecture

The audio system uses a hybrid approach:

- **AudioManager** - Global singleton for caching sounds, managing volume categories, and handling browser autoplay restrictions
- **AudioSourceComponent** - Per-GameObject component for playback control and spatial audio

## Quick Start

### Basic Playback (JSON)

```json
{
  "name": "BackgroundMusic",
  "transform": { "position": [0, 0], "rotation": 0, "scale": [1, 1] },
  "components": [{
    "type": "AudioSource",
    "src": "./audio/music.mp3",
    "category": "music",
    "loop": true,
    "playOnAwake": true,
    "volume": 0.5
  }]
}
```

### Playback from Behavior

```typescript
import { Behavior, AudioSourceComponent } from 'bonk-engine';

class Collectible extends Behavior {
  onTriggerEnter(other: GameObject) {
    if (other.tag === 'Player') {
      this.getComponent(AudioSourceComponent)?.play();
      this.destroy();
    }
  }
}
```

### Volume Control

```typescript
import { getAudioManager } from 'bonk-engine';

const audio = getAudioManager();

// Set category volumes (0-1)
audio.setVolume('master', 0.8);
audio.setVolume('music', 0.5);
audio.setVolume('sfx', 1.0);

// Get current volume
const musicVolume = audio.getVolume('music'); // 0.5
const effectiveMusic = audio.getEffectiveVolume('music'); // 0.4 (0.8 * 0.5)
```

## AudioSourceComponent

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `src` | string | `''` | Audio file path |
| `volume` | number | `1` | Base volume (0-1) |
| `loop` | boolean | `false` | Loop playback |
| `playOnAwake` | boolean | `false` | Auto-play when component starts |
| `category` | `'music' \| 'sfx'` | `'sfx'` | Volume category |
| `spatial` | boolean | `false` | Enable 2D spatial audio |
| `minDistance` | number | `100` | Distance for full volume |
| `maxDistance` | number | `500` | Distance where sound is silent |

### Methods

```typescript
// Playback control
audioSource.play();      // Start playing
audioSource.pause();     // Pause playback
audioSource.resume();    // Resume from pause
audioSource.stop();      // Stop and reset position

// Seeking
audioSource.seek(5.0);   // Jump to 5 seconds

// Fading
audioSource.fade(1, 0, 2000);  // Fade out over 2 seconds

// One-shot (for rapid SFX)
audioSource.playOneShot();                    // Play component's src
audioSource.playOneShot('./audio/hit.wav');   // Play different sound

// State
audioSource.playing;        // boolean - is currently playing?
audioSource.getTime();      // number - current playback position
audioSource.getDuration();  // number - total duration
```

## AudioManager

### Initialization

AudioManager auto-initializes when the first AudioSourceComponent loads. You can also initialize manually:

```typescript
import { AudioManager } from 'bonk-engine';

AudioManager.init();
```

### Volume Categories

Three volume categories that multiply together:

```
effectiveVolume = master × category × componentVolume
```

Example: master=0.8, music=0.5, component=0.7 → effective=0.28

### Preloading

```typescript
const audio = getAudioManager();

// Preload sounds during loading screen
await audio.preload([
  './audio/music/theme.mp3',
  './audio/sfx/jump.wav',
  './audio/sfx/coin.wav',
]);
```

### Getting Sounds Directly

```typescript
// Async - loads if not cached
const sound = await audio.getSound('./audio/explosion.wav');

// Sync - returns null if not cached
const cachedSound = audio.getSoundSync('./audio/explosion.wav');
```

### Cleanup

```typescript
// Unload specific sound
audio.unload('./audio/music.mp3');

// Stop all sounds
audio.stopAll();

// Pause all sounds (e.g., when game pauses)
audio.pauseAll();

// Destroy everything (cleanup on game exit)
audio.destroy();
```

## Spatial Audio

2D spatial audio uses stereo panning and distance-based volume falloff.

```json
{
  "name": "Waterfall",
  "transform": { "position": [500, 0], "rotation": 0, "scale": [1, 1] },
  "components": [{
    "type": "AudioSource",
    "src": "./audio/ambient/waterfall.mp3",
    "spatial": true,
    "minDistance": 100,
    "maxDistance": 400,
    "loop": true,
    "playOnAwake": true
  }]
}
```

### How It Works

**Stereo Panning:**
- Objects to the left of camera → sound pans left
- Objects to the right of camera → sound pans right
- Objects at camera center → centered audio

**Volume Falloff:**
- Within `minDistance` → full volume
- Between `minDistance` and `maxDistance` → linear falloff
- Beyond `maxDistance` → silent

```
        Camera
          │
    ←─────┼─────→
   pan=-1 │ pan=+1
          │
          ▼
    minDistance: full volume
         ╲╱
          │
          │ (linear falloff)
          │
         ╲╱
    maxDistance: silent
```

## Browser Autoplay

Modern browsers block autoplay until user interaction. The audio system handles this automatically:

1. `AudioManager.init()` sets up click/touch/keydown listeners
2. On first interaction, the audio context is unlocked
3. Sounds with `playOnAwake=true` queue and play after unlock

### Checking Unlock Status

```typescript
const audio = getAudioManager();

if (audio.isUnlocked()) {
  // Audio will play immediately
} else {
  // Audio is queued until user interacts
}

// Run code when audio unlocks
audio.onUnlock(() => {
  console.log('Audio ready!');
});
```

### Events

```typescript
import { GlobalEvents, AudioEvents } from 'bonk-engine';

// Audio unlocked
GlobalEvents.on(AudioEvents.UNLOCKED, () => {
  // Hide "click to enable audio" UI
});

// Volume changed
GlobalEvents.on(AudioEvents.VOLUME_CHANGED, ({ category, value }) => {
  console.log(`${category} volume changed to ${value}`);
});
```

## Common Patterns

### Music Player with Crossfade

```typescript
class MusicPlayer extends Behavior {
  private currentMusic: AudioSourceComponent | null = null;

  async playTrack(src: string) {
    // Fade out current
    if (this.currentMusic?.playing) {
      this.currentMusic.fade(1, 0, 1000);
      await this.wait(1);
      this.currentMusic.stop();
    }

    // Create new audio source
    const musicGO = new GameObject('Music');
    this.currentMusic = musicGO.addComponent(AudioSourceComponent, {
      src,
      category: 'music',
      loop: true,
    });

    // Fade in
    this.currentMusic.play();
    this.currentMusic.fade(0, 1, 1000);
  }
}
```

### Sound Pool for Rapid SFX

```typescript
class Weapon extends Behavior {
  private audioSource!: AudioSourceComponent;

  start() {
    this.audioSource = this.getComponent(AudioSourceComponent)!;
  }

  fire() {
    // playOneShot creates independent instances
    // Won't cut off previous sounds
    this.audioSource.playOneShot('./audio/sfx/gunshot.wav');
  }
}
```

### Volume Settings UI

```typescript
class VolumeSettings extends Behavior {
  onMasterChange(value: number) {
    getAudioManager().setVolume('master', value);
  }

  onMusicChange(value: number) {
    getAudioManager().setVolume('music', value);
  }

  onSFXChange(value: number) {
    getAudioManager().setVolume('sfx', value);
  }
}
```

## Supported Formats

Howler.js handles format compatibility. Recommended formats:

- **MP3** - Wide support, good for music
- **WAV** - Uncompressed, good for short SFX
- **OGG** - Good compression, limited iOS support
- **WebM** - Modern browsers

For best compatibility, provide MP3 as the primary format.
