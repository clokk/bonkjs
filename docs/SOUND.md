# Sound

`Sound` is a **zero-asset WebAudio SFX system**: named parametric sounds baked to short `AudioBuffer`s at
register time, played through **named bus gains** under one master. The synth is deliberately tiny —
waveform + exponential pitch slide + attack/decay envelope + white-noise mix + one-pole lowpass — enough to
give a prototype real, tunable gunfire/impact/UI sounds **with zero audio files**. Real samples can join
later via `loadSample()` and play through the same buses.

It handles the browser **autoplay policy** (the context resumes on a user gesture — retrying on every
gesture until it's actually running, since modifier/Escape keydowns fire listeners without granting
activation; pre-gesture plays
are dropped, not queued) and **no-ops cleanly where WebAudio doesn't exist** (node/tests), so game code can
call `play()` unconditionally.

## Basic Usage

```typescript
import { Sound } from 'bonkjs';

const sound = new Sound({ master: 0.8 });

sound.registerAll({
  shot:  { wave: 'square', freq: 900, freqEnd: 220, duration: 0.08, noise: 0.35, lowpass: 3200, decay: 2, jitter: 0.06 },
  boom:  { wave: 'noise', freq: 100, duration: 0.45, lowpass: 900, decay: 2.5, volume: 0.9 },
  pickup:{ wave: 'sine', freq: 660, freqEnd: 1320, duration: 0.1, decay: 1 },
});

sound.play('shot');                        // fire-and-forget; safe before unlock (silently drops)
sound.play('boom', { volume: 0.7, pan: -0.4, pitch: 0.9 });
```

## `SfxDef` (the recipe)

| Field | Default | Notes |
|-------|---------|-------|
| `wave` | `'sine'` | `'sine' \| 'square' \| 'saw' \| 'triangle' \| 'noise'` — `'noise'` ignores freq/tone |
| `freq` | `440` | start pitch, Hz |
| `freqEnd` | = `freq` | end pitch — **exponential slide** over the duration (lasers, zaps, whooshes) |
| `duration` | `0.12` | seconds |
| `attack` | `0.002` | seconds to ramp 0→full (declick) |
| `decay` | `1.5` | decay-curve exponent after the attack: `1` linear, `2+` punchier |
| `noise` | `0` | 0..1 white noise mixed over the tone (grit for shots/impacts) |
| `lowpass` | off | one-pole lowpass cutoff Hz, baked in (tames square/saw/noise) |
| `lowpassEnd` | = `lowpass` | end cutoff — the filter **sweeps** over the duration (exponential). On noise this is the difference between TV static and **wind/motion** |
| `volume` | `1` | baked gain 0..1 |
| `jitter` | `0` | ± fraction of random `playbackRate` per play (`0.05` = ±5%) — cheap variety on repeated sounds |
| `bus` | `'sfx'` | bus this sound routes through (auto-created) |
| `minInterval` | `30` | ms rate-limit per name — same-frame triggers (shotgun pellets) collapse into one play |

## Playing

```typescript
sound.play(name, { volume, pitch, pan });
// volume: multiplier on the baked volume
// pitch:  playbackRate multiplier (composes with the def's jitter)
// pan:    -1 (left) .. 1 (right)
```

## Buses & volume

Buses are auto-created on first reference and all feed the master:

```typescript
sound.setMasterVolume(0.8);
sound.setBusVolume('sfx', 0.6);   // e.g. buses: 'sfx', 'ui', 'music'
```

## Real samples (later)

```typescript
await sound.loadSample('boss_roar', '/audio/roar.ogg', { bus: 'sfx', jitter: 0.03 });
sound.play('boss_roar');
```

## Notes

- **Register early, play anywhere.** Baking happens at `register()` (a few ms of pure math per sound);
  `play()` is just a `BufferSource` + gain graph — cheap enough for fixed-update combat code.
- **`sound.ready`** is true once WebAudio exists *and* the first gesture unlocked the context. You rarely
  need it — `play()` self-gates.
- Non-determinism (`jitter`, noise) uses `Math.random` — audio is presentation, not simulation; keep it out
  of any determinism-sensitive path.
