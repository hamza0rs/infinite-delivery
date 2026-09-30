// SoundEffectsManager — short, functional, non-musical sounds only.
// There is intentionally no MusicManager / BackgroundMusic / ProceduralMusic anywhere.
// Every sound here is a synthesized oscillator/noise burst, generated locally at
// runtime with the Web Audio API, so nothing needs to be downloaded or bundled.

export class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stopEngine();
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  private ensureCtx(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, freqEnd?: number) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  private noiseBurst(duration: number, volume = 0.2, filterFreq = 1200) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + duration);
  }

  uiClick() {
    this.tone(700, 0.06, 'square', 0.08);
  }

  accelerate() {
    this.tone(180, 0.12, 'sawtooth', 0.05, 260);
  }

  brake() {
    this.noiseBurst(0.15, 0.1, 500);
  }

  boost() {
    this.tone(220, 0.35, 'sawtooth', 0.12, 880);
  }

  collision() {
    this.noiseBurst(0.25, 0.3, 300);
    this.tone(90, 0.2, 'square', 0.15);
  }

  nearMiss() {
    this.tone(1000, 0.08, 'sine', 0.1, 1400);
  }

  pizzaPickup() {
    this.tone(500, 0.1, 'sine', 0.12, 700);
  }

  deliverySuccess() {
    this.tone(600, 0.1, 'sine', 0.14, 900);
    setTimeout(() => this.tone(900, 0.14, 'sine', 0.14, 1200), 90);
  }

  deliveryFailed() {
    this.tone(300, 0.3, 'sawtooth', 0.12, 120);
  }

  coin() {
    this.tone(1200, 0.07, 'square', 0.08, 1600);
  }

  policeSiren() {
    this.tone(500, 0.4, 'sine', 0.1, 900);
    setTimeout(() => this.tone(900, 0.4, 'sine', 0.1, 500), 400);
  }

  warningBeep() {
    this.tone(800, 0.08, 'square', 0.09);
    setTimeout(() => this.tone(800, 0.08, 'square', 0.09), 140);
  }

  rainAmbience() {
    this.noiseBurst(0.4, 0.03, 2500);
  }

  achievement() {
    this.tone(700, 0.1, 'sine', 0.12, 1000);
    setTimeout(() => this.tone(1000, 0.16, 'sine', 0.12, 1300), 100);
  }

  startEngineLoop() {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx || this.engineOsc) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 80;
    gain.gain.value = 0.02;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    this.engineOsc = osc;
    this.engineGain = gain;
  }

  /** speedRatio: 0..1, maps to engine pitch (still not "music" - a continuous mechanical hum). */
  updateEngine(speedRatio: number) {
    if (!this.engineOsc || !this.ctx) return;
    const freq = 60 + speedRatio * 140;
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.08);
    if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(this.enabled ? 0.015 + speedRatio * 0.02 : 0, this.ctx.currentTime, 0.1);
    }
  }

  stopEngine() {
    try {
      this.engineOsc?.stop();
    } catch {
      /* already stopped */
    }
    this.engineOsc = null;
    this.engineGain = null;
  }
}

export const soundEffects = new SoundEffectsManager();
