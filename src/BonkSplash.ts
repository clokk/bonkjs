/**
 * BonkSplash — the BonkJS crash-in logo animation, for a game's page load.
 *
 * "BONK" letters slam in from above with squash-stretch physics, each impact
 * producing debris particles, shockwaves, and a shake; "js" springs in from the
 * right, followed by a Sakurai-style impact burst. The logo settles, holds, then
 * fades out to reveal whatever's behind it (your menu).
 *
 * Self-contained: owns its particles + a flash overlay + an internal shake (no
 * dependency on any game system). Construct it onto a UI Container, build the
 * letters once the font is loaded, start it, and feed it real frame dt:
 *
 *   const splash = new BonkSplash(ui, { width, height, bgColor: 0x0a0a15 });
 *   await document.fonts.load("140px 'Black Ops One'");   // metrics need the font
 *   splash.buildLetters();
 *   splash.start(() => splash.destroy());
 *   // per render frame:
 *   if (splash.isActive()) splash.update(Time.unscaledDeltaTime);
 *
 * Font: the logo uses 'Black Ops One' (falls back to Impact). Load it in your
 * page — e.g. a Google Fonts <link> — and await document.fonts before buildLetters.
 *
 * Design: BonkJS logo entrance (squash-stretch, stagger) · Crash Bandicoot
 *         crash-in energy (speed, debris, shake) · Sakurai effects grammar
 *         (phased choreography, dark/bright contrast, end flash).
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface BonkSplashOptions {
  /** Canvas/logical width the splash lays out against. */
  width: number;
  /** Canvas/logical height the splash lays out against. */
  height: number;
  /** Solid backdrop color drawn behind the logo. Default 0x0a0a15. */
  bgColor?: number;
}

// Baked-in tuning. Brand amber colors are fixed — it's the BonkJS logo. Timings
// are in seconds (driven by real frame dt, not a fixed sim tick).
const SPLASH = {
  // Brand colors
  ACCENT: 0xf59e0b,
  ACCENT_GLOW: 0xfbbf24,
  ACCENT_DARK: 0x7a4f06,
  JS_COLOR: 0x71717a,
  FLASH_DARK: 0x1a0f00,

  // Letter styling
  LETTER_FONT_SIZE: 140,
  JS_FONT_SIZE: 52,
  LETTER_SPACING: 8,
  LOGO_Y: 0.45,

  // Phase timing (seconds)
  PHASE0_DURATION: 0.12,
  LETTER_STAGGER: 0.065,
  JS_DELAY: 0.08,
  JS_SLIDE_DURATION: 0.2,
  BURST_DELAY: 0.08,
  BURST_DURATION: 0.4,
  SETTLE_DURATION: 0.35,
  HOLD_DURATION: 0.4,
  FADE_DURATION: 0.45,

  // Letter crash-in
  LETTER_DROP_SPEED: 4500,
  LETTER_OVERSHOOT: 35,
  LETTER_BOUNCE_HEIGHT: 20,

  // Impact particles (per letter)
  IMPACT_DEBRIS_COUNT: 16,
  IMPACT_DEBRIS_SPEED_MIN: 4,
  IMPACT_DEBRIS_SPEED_MAX: 14,
  IMPACT_DEBRIS_LIFE_MIN: 0.15,
  IMPACT_DEBRIS_LIFE_MAX: 0.45,
  IMPACT_DEBRIS_SCALE_MIN: 0.2,
  IMPACT_DEBRIS_SCALE_MAX: 0.7,
  IMPACT_DEBRIS_GRAVITY: 0.2,
  IMPACT_FLASH_COUNT: 5,
  IMPACT_DARK_COUNT: 4,
  IMPACT_SHOCKWAVE_RADIUS: 80,
  IMPACT_SHOCKWAVE_SPEED: 350,
  IMPACT_SHOCKWAVE_LIFE: 0.22,

  // Shake per letter (no per-letter screen flash — only the final burst flashes)
  LETTER_SHAKE: 10,
  LETTER_SHAKE_DECAY: 0.72,

  // Speed lines (anticipation)
  SPEED_LINE_COUNT: 14,
  SPEED_LINE_LENGTH_MIN: 100,
  SPEED_LINE_LENGTH_MAX: 250,
  SPEED_LINE_WIDTH: 3,
  SPEED_LINE_SPEED: 1500,
  SPEED_LINE_LIFE: 0.15,

  // Big burst
  BURST_PARTICLE_COUNT: 120,
  BURST_SPEED_MIN: 5,
  BURST_SPEED_MAX: 24,
  BURST_LIFE_MIN: 0.18,
  BURST_LIFE_MAX: 0.6,
  BURST_SCALE_MIN: 0.25,
  BURST_SCALE_MAX: 1.5,
  BURST_GEM_COUNT: 60,
  BURST_STREAK_COUNT: 20,
  BURST_STREAK_SPEED_MIN: 25,
  BURST_STREAK_SPEED_MAX: 45,
  BURST_STREAK_LIFE: 0.2,
  BURST_CROWN_COUNT: 32,
  BURST_SHOCKWAVE_RADIUS: 200,
  BURST_SHOCKWAVE_SPEED: 500,
  BURST_SHOCKWAVE_LIFE: 0.35,
  BURST_SHAKE: 18,
  BURST_SHAKE_DECAY: 0.82,
  BURST_FLASH_ALPHA: 0.22,
} as const;

interface SplashParticle {
  gfx: Graphics;
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  scale: number;
  gravity: number;
  friction: number;
  rotSpeed: number;
}

interface SplashShockwave {
  gfx: Graphics;
  x: number; y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  color: number;
  width: number;
  life: number;
  maxLife: number;
}

interface SpeedLine {
  gfx: Graphics;
  x: number; y: number;
  targetX: number; targetY: number;
  speed: number;
  length: number;
  angle: number;
  life: number;
  maxLife: number;
}

interface LetterState {
  text: Text;
  targetY: number;
  currentY: number;
  phase: 'waiting' | 'dropping' | 'impact' | 'bouncing' | 'settling' | 'done';
  timer: number;
  scaleX: number;
  scaleY: number;
  impactFired: boolean;
}

type SplashPhase = 'idle' | 'anticipation' | 'letters' | 'js_slide' | 'burst' | 'settle' | 'hold' | 'fade' | 'done';

export class BonkSplash {
  private container: Container;
  private shakeGroup: Container;       // gets the shake offset (bg + flash stay static)
  private letterContainer: Container;
  private particleContainer: Container;
  private lineContainer: Container;
  private bgOverlay: Graphics;
  private flashOverlay: Graphics;

  private letters: LetterState[] = [];
  private jsText!: Text;
  private particles: SplashParticle[] = [];
  private shockwaves: SplashShockwave[] = [];
  private speedLines: SpeedLine[] = [];

  private phase: SplashPhase = 'idle';
  private phaseTimer = 0;
  private elapsed = 0;
  private letterIndex = 0;
  private letterStaggerTimer = 0;
  private burstFired = false;
  private endFlashFired = false;
  private destroyed = false;

  private shakeMag = 0;
  private shakeDecay = 0.8;
  private flashColor: number = SPLASH.ACCENT;
  private flashAlpha = 0;

  private onComplete: (() => void) | null = null;

  private width: number;
  private height: number;
  private bgColor: number;
  private cx: number;
  private logoY: number;
  private jsTargetX = 0;

  constructor(parent: Container, opts: BonkSplashOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.bgColor = opts.bgColor ?? 0x0a0a15;
    this.cx = this.width / 2;
    this.logoY = this.height * SPLASH.LOGO_Y;

    this.container = new Container();
    this.container.zIndex = 100000;   // above game UI
    parent.addChild(this.container);

    this.bgOverlay = new Graphics();
    this.bgOverlay.rect(0, 0, this.width, this.height);
    this.bgOverlay.fill({ color: this.bgColor, alpha: 1 });
    this.container.addChild(this.bgOverlay);

    this.shakeGroup = new Container();
    this.container.addChild(this.shakeGroup);

    this.particleContainer = new Container();
    this.shakeGroup.addChild(this.particleContainer);

    this.lineContainer = new Container();
    this.shakeGroup.addChild(this.lineContainer);

    this.letterContainer = new Container();
    this.shakeGroup.addChild(this.letterContainer);

    this.flashOverlay = new Graphics();
    this.container.addChild(this.flashOverlay);
  }

  /** Build the letter Text objects. Call AFTER the 'Black Ops One' font is loaded
   *  (await document.fonts.load) so the text metrics are correct. */
  buildLetters(): void {
    const letterStyle = new TextStyle({
      fontFamily: "'Black Ops One', 'Impact', sans-serif",
      fontSize: SPLASH.LETTER_FONT_SIZE,
      fontWeight: 'normal',
      fill: SPLASH.ACCENT,
      stroke: { color: SPLASH.ACCENT_DARK, width: 4 },
      dropShadow: { alpha: 0.6, angle: Math.PI / 2, blur: 12, color: SPLASH.ACCENT_GLOW, distance: 0 },
    });

    const bonk = 'BONK';
    const letterWidths: number[] = [];
    const tempTexts: Text[] = [];
    for (let i = 0; i < bonk.length; i++) {
      const t = new Text({ text: bonk[i], style: letterStyle });
      t.anchor.set(0.5);
      letterWidths.push(t.width);
      tempTexts.push(t);
    }

    const totalWidth = letterWidths.reduce((a, b) => a + b, 0) + SPLASH.LETTER_SPACING * (bonk.length - 1);
    const baseX = this.cx - totalWidth / 2;

    let xOffset = 0;
    for (let i = 0; i < bonk.length; i++) {
      const t = tempTexts[i];
      const x = baseX + xOffset + letterWidths[i] / 2;
      t.position.set(x, -200);
      t.alpha = 0;
      this.letterContainer.addChild(t);
      this.letters.push({
        text: t, targetY: this.logoY, currentY: -200,
        phase: 'waiting', timer: 0, scaleX: 1, scaleY: 1, impactFired: false,
      });
      xOffset += letterWidths[i] + SPLASH.LETTER_SPACING;
    }

    const jsStyle = new TextStyle({
      fontFamily: "'Black Ops One', 'Impact', sans-serif",
      fontSize: SPLASH.JS_FONT_SIZE,
      fontWeight: 'normal',
      fill: SPLASH.JS_COLOR,
      dropShadow: { alpha: 0.3, angle: Math.PI / 2, blur: 6, color: SPLASH.JS_COLOR, distance: 0 },
    });
    this.jsText = new Text({ text: 'js', style: jsStyle });
    this.jsText.anchor.set(0, 0.5);
    const lastWidth = letterWidths[letterWidths.length - 1];
    const lastRight = this.letters[this.letters.length - 1].text.x + lastWidth / 2 + 4;
    this.jsTargetX = lastRight;
    this.jsText.position.set(lastRight + 100, this.logoY + SPLASH.LETTER_FONT_SIZE * 0.15);
    this.jsText.alpha = 0;
    this.letterContainer.addChild(this.jsText);
  }

  /** Start the animation. onComplete fires once the fade finishes. */
  start(onComplete: () => void): void {
    this.onComplete = onComplete;
    this.phase = 'anticipation';
    this.phaseTimer = 0;
    this.elapsed = 0;
    this.letterIndex = 0;
    this.letterStaggerTimer = 0;
    this.spawnSpeedLines();
  }

  /** True while the animation is still playing (page-load gate). */
  isActive(): boolean {
    return this.phase !== 'idle' && this.phase !== 'done';
  }

  /** Per-frame update — variable dt in seconds (clamped against long frames). */
  update(dt: number): void {
    if (this.phase === 'idle' || this.phase === 'done') return;
    dt = Math.min(dt, 1 / 30);

    this.elapsed += dt;
    this.phaseTimer += dt;

    switch (this.phase) {
      case 'anticipation': this.updateAnticipation(); break;
      case 'letters': this.updateLetters(dt); break;
      case 'js_slide': this.updateJsSlide(); break;
      case 'burst': this.updateBurst(); break;
      case 'settle': this.updateSettle(); break;
      case 'hold': this.updateHold(); break;
      case 'fade': this.updateFade(); break;
    }

    // The fade phase fires onComplete, which may call destroy() synchronously
    // (tearing down the containers). Bail before the per-frame tail so it can't touch
    // destroyed objects (shakeGroup/flashOverlay) and throw — which would kill the
    // host's animation loop.
    if (this.destroyed) return;

    this.updateParticles(dt);
    this.updateShockwaves(dt);
    this.updateSpeedLines(dt);
    this.applyShakeAndFlash();
  }

  destroy(): void {
    this.destroyed = true;
    this.container.destroy({ children: true });
  }

  // ─── Internal shake + flash ───
  private shake(mag: number, decay: number): void {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeDecay = decay;
  }

  private triggerFlash(color: number, alpha: number): void {
    this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, alpha);
  }

  private applyShakeAndFlash(): void {
    if (this.shakeMag > 0.4) {
      this.shakeGroup.position.set(
        (Math.random() * 2 - 1) * this.shakeMag,
        (Math.random() * 2 - 1) * this.shakeMag,
      );
      this.shakeMag *= this.shakeDecay;
    } else {
      this.shakeMag = 0;
      this.shakeGroup.position.set(0, 0);
    }
    this.flashOverlay.clear();
    if (this.flashAlpha > 0.005) {
      this.flashOverlay.rect(0, 0, this.width, this.height);
      this.flashOverlay.fill({ color: this.flashColor, alpha: this.flashAlpha });
      this.flashAlpha *= 0.82;
    } else {
      this.flashAlpha = 0;
    }
  }

  // ─── Particles ───
  private spawnParticle(
    x: number, y: number, vx: number, vy: number,
    life: number, scale: number, color: number,
    gravity = 0, friction = 1, add = true,
  ): void {
    if (this.destroyed) return;
    const gfx = new Graphics();
    const half = 4;
    gfx.rect(-half, -half, half * 2, half * 2);
    gfx.fill({ color, alpha: 1 });
    if (add) gfx.blendMode = 'add';
    gfx.position.set(x, y);
    gfx.scale.set(scale);
    this.particleContainer.addChild(gfx);
    this.particles.push({ gfx, x, y, vx, vy, life, maxLife: life, scale, gravity, friction, rotSpeed: (Math.random() - 0.5) * 8 });
  }

  private spawnSoftParticle(
    x: number, y: number, vx: number, vy: number,
    life: number, scale: number, color: number, add = true,
  ): void {
    if (this.destroyed) return;
    const gfx = new Graphics();
    gfx.circle(0, 0, 6);
    gfx.fill({ color, alpha: 0.7 });
    if (add) gfx.blendMode = 'add';
    gfx.position.set(x, y);
    gfx.scale.set(scale);
    this.particleContainer.addChild(gfx);
    this.particles.push({ gfx, x, y, vx, vy, life, maxLife: life, scale, gravity: 0, friction: 0.97, rotSpeed: 0 });
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.gfx.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.x += p.vx;
      p.y += p.vy;
      p.gfx.position.set(p.x, p.y);
      p.gfx.rotation += p.rotSpeed * dt;
      const t = p.life / p.maxLife;
      p.gfx.alpha = t;
      p.gfx.scale.set(p.scale * (0.3 + 0.7 * t));
    }
  }

  private spawnShockwave(x: number, y: number, maxRadius: number, speed: number, color: number, width: number, life: number): void {
    if (this.destroyed) return;
    const gfx = new Graphics();
    gfx.visible = false;
    this.particleContainer.addChild(gfx);
    this.shockwaves.push({ gfx, x, y, radius: 0, maxRadius, speed, color, width, life, maxLife: life });
  }

  private updateShockwaves(dt: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        sw.gfx.destroy();
        this.shockwaves.splice(i, 1);
        continue;
      }
      sw.radius += sw.speed * dt;
      const t = sw.life / sw.maxLife;
      sw.gfx.visible = true;
      sw.gfx.clear();
      sw.gfx.circle(sw.x, sw.y, Math.max(1, sw.radius));
      sw.gfx.stroke({ color: sw.color, width: sw.width * t, alpha: t * 0.8 });
    }
  }

  // ─── Phase: anticipation (speed lines) ───
  private spawnSpeedLines(): void {
    for (let i = 0; i < SPLASH.SPEED_LINE_COUNT; i++) {
      const gfx = new Graphics();
      this.lineContainer.addChild(gfx);
      const angle = (i / SPLASH.SPEED_LINE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 350 + Math.random() * 250;
      const x = this.cx + Math.cos(angle) * dist;
      const y = this.logoY + Math.sin(angle) * dist;
      const length = SPLASH.SPEED_LINE_LENGTH_MIN + Math.random() * (SPLASH.SPEED_LINE_LENGTH_MAX - SPLASH.SPEED_LINE_LENGTH_MIN);
      this.speedLines.push({
        gfx, x, y, targetX: this.cx, targetY: this.logoY,
        speed: SPLASH.SPEED_LINE_SPEED * (0.8 + Math.random() * 0.4),
        length, angle,
        life: SPLASH.SPEED_LINE_LIFE + Math.random() * 0.1,
        maxLife: SPLASH.SPEED_LINE_LIFE + Math.random() * 0.1,
      });
    }
  }

  private updateSpeedLines(dt: number): void {
    for (let i = this.speedLines.length - 1; i >= 0; i--) {
      const line = this.speedLines[i];
      line.life -= dt;
      if (line.life <= 0) {
        line.gfx.destroy();
        this.speedLines.splice(i, 1);
        continue;
      }
      const dx = line.targetX - line.x;
      const dy = line.targetY - line.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        line.x += (dx / dist) * line.speed * dt;
        line.y += (dy / dist) * line.speed * dt;
      }
      const alpha = Math.min(1, line.life / line.maxLife) * 0.7;
      const tailAngle = line.angle + Math.PI;
      const endX = line.x + Math.cos(tailAngle) * line.length;
      const endY = line.y + Math.sin(tailAngle) * line.length;
      line.gfx.clear();
      line.gfx.moveTo(line.x + 1, line.y + 1);
      line.gfx.lineTo(endX + 1, endY + 1);
      line.gfx.stroke({ color: SPLASH.FLASH_DARK, width: SPLASH.SPEED_LINE_WIDTH + 2, alpha: alpha * 0.4 });
      line.gfx.moveTo(line.x, line.y);
      line.gfx.lineTo(endX, endY);
      line.gfx.stroke({ color: SPLASH.ACCENT, width: SPLASH.SPEED_LINE_WIDTH, alpha });
    }
  }

  private updateAnticipation(): void {
    if (this.phaseTimer >= SPLASH.PHASE0_DURATION) {
      this.phase = 'letters';
      this.phaseTimer = 0;
      this.dropNextLetter();
    }
  }

  // ─── Phase: letters ───
  private dropNextLetter(): void {
    if (this.letterIndex >= this.letters.length) return;
    const letter = this.letters[this.letterIndex];
    letter.phase = 'dropping';
    letter.currentY = -200;
    letter.text.alpha = 1;
    this.letterIndex++;
    this.letterStaggerTimer = 0;
  }

  private updateLetters(dt: number): void {
    if (this.letterIndex < this.letters.length) {
      this.letterStaggerTimer += dt;
      if (this.letterStaggerTimer >= SPLASH.LETTER_STAGGER) this.dropNextLetter();
    }

    for (const letter of this.letters) {
      if (letter.phase === 'waiting' || letter.phase === 'done') continue;
      switch (letter.phase) {
        case 'dropping': {
          letter.currentY += SPLASH.LETTER_DROP_SPEED * dt;
          const approachT = Math.min(1, Math.max(0, (letter.currentY + 200) / (letter.targetY + 200 + SPLASH.LETTER_OVERSHOOT)));
          letter.scaleX = 1 - approachT * 0.25;
          letter.scaleY = 1 + approachT * 0.6;
          if (letter.currentY >= letter.targetY + SPLASH.LETTER_OVERSHOOT) {
            letter.currentY = letter.targetY + SPLASH.LETTER_OVERSHOOT;
            letter.phase = 'impact';
            letter.timer = 0;
            this.fireLetterImpact(letter);
          }
          break;
        }
        case 'impact': {
          letter.timer += dt;
          const iT = Math.min(1, letter.timer / 0.05);
          letter.scaleX = 1 + 0.4 * (1 - iT);
          letter.scaleY = 0.65 + 0.35 * iT;
          if (letter.timer >= 0.05) { letter.phase = 'bouncing'; letter.timer = 0; }
          break;
        }
        case 'bouncing': {
          letter.timer += dt;
          const bT = Math.min(1, letter.timer / 0.1);
          const ease = 1 - (1 - bT) * (1 - bT);
          letter.currentY = (letter.targetY + SPLASH.LETTER_OVERSHOOT) - SPLASH.LETTER_BOUNCE_HEIGHT * Math.sin(ease * Math.PI);
          letter.scaleX = 0.88 + 0.12 * bT;
          letter.scaleY = 1.12 - 0.12 * bT;
          if (bT >= 1) { letter.phase = 'settling'; letter.timer = 0; }
          break;
        }
        case 'settling': {
          letter.timer += dt;
          const sT = Math.min(1, letter.timer / 0.12);
          const spring = 1 + Math.sin(sT * Math.PI * 2.5) * 0.04 * (1 - sT);
          letter.currentY = letter.targetY;
          letter.scaleX = spring;
          letter.scaleY = 2 - spring;
          if (sT >= 1) { letter.phase = 'done'; letter.scaleX = 1; letter.scaleY = 1; letter.currentY = letter.targetY; }
          break;
        }
      }
      letter.text.position.y = letter.currentY;
      letter.text.scale.set(letter.scaleX, letter.scaleY);
    }

    if (this.letters.every(l => l.phase === 'done')) {
      this.phase = 'js_slide';
      this.phaseTimer = 0;
    }
  }

  private fireLetterImpact(letter: LetterState): void {
    if (letter.impactFired) return;
    letter.impactFired = true;
    const x = letter.text.x;
    const y = letter.targetY;

    // Per-letter impact: shake + debris + shockwaves only. (No full-screen flash —
    // it read as distracting background strobing across the rapid "BONK" slams.
    // The one climactic flash on the final burst is kept.)
    this.shake(SPLASH.LETTER_SHAKE, SPLASH.LETTER_SHAKE_DECAY);

    for (let i = 0; i < SPLASH.IMPACT_DEBRIS_COUNT; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
      const speed = SPLASH.IMPACT_DEBRIS_SPEED_MIN + Math.random() * (SPLASH.IMPACT_DEBRIS_SPEED_MAX - SPLASH.IMPACT_DEBRIS_SPEED_MIN);
      const scale = SPLASH.IMPACT_DEBRIS_SCALE_MIN + Math.random() * (SPLASH.IMPACT_DEBRIS_SCALE_MAX - SPLASH.IMPACT_DEBRIS_SCALE_MIN);
      const life = SPLASH.IMPACT_DEBRIS_LIFE_MIN + Math.random() * (SPLASH.IMPACT_DEBRIS_LIFE_MAX - SPLASH.IMPACT_DEBRIS_LIFE_MIN);
      const color = Math.random() > 0.3 ? SPLASH.ACCENT : SPLASH.ACCENT_GLOW;
      this.spawnParticle(x + (Math.random() - 0.5) * 25, y + (Math.random() - 0.5) * 10, Math.cos(angle) * speed, Math.sin(angle) * speed, life, scale, color, SPLASH.IMPACT_DEBRIS_GRAVITY, 0.96, true);
    }
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = 3 + Math.random() * 6;
      this.spawnParticle(x + (Math.random() - 0.5) * 15, y + 10, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.15 + Math.random() * 0.15, 0.2 + Math.random() * 0.25, SPLASH.ACCENT_DARK, 0.3, 0.95, false);
    }
    for (let i = 0; i < SPLASH.IMPACT_DARK_COUNT; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 2 + Math.random() * 4;
      this.spawnSoftParticle(x + (Math.random() - 0.5) * 12, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.15 + Math.random() * 0.1, 2.5 + Math.random() * 2.5, SPLASH.FLASH_DARK, false);
    }
    for (let i = 0; i < SPLASH.IMPACT_FLASH_COUNT; i++) {
      this.spawnSoftParticle(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 1.0, 0.06 + Math.random() * 0.06, 3.5 + Math.random() * 3, 0xffffff, true);
    }
    for (let i = 0; i < 3; i++) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const speed = 8 + Math.random() * 12;
      this.spawnParticle(x + dir * (Math.random() * 8), y + 5, dir * speed, (Math.random() - 0.5) * 1.5, 0.12 + Math.random() * 0.08, 0.15, SPLASH.ACCENT_GLOW, 0, 0.98, true);
    }
    this.spawnShockwave(x, y, SPLASH.IMPACT_SHOCKWAVE_RADIUS, SPLASH.IMPACT_SHOCKWAVE_SPEED, SPLASH.ACCENT, 4, SPLASH.IMPACT_SHOCKWAVE_LIFE);
    this.spawnShockwave(x, y, SPLASH.IMPACT_SHOCKWAVE_RADIUS * 0.4, SPLASH.IMPACT_SHOCKWAVE_SPEED * 1.8, 0xffffff, 2, 0.08);
    this.spawnShockwave(x, y, SPLASH.IMPACT_SHOCKWAVE_RADIUS * 0.8, SPLASH.IMPACT_SHOCKWAVE_SPEED * 0.6, SPLASH.FLASH_DARK, 6, SPLASH.IMPACT_SHOCKWAVE_LIFE * 0.7);
  }

  // ─── Phase: js slide ───
  private updateJsSlide(): void {
    if (this.phaseTimer < SPLASH.JS_DELAY) return;
    const slideT = Math.min(1, (this.phaseTimer - SPLASH.JS_DELAY) / SPLASH.JS_SLIDE_DURATION);
    const ease = springEase(slideT);
    this.jsText.alpha = Math.min(1, slideT * 4);
    this.jsText.position.x = this.jsTargetX + 80 * (1 - ease);
    if (slideT >= 1) { this.phase = 'burst'; this.phaseTimer = 0; }
  }

  // ─── Phase: burst ───
  private updateBurst(): void {
    if (this.phaseTimer >= SPLASH.BURST_DELAY && !this.burstFired) {
      this.burstFired = true;
      this.fireBurst();
    }
    if (this.phaseTimer >= SPLASH.BURST_DELAY + SPLASH.BURST_DURATION) {
      this.phase = 'settle';
      this.phaseTimer = 0;
    }
  }

  private fireBurst(): void {
    const x = this.cx;
    const y = this.logoY;
    this.shake(SPLASH.BURST_SHAKE, SPLASH.BURST_SHAKE_DECAY);

    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => this.spawnBurstWave(x, y, wave), wave * 30);
    }
    for (let i = 0; i < SPLASH.BURST_STREAK_COUNT; i++) {
      const angle = (i / SPLASH.BURST_STREAK_COUNT) * Math.PI * 2;
      const speed = SPLASH.BURST_STREAK_SPEED_MIN + Math.random() * (SPLASH.BURST_STREAK_SPEED_MAX - SPLASH.BURST_STREAK_SPEED_MIN);
      this.spawnParticle(x + Math.cos(angle) * 8, y + Math.sin(angle) * 8, Math.cos(angle) * speed, Math.sin(angle) * speed, SPLASH.BURST_STREAK_LIFE, 0.2, 0xffffff, 0, 1, true);
    }
    for (let i = 0; i < SPLASH.BURST_CROWN_COUNT; i++) {
      const angle = (i / SPLASH.BURST_CROWN_COUNT) * Math.PI * 2;
      const speed = 14 + Math.random() * 6;
      this.spawnParticle(x + Math.cos(angle) * 12, y + Math.sin(angle) * 12, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.25 + Math.random() * 0.15, 0.4 + Math.random() * 0.3, SPLASH.ACCENT_GLOW, 0.08, 0.97, true);
    }
    for (let i = 0; i < SPLASH.BURST_GEM_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 12;
      const tang = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 4);
      const color = Math.random() > 0.5 ? SPLASH.ACCENT : SPLASH.ACCENT_GLOW;
      this.spawnParticle(
        x + Math.cos(angle) * 6, y + Math.sin(angle) * 6,
        Math.cos(angle) * speed + Math.cos(angle + Math.PI / 2) * tang,
        Math.sin(angle) * speed + Math.sin(angle + Math.PI / 2) * tang,
        0.3 + Math.random() * 0.4, 0.25 + Math.random() * 0.35, color, 0.2 + Math.random() * 0.15, 0.98, true,
      );
    }
    for (let i = 0; i < 5; i++) {
      this.spawnSoftParticle(x + (Math.random() - 0.5) * 15, y + (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 0.12 + Math.random() * 0.08, 3 + Math.random() * 2, SPLASH.FLASH_DARK, false);
    }
    this.spawnShockwave(x, y, SPLASH.BURST_SHOCKWAVE_RADIUS, SPLASH.BURST_SHOCKWAVE_SPEED, SPLASH.ACCENT, 5, SPLASH.BURST_SHOCKWAVE_LIFE);
    this.spawnShockwave(x, y, SPLASH.BURST_SHOCKWAVE_RADIUS * 0.7, SPLASH.BURST_SHOCKWAVE_SPEED * 0.8, SPLASH.ACCENT_DARK, 8, SPLASH.BURST_SHOCKWAVE_LIFE * 0.8);
    this.spawnShockwave(x, y, SPLASH.BURST_SHOCKWAVE_RADIUS * 0.4, SPLASH.BURST_SHOCKWAVE_SPEED * 1.5, 0xffffff, 2, 0.1);
  }

  private spawnBurstWave(x: number, y: number, wave: number): void {
    const count = Math.floor(SPLASH.BURST_PARTICLE_COUNT / 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = SPLASH.BURST_SPEED_MIN + Math.random() * (SPLASH.BURST_SPEED_MAX - SPLASH.BURST_SPEED_MIN);
      const scale = SPLASH.BURST_SCALE_MIN + Math.random() * (SPLASH.BURST_SCALE_MAX - SPLASH.BURST_SCALE_MIN);
      const life = SPLASH.BURST_LIFE_MIN + Math.random() * (SPLASH.BURST_LIFE_MAX - SPLASH.BURST_LIFE_MIN);
      const offset = 5 + Math.random() * 12;
      const color = wave === 0 ? 0xffffff : Math.random() > 0.15 ? SPLASH.ACCENT : SPLASH.ACCENT_GLOW;
      const add = Math.random() > 0.15;
      this.spawnParticle(x + Math.cos(angle) * offset, y + Math.sin(angle) * offset, Math.cos(angle) * speed, Math.sin(angle) * speed, life, scale, color, 0.05, 0.96, add);
    }
  }

  // ─── Phase: settle + end flash ───
  private updateSettle(): void {
    for (const letter of this.letters) {
      letter.text.position.y = letter.targetY + Math.sin(this.elapsed * 2.5 + letter.text.x * 0.008) * 2;
    }
    if (this.phaseTimer >= SPLASH.SETTLE_DURATION) { this.phase = 'hold'; this.phaseTimer = 0; }
  }

  // ─── Phase: hold ───
  private updateHold(): void {
    for (const letter of this.letters) {
      letter.text.position.y = letter.targetY + Math.sin(this.elapsed * 2.5 + letter.text.x * 0.008) * 2;
    }
    if (this.phaseTimer >= SPLASH.HOLD_DURATION) { this.phase = 'fade'; this.phaseTimer = 0; }
  }

  // ─── Phase: fade ───
  private updateFade(): void {
    const fadeT = Math.min(1, this.phaseTimer / SPLASH.FADE_DURATION);
    this.container.alpha = 1 - fadeT;
    if (fadeT >= 1) {
      this.phase = 'done';
      this.container.visible = false;
      this.onComplete?.();
    }
  }
}

// Spring ease with overshoot — approximates cubic-bezier(0.34, 1.56, 0.64, 1).
function springEase(t: number): number {
  const c4 = (2 * Math.PI) / 4.5;
  if (t === 0 || t === 1) return t;
  return 1 - Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) * 0.3 + (1 - Math.pow(1 - t, 3));
}
