/**
 * Sound - a zero-asset WebAudio SFX system: named parametric sounds baked to short buffers at register
 * time, played through named bus gains under one master.
 *
 * The synth is deliberately tiny (waveform + exponential pitch slide + attack/decay envelope + white-noise
 * mix + one-pole lowpass, all baked offline into an AudioBuffer) — enough to give a prototype real, tunable
 * gunfire/impact/UI sounds with zero audio files. Real samples can join later via `loadSample()` and play
 * through the same buses. Handles the browser autoplay policy (context resumes on the first user gesture)
 * and no-ops cleanly where WebAudio doesn't exist (node/tests), so game code can call `play()` unconditionally.
 */

export type SfxWave = 'sine' | 'square' | 'saw' | 'triangle' | 'noise';

/** Parametric SFX recipe — baked to an AudioBuffer when registered. */
export interface SfxDef {
  wave?: SfxWave;        // oscillator shape ('noise' ignores freq/tone). Default 'sine'.
  freq?: number;         // start pitch in Hz. Default 440.
  freqEnd?: number;      // end pitch in Hz — exponential slide over the duration. Default = freq (no slide).
  duration?: number;     // total length in seconds. Default 0.12.
  attack?: number;       // seconds to ramp 0→full at the start (declick). Default 0.002.
  decay?: number;        // decay-curve exponent after the attack: 1 = linear fade, 2+ = punchier. Default 1.5.
  noise?: number;        // 0..1 white-noise mixed over the tone (grit for shots/impacts). Default 0.
  lowpass?: number;      // one-pole lowpass cutoff in Hz, baked in (tames square/saw/noise). Undefined = off.
  lowpassEnd?: number;   // end cutoff in Hz — the filter SWEEPS lowpass→lowpassEnd over the duration
                         // (exponential). The difference between static and WIND on a noise source:
                         // a fixed filter reads as TV hiss, a moving one reads as motion. Default = lowpass.
  volume?: number;       // 0..1 baked gain. Default 1.
  jitter?: number;       // ± fraction of random playbackRate variation per play (0.05 = ±5%). Default 0.
  bus?: string;          // bus this sound routes through (auto-created). Default 'sfx'.
  minInterval?: number;  // ms rate-limit per sound name — many same-frame triggers (shotgun pellets) collapse
                         // into one play instead of phase-stacking into a volume spike. Default 30.
}

export interface SoundPlayOptions {
  volume?: number;  // multiplier on the baked volume. Default 1.
  pitch?: number;   // playbackRate multiplier (composes with the def's jitter). Default 1.
  pan?: number;     // stereo position -1 (left) .. 1 (right). Default 0.
}

export interface SoundConfig {
  /** Initial master volume 0..1. Default 1. */
  master?: number;
}

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses = new Map<string, GainNode>();
  private defs = new Map<string, SfxDef>();
  private buffers = new Map<string, AudioBuffer>();
  private lastPlayed = new Map<string, number>();

  constructor(config: SoundConfig = {}) {
    const AC: typeof AudioContext | undefined =
      (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
    if (!AC) return; // node / tests — every method below no-ops

    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = config.master ?? 1;
    this.master.connect(this.ctx.destination);

    // Autoplay policy: the context starts suspended until a user gesture. Resume on the first one.
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
    }
  }

  /** True when WebAudio exists and the context has been unlocked by a user gesture. */
  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Register (or replace) a parametric sound — bakes its buffer now. */
  register(name: string, def: SfxDef): void {
    this.defs.set(name, def);
    if (this.ctx) this.buffers.set(name, this.bake(def));
  }

  /** Register a whole table of sounds at once. */
  registerAll(defs: Record<string, SfxDef>): void {
    for (const [name, def] of Object.entries(defs)) this.register(name, def);
  }

  /**
   * Load a real audio file into the same registry (plays through the same buses / options).
   * `def` supplies the non-synth fields (bus/volume/jitter/minInterval); synth fields are ignored.
   */
  async loadSample(name: string, url: string, def: SfxDef = {}): Promise<void> {
    if (!this.ctx) return;
    const res = await fetch(url);
    const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
    this.defs.set(name, def);
    this.buffers.set(name, buf);
  }

  /** Fire a registered sound. Safe to call unconditionally — no-ops when unavailable/locked/rate-limited. */
  play(name: string, opts: SoundPlayOptions = {}): void {
    if (!this.ctx || !this.master) return;
    if (this.ctx.state !== 'running') return; // pre-gesture: drop rather than queue a stale burst
    const def = this.defs.get(name);
    const buffer = this.buffers.get(name);
    if (!def || !buffer) return;

    const now = performance.now();
    const last = this.lastPlayed.get(name) ?? -Infinity;
    if (now - last < (def.minInterval ?? 30)) return;
    this.lastPlayed.set(name, now);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const jitter = def.jitter ?? 0;
    src.playbackRate.value = (opts.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * jitter);

    let node: AudioNode = src;
    const vol = opts.volume ?? 1;
    if (vol !== 1) {
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      node.connect(gain);
      node = gain;
    }
    if (opts.pan) {
      const pan = this.ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, opts.pan));
      node.connect(pan);
      node = pan;
    }
    node.connect(this.bus(def.bus ?? 'sfx'));
    src.start();
  }

  /** Master volume 0..1. */
  setMasterVolume(v: number): void {
    if (this.master) this.master.gain.value = Math.max(0, Math.min(1, v));
  }

  /** Per-bus volume 0..1 (bus auto-created on first reference). */
  setBusVolume(name: string, v: number): void {
    if (!this.ctx) return;
    this.bus(name).gain.value = Math.max(0, Math.min(1, v));
  }

  private bus(name: string): GainNode {
    let g = this.buses.get(name);
    if (!g) {
      g = this.ctx!.createGain();
      g.connect(this.master!);
      this.buses.set(name, g);
    }
    return g;
  }

  /** Synthesize a def into a mono AudioBuffer (offline, at register time). */
  private bake(def: SfxDef): AudioBuffer {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const duration = Math.max(0.005, def.duration ?? 0.12);
    const n = Math.floor(duration * sr);
    const buf = ctx.createBuffer(1, n, sr);
    const data = buf.getChannelData(0);

    const wave = def.wave ?? 'sine';
    const f0 = Math.max(1, def.freq ?? 440);
    const f1 = Math.max(1, def.freqEnd ?? f0);
    const attack = Math.min(def.attack ?? 0.002, duration * 0.5);
    const decayPow = def.decay ?? 1.5;
    const noiseMix = wave === 'noise' ? 1 : (def.noise ?? 0);
    const volume = def.volume ?? 1;
    const lp0 = def.lowpass ?? 0;
    const lp1 = def.lowpassEnd ?? lp0;
    const lpSweep = lp0 > 0 && lp1 !== lp0;

    let phase = 0;
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const tSec = i / sr;

      // Exponential pitch slide f0 → f1.
      const f = f0 * Math.pow(f1 / f0, t);
      phase += (2 * Math.PI * f) / sr;

      let tone = 0;
      if (wave === 'sine') tone = Math.sin(phase);
      else if (wave === 'square') tone = Math.sin(phase) >= 0 ? 1 : -1;
      else if (wave === 'saw') tone = ((phase / (2 * Math.PI)) % 1) * 2 - 1;
      else if (wave === 'triangle') tone = Math.abs((((phase / (2 * Math.PI)) % 1) * 4 - 2)) - 1;

      let s = tone * (1 - noiseMix) + (Math.random() * 2 - 1) * noiseMix;

      // Envelope: linear attack, then a power-curve decay to 0.
      const env = tSec < attack
        ? tSec / attack
        : Math.pow(Math.max(0, 1 - (tSec - attack) / (duration - attack)), decayPow);
      s *= env * volume;

      if (lp0 > 0) {
        // Exponential cutoff sweep lp0→lp1 (recomputing alpha per sample is cheap at bake time).
        const cut = lpSweep ? lp0 * Math.pow(lp1 / lp0, t) : lp0;
        const lpAlpha = 1 - Math.exp((-2 * Math.PI * cut) / sr);
        lp += lpAlpha * (s - lp);
        s = lp;
      }
      data[i] = s;
    }
    return buf;
  }
}
