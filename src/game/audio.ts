/* Satisfying glossy procedural SFX + adaptive chiptune-ish music bed */

const PENTATONIC = [
  523.25, 587.33, 659.25, 783.99, 880.0,
  1046.5, 1174.66, 1318.51, 1567.98, 1760.0,
];

export type Track = 'menu' | 'battle' | 'boss' | 'shop' | 'off';

interface TrackCfg {
  bpm: number;
  root: number;
  drums: 0 | 1 | 2;
  arpEvery: number;
  prog: number[][];
  scale: number[];
  padVol: number;
  bassVol: number;
  arpVol: number;
  drumVol: number;
  wave: OscillatorType;
}

const TRACKS: Record<Exclude<Track, 'off'>, TrackCfg> = {
  menu: {
    bpm: 84, root: 0, drums: 0, arpEvery: 4,
    prog: [[0, 7, 12, 16], [9, 12, 16, 21], [5, 9, 12, 17], [7, 11, 14, 19]],
    scale: [0, 2, 4, 7, 9, 12, 14, 16],
    padVol: 0.05, bassVol: 0.07, arpVol: 0.055, drumVol: 0, wave: 'triangle',
  },
  battle: {
    bpm: 106, root: 0, drums: 1, arpEvery: 2,
    prog: [[0, 4, 7, 12], [7, 11, 14, 19], [9, 12, 16, 21], [5, 9, 12, 17]],
    scale: [0, 2, 4, 5, 7, 9, 11, 12],
    padVol: 0.035, bassVol: 0.11, arpVol: 0.05, drumVol: 0.12, wave: 'square',
  },
  boss: {
    bpm: 132, root: -3, drums: 2, arpEvery: 1,
    prog: [[0, 3, 7, 12], [8, 12, 15, 20], [5, 8, 12, 17], [7, 10, 14, 19]],
    scale: [0, 2, 3, 5, 7, 8, 10, 12],
    padVol: 0.04, bassVol: 0.13, arpVol: 0.05, drumVol: 0.16, wave: 'sawtooth',
  },
  shop: {
    bpm: 92, root: 3, drums: 0, arpEvery: 3,
    prog: [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 18], [9, 12, 16, 21]],
    scale: [0, 2, 4, 7, 9, 11, 14],
    padVol: 0.045, bassVol: 0.07, arpVol: 0.06, drumVol: 0, wave: 'sine',
  },
};

class AudioMan {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  musicBus: GainNode | null = null;
  wet: GainNode | null = null;
  muted = false;
  musicEnabled = true;
  lastPlay: Record<string, number> = {};
  gemStreak = 0;
  lastGemAt = 0;
  sprinkleStep = 0;

  private track: Track = 'off';
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private transpose = 0;

  /** Shift the whole soundtrack into a world's key */
  setTranspose(semi: number) {
    this.transpose = semi;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();

      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.62;

      const warmth = this.ctx.createBiquadFilter();
      warmth.type = 'lowpass';
      warmth.frequency.value = 9800;

      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 18;
      comp.ratio.value = 5;
      comp.attack.value = 0.004;
      comp.release.value = 0.14;

      const delay = this.ctx.createDelay(0.4);
      delay.delayTime.value = 0.095;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.24;
      const dFilt = this.ctx.createBiquadFilter();
      dFilt.type = 'lowpass';
      dFilt.frequency.value = 3600;
      this.wet = this.ctx.createGain();
      this.wet.gain.value = 0.26;

      this.wet.connect(delay);
      delay.connect(dFilt);
      dFilt.connect(fb);
      fb.connect(delay);
      dFilt.connect(warmth);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicEnabled ? 0.9 : 0;
      this.musicBus.connect(warmth);

      this.master.connect(warmth);
      warmth.connect(comp);
      comp.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.62, this.ctx.currentTime, 0.02);
  }

  setMusicEnabled(on: boolean) {
    this.musicEnabled = on;
    if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.08);
  }

  /* ---------------- music ---------------- */
  setTrack(t: Track) {
    if (t === this.track) return;
    this.track = t;
    if (t === 'off') {
      if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
      return;
    }
    if (!this.ensure()) return;
    this.step = 0;
    this.nextTime = (this.ctx!.currentTime) + 0.08;
    if (this.timer === null) {
      this.timer = window.setInterval(() => this.schedule(), 60);
    }
  }

  private hz(semi: number) {
    return 261.63 * Math.pow(2, semi / 12);
  }

  private schedule() {
    if (!this.ctx || !this.musicBus || this.track === 'off' || this.ctx.state !== 'running') return;
    const cfg = TRACKS[this.track];
    const spb = 60 / cfg.bpm / 2; // eighth notes
    let guard = 0;
    while (this.nextTime < this.ctx.currentTime + 0.28 && guard++ < 64) {
      if (this.musicEnabled) this.playStep(this.step, this.nextTime, cfg);
      this.nextTime += spb;
      this.step = (this.step + 1) % 32;
    }
  }

  private mtone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, glide?: number, shimmer = false) {
    if (!this.ctx || !this.musicBus) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.musicBus);
    if (shimmer && this.wet) g.connect(this.wet);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private mnoise(t: number, dur: number, vol: number, freq: number, type: BiquadFilterType = 'bandpass', q = 1) {
    if (!this.ctx || !this.musicBus) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(this.musicBus);
    src.start(t);
  }

  private playStep(step: number, t: number, cfg: TrackCfg) {
    const bar = Math.floor(step / 8);
    const s = step % 8;
    const chord = cfg.prog[bar % cfg.prog.length];
    const root = cfg.root + this.transpose;

    // warm pad on the downbeat
    if (s === 0) {
      chord.forEach((n, i) => {
        this.mtone(this.hz(n + root) * 0.5, t, cfg.bpm > 120 ? 1.0 : 1.9, 'triangle', cfg.padVol * (i === 0 ? 1 : 0.65));
      });
    }

    // bouncy bass
    if (s === 0 || s === 4 || (s === 6 && cfg.drums > 0)) {
      const oct = s === 6 ? -12 : -24;
      this.mtone(this.hz(chord[0] + root + 12 + oct), t, 0.26, 'sine', cfg.bassVol, this.hz(chord[0] + root + oct) * 0.98);
    }

    // sparkly arp
    if (step % cfg.arpEvery === 0) {
      const idx = (step / cfg.arpEvery) % chord.length;
      const n = chord[Math.floor(idx)] + 12 + (step % 3 === 0 ? 12 : 0);
      this.mtone(this.hz(n + root), t, 0.22, cfg.wave === 'sawtooth' ? 'triangle' : cfg.wave, cfg.arpVol, undefined, true);
    }

    // wandering pentatonic melody on busy tracks
    if (cfg.drums > 0 && (step === 3 || step === 11 || step === 19 || step === 26)) {
      const n = cfg.scale[(step * 5 + bar * 3) % cfg.scale.length] + 12 + root;
      this.mtone(this.hz(n), t, 0.34, 'sine', cfg.arpVol * 1.5, this.hz(n) * 1.01, true);
    }

    // soft drums
    if (cfg.drums > 0) {
      if (s === 0 || s === 4) this.mtone(150, t, 0.16, 'sine', cfg.drumVol, 46);
      if (cfg.drums === 2 && (s === 2 || s === 6)) this.mnoise(t, 0.11, cfg.drumVol * 0.85, 1800, 'bandpass', 0.9);
      this.mnoise(t + (s % 2) * 0.001, 0.035, cfg.drumVol * (s % 2 ? 0.22 : 0.4), s % 2 ? 8200 : 5200, 'highpass', 0.8);
    }
  }

  /* ---------------- sfx ---------------- */
  private throttle(key: string, ms: number) {
    const now = performance.now();
    if (this.lastPlay[key] && now - this.lastPlay[key] < ms) return true;
    this.lastPlay[key] = now;
    return false;
  }

  private tone(opts: {
    freq: number; freqEnd?: number; dur?: number; type?: OscillatorType;
    vol?: number; delay?: number; attack?: number; curve?: 'exp' | 'lin'; shimmer?: boolean;
    vibRate?: number; vibDepth?: number;
  }) {
    if (this.muted || !this.ensure() || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    const { freq, freqEnd, dur = 0.14, type = 'sine', vol = 0.35, delay = 0, attack = 0.007, curve = 'exp', shimmer = false, vibRate = 0, vibDepth = 0 } = opts;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(25, freq), t0);
    if (freqEnd !== undefined) {
      if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(25, freqEnd), t0 + dur);
      else osc.frequency.linearRampToValueAtTime(Math.max(25, freqEnd), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + Math.min(attack, dur * 0.4));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    if (shimmer && this.wet) g.connect(this.wet);
    if (vibRate > 0 && vibDepth > 0) {
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.frequency.value = vibRate;
      lg.gain.value = vibDepth;
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.05);
    }
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(opts: { dur?: number; vol?: number; delay?: number; freq?: number; freqEnd?: number; q?: number; filterType?: BiquadFilterType }) {
    if (this.muted || !this.ensure() || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    const { dur = 0.12, vol = 0.25, delay = 0, freq = 1800, freqEnd, q = 1.2, filterType = 'bandpass' } = opts;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.4);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.setValueAtTime(freq, t0);
    if (freqEnd) filt.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + dur);
    filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(t0);
  }

  shoot(gunId = 'bubble') {
    if (this.throttle('shoot', gunId === 'sprinkle' ? 42 : 55)) return;
    const j = 0.94 + Math.random() * 0.12;
    switch (gunId) {
      case 'gumdrop':
        this.tone({ freq: 185 * j, freqEnd: 58, dur: 0.16, type: 'sine', vol: 0.36 });
        this.tone({ freq: 340 * j, freqEnd: 740 * j, dur: 0.075, type: 'sine', vol: 0.18, delay: 0.01 });
        this.tone({ freq: 440 * j, freqEnd: 920 * j, dur: 0.065, type: 'triangle', vol: 0.14, delay: 0.025 });
        this.noise({ dur: 0.09, vol: 0.16, freq: 1600, freqEnd: 4200, q: 1.5 });
        break;
      case 'sprinkle': {
        const n = PENTATONIC[this.sprinkleStep % 6];
        this.sprinkleStep++;
        this.tone({ freq: n * 0.95, freqEnd: n * 1.45, dur: 0.065, type: 'sine', vol: 0.18, shimmer: true });
        this.tone({ freq: n * 2, dur: 0.045, type: 'triangle', vol: 0.08 });
        break;
      }
      case 'rocket':
        this.tone({ freq: 160, freqEnd: 540, dur: 0.14, type: 'sine', vol: 0.32 });
        this.tone({ freq: 110, freqEnd: 52, dur: 0.22, type: 'triangle', vol: 0.28 });
        this.noise({ dur: 0.24, vol: 0.18, freq: 700, freqEnd: 2600, q: 1.8 });
        break;
      case 'sniper':
        this.tone({ freq: 1200 * j, freqEnd: 380, dur: 0.18, type: 'triangle', vol: 0.24, shimmer: true });
        this.tone({ freq: 1960, freqEnd: 2600, dur: 0.14, type: 'sine', vol: 0.16, shimmer: true });
        this.tone({ freq: 160, freqEnd: 55, dur: 0.15, type: 'sine', vol: 0.3 });
        break;
      case 'glue':
        this.tone({ freq: 380 * j, freqEnd: 130, dur: 0.13, type: 'sine', vol: 0.26 });
        this.tone({ freq: 620 * j, freqEnd: 210, dur: 0.09, type: 'triangle', vol: 0.14, delay: 0.02 });
        this.noise({ dur: 0.12, vol: 0.18, freq: 1400, freqEnd: 420, q: 3.2 });
        break;
      default:
        this.tone({ freq: 290 * j, freqEnd: 690 * j, dur: 0.085, type: 'sine', vol: 0.24 });
        this.tone({ freq: 580 * j, freqEnd: 1180 * j, dur: 0.06, type: 'triangle', vol: 0.11, delay: 0.01 });
        this.noise({ dur: 0.04, vol: 0.08, freq: 3200, q: 2.5 });
        break;
    }
  }

  hit(crit = false) {
    if (this.throttle('hit', 48)) return;
    const j = 0.94 + Math.random() * 0.14;
    this.tone({ freq: 240 * j, freqEnd: 140, dur: 0.065, type: 'sine', vol: 0.16 });
    this.tone({ freq: 720 * j, freqEnd: 480, dur: 0.045, type: 'triangle', vol: 0.1 });
    if (crit) {
      this.tone({ freq: 1318.5, dur: 0.16, type: 'sine', vol: 0.2, shimmer: true });
      this.tone({ freq: 1975.5, dur: 0.18, type: 'triangle', vol: 0.12, delay: 0.025, shimmer: true });
    }
  }

  splat() {
    if (this.throttle('splat', 65)) return;
    const j = 0.9 + Math.random() * 0.2;
    this.tone({ freq: 260 * j, freqEnd: 95, dur: 0.11, type: 'sine', vol: 0.18 });
    this.noise({ dur: 0.09, vol: 0.12, freq: 950 * j, freqEnd: 350, q: 2.2 });
  }

  pop(combo = 0) {
    if (this.throttle('pop', 28)) return;
    const note = PENTATONIC[Math.min(combo, PENTATONIC.length - 1)];
    const j = 0.97 + Math.random() * 0.06;
    this.tone({ freq: 230 * j, freqEnd: 980 * j, dur: 0.065, type: 'sine', vol: 0.34, attack: 0.003 });
    this.noise({ dur: 0.05, vol: 0.14, freq: 2800, freqEnd: 5200, q: 1.8 });
    this.tone({ freq: note, dur: 0.18, type: 'sine', vol: 0.24, delay: 0.018, shimmer: true });
    this.tone({ freq: note * 1.5, dur: 0.14, type: 'triangle', vol: 0.11, delay: 0.032, shimmer: true });
    if (combo >= 4) this.tone({ freq: note * 2, dur: 0.2, type: 'sine', vol: 0.12, delay: 0.05, shimmer: true });
  }

  balloonInflate(voice = 1) {
    if (this.throttle('inflate', 45)) return;
    this.tone({ freq: 380 * voice, freqEnd: 820 * voice, dur: .14, vol: .09, vibRate: 30, vibDepth: 16 });
    this.noise({ dur: .09, vol: .04, freq: 1600, freqEnd: 2400, q: 1.5 });
  }

  balloonPop(voice = 1, combo = 0) {
    if (this.throttle('balloon', 24)) return;
    // A short rubber snap, a soft air puff, then the combo's pitched sparkle.
    this.noise({ dur: .045, vol: .31, freq: 3500, freqEnd: 1200, q: .7 });
    this.tone({ freq: 230 * voice, freqEnd: 48, dur: .095, vol: .34, attack: .002 });
    this.noise({ dur: .16, vol: .11, freq: 1400, freqEnd: 260, q: 1.1 });
    const note = PENTATONIC[Math.min(combo, PENTATONIC.length - 1)];
    this.tone({ freq: note, dur: .18, vol: .12, delay: .035, shimmer: true });
    this.tone({ freq: note * 1.5, dur: .14, vol: .06, delay: .065, shimmer: true });
  }

  pickup() {
    if (this.throttle('pickup', 34)) return;
    const now = performance.now();
    if (now - this.lastGemAt < 650) this.gemStreak = Math.min(this.gemStreak + 1, PENTATONIC.length - 1);
    else this.gemStreak = 0;
    this.lastGemAt = now;
    const note = PENTATONIC[this.gemStreak];
    this.tone({ freq: note * 1.5, dur: 0.12, type: 'sine', vol: 0.18, shimmer: true });
    this.tone({ freq: note * 2, dur: 0.15, type: 'triangle', vol: 0.11, delay: 0.04, shimmer: true });
  }

  gemBig() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone({ freq: f, dur: 0.22, type: 'sine', vol: 0.22, delay: i * 0.055, shimmer: true }));
  }

  hurt() {
    if (this.throttle('hurt', 240)) return;
    this.tone({ freq: 250, freqEnd: 92, dur: 0.22, type: 'triangle', vol: 0.34 });
    this.tone({ freq: 180, freqEnd: 68, dur: 0.26, type: 'sine', vol: 0.3 });
    this.noise({ dur: 0.12, vol: 0.14, freq: 500, freqEnd: 180, q: 1.5 });
  }

  dash() {
    if (this.throttle('dash', 180)) return;
    this.noise({ dur: 0.22, vol: 0.2, freq: 800, freqEnd: 3800, q: 1.2 });
    this.tone({ freq: 392, freqEnd: 784, dur: 0.16, type: 'sine', vol: 0.14, shimmer: true });
    this.tone({ freq: 659, freqEnd: 1046, dur: 0.14, type: 'triangle', vol: 0.1, delay: 0.04, shimmer: true });
  }

  waveHorn() {
    [392.0, 493.88, 587.33, 783.99].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.32, type: 'triangle', vol: 0.2, delay: i * 0.075, shimmer: true });
      this.tone({ freq: f * 0.5, dur: 0.36, type: 'sine', vol: 0.15, delay: i * 0.075 });
    });
  }

  upgrade() {
    [523.25, 659.25, 783.99, 987.77, 1046.5].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.24, type: 'sine', vol: 0.2, delay: i * 0.055, shimmer: true });
      this.tone({ freq: f * 2, dur: 0.15, type: 'triangle', vol: 0.07, delay: i * 0.055 + 0.02, shimmer: true });
    });
  }

  buy() {
    this.tone({ freq: 659.25, dur: 0.12, type: 'sine', vol: 0.22, shimmer: true });
    this.tone({ freq: 987.77, dur: 0.2, type: 'sine', vol: 0.22, delay: 0.06, shimmer: true });
    this.tone({ freq: 1318.5, dur: 0.24, type: 'triangle', vol: 0.12, delay: 0.12, shimmer: true });
  }

  swap() {
    this.tone({ freq: 420, freqEnd: 660, dur: 0.07, type: 'sine', vol: 0.16 });
  }

  denied() {
    this.tone({ freq: 240, freqEnd: 170, dur: 0.12, type: 'triangle', vol: 0.18 });
    this.tone({ freq: 185, freqEnd: 135, dur: 0.14, type: 'sine', vol: 0.18, delay: 0.08 });
  }

  gameOver() {
    [440, 392, 329.63, 261.63].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.34, type: 'sine', vol: 0.22, delay: i * 0.17, shimmer: true });
      this.tone({ freq: f * 0.5, dur: 0.38, type: 'triangle', vol: 0.12, delay: i * 0.17 });
    });
  }

  victory() {
    [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.32, type: 'sine', vol: 0.22, delay: i * 0.08, shimmer: true });
      this.tone({ freq: f * 0.5, dur: 0.34, type: 'triangle', vol: 0.1, delay: i * 0.08 });
    });
  }

  click() {
    this.tone({ freq: 380, freqEnd: 760, dur: 0.08, type: 'sine', vol: 0.17 });
    this.tone({ freq: 760, freqEnd: 1120, dur: 0.07, type: 'triangle', vol: 0.08, delay: 0.035, shimmer: true });
  }

  boom() {
    if (this.throttle('boom', 75)) return;
    this.tone({ freq: 135, freqEnd: 34, dur: 0.42, type: 'sine', vol: 0.48 });
    this.tone({ freq: 220, freqEnd: 62, dur: 0.28, type: 'triangle', vol: 0.26 });
    this.noise({ dur: 0.32, vol: 0.24, freq: 520, freqEnd: 140, q: 0.9, filterType: 'lowpass' });
    this.tone({ freq: 780, freqEnd: 1400, dur: 0.12, type: 'sine', vol: 0.1, delay: 0.05, shimmer: true });
  }

  bonk() {
    if (this.throttle('bonk', 80)) return;
    this.tone({ freq: 380, freqEnd: 210, dur: 0.09, type: 'sine', vol: 0.28 });
    this.tone({ freq: 590, freqEnd: 460, dur: 0.08, type: 'triangle', vol: 0.16, delay: 0.01 });
    this.tone({ freq: 290, freqEnd: 430, dur: 0.12, type: 'sine', vol: 0.12, delay: 0.04 });
  }

    /* --------- cute slime voices --------- */
  /** v = voice pitch multiplier (small slimes squeak high, big ones gloop low) */
  slimeSpawn(v = 1) {
    if (this.throttle('sspawn', 60)) return;
    const f = 250 * v;
    this.tone({ freq: f, freqEnd: f * 2.4, dur: 0.13, type: 'sine', vol: 0.2, shimmer: true, vibRate: 26, vibDepth: 14 });
    this.tone({ freq: f * 1.5, freqEnd: f * 3.2, dur: 0.09, type: 'triangle', vol: 0.07, delay: 0.03 });
    this.noise({ dur: 0.06, vol: 0.05, freq: 2400, freqEnd: 5000, q: 2 });
  }

  slimeHop(v = 1, vol = 1) {
    if (this.throttle('shop', 70)) return;
    const f = 170 * v * (0.92 + Math.random() * 0.16);
    this.tone({ freq: f, freqEnd: f * 1.9, dur: 0.075, type: 'sine', vol: 0.095 * vol, attack: 0.004 });
    this.tone({ freq: f * 2.4, freqEnd: f * 3.2, dur: 0.05, type: 'triangle', vol: 0.035 * vol, delay: 0.012 });
  }

  /** "eep!" squeak when a slime gets bonked */
  squeak(v = 1) {
    if (this.throttle('squeak', 60)) return;
    const f = 520 * v * (0.94 + Math.random() * 0.12);
    this.tone({ freq: f, freqEnd: f * 1.65, dur: 0.07, type: 'sine', vol: 0.17, attack: 0.004 });
    this.tone({ freq: f * 1.65, freqEnd: f * 1.05, dur: 0.1, type: 'sine', vol: 0.14, delay: 0.06 });
    this.tone({ freq: f * 2, freqEnd: f * 2.6, dur: 0.05, type: 'triangle', vol: 0.05, delay: 0.01 });
  }

  /** "pwee-pop!" when a slime pops */
  slimeDie(v = 1) {
    if (this.throttle('sdie', 45)) return;
    const f = 360 * v;
    this.tone({ freq: f, freqEnd: f * 2.3, dur: 0.1, type: 'sine', vol: 0.2, shimmer: true, vibRate: 30, vibDepth: 20 });
    this.tone({ freq: f * 2.3, freqEnd: f * 0.8, dur: 0.14, type: 'sine', vol: 0.15, delay: 0.09, shimmer: true });
  }

  /** idle "mrrp" / "hehe" chatter */
  slimeChat(v = 1, vol = 1) {
    if (this.throttle('schat', 350)) return;
    const f = 420 * v * (0.92 + Math.random() * 0.2);
    const pat = Math.random() < 0.5 ? [1, 1.26, 1.12] : [1, 0.89, 1.33, 1];
    pat.forEach((m, i) => this.tone({ freq: f * m, freqEnd: f * m * 1.12, dur: 0.055, type: 'sine', vol: 0.08 * vol, delay: i * 0.075, attack: 0.004 }));
  }

  /** little "nom!" when a slime bumps the player */
  slimeChomp(v = 1) {
    if (this.throttle('schomp', 120)) return;
    const f = 190 * v;
    this.tone({ freq: f * 2, freqEnd: f * 0.8, dur: 0.09, type: 'triangle', vol: 0.18 });
    this.noise({ dur: 0.08, vol: 0.09, freq: 900, freqEnd: 300, q: 2.5 });
    this.tone({ freq: f * 3, freqEnd: f * 2, dur: 0.05, type: 'sine', vol: 0.08, delay: 0.05 });
  }

  /** two-bloop split */
  slimeSplit() {
    if (this.throttle('ssplit', 90)) return;
    this.tone({ freq: 300, freqEnd: 720, dur: 0.09, type: 'sine', vol: 0.18, shimmer: true });
    this.tone({ freq: 420, freqEnd: 980, dur: 0.09, type: 'sine', vol: 0.16, delay: 0.08, shimmer: true });
  }

  /** big gloopy slime king hello */
  slimeBoss() {
    this.tone({ freq: 120, freqEnd: 58, dur: 0.5, type: 'sine', vol: 0.34, vibRate: 9, vibDepth: 10 });
    this.tone({ freq: 200, freqEnd: 90, dur: 0.4, type: 'triangle', vol: 0.18, delay: 0.04, vibRate: 11, vibDepth: 12 });
    [0.12, 0.24, 0.36].forEach((d, i) => this.tone({ freq: 240 + i * 90, freqEnd: 600 + i * 160, dur: 0.1, type: 'sine', vol: 0.1, delay: d, shimmer: true }));
  }

  /* --------- secret console --------- */
  tick() {
    if (this.throttle('tick', 22)) return;
    this.tone({ freq: 1400 + Math.random() * 400, dur: 0.022, type: 'square', vol: 0.05 });
  }
  deny2() {
    this.tone({ freq: 180, freqEnd: 90, dur: 0.24, type: 'sawtooth', vol: 0.2 });
    this.noise({ dur: 0.16, vol: 0.12, freq: 380, freqEnd: 120, q: 2 });
  }
  granted() {
    const seq = [130.81, 196, 261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
    seq.forEach((f, i) => {
      this.tone({ freq: f, dur: 0.4, type: 'sine', vol: 0.2, delay: i * 0.055, shimmer: true });
      this.tone({ freq: f * 1.5, dur: 0.3, type: 'triangle', vol: 0.09, delay: i * 0.055 + 0.02, shimmer: true });
    });
    this.noise({ dur: 0.9, vol: 0.1, freq: 300, freqEnd: 6000, q: 0.7, delay: 0.1 });
  }
  unlock() {
    this.tone({ freq: 300, freqEnd: 900, dur: 0.18, type: 'sine', vol: 0.22, shimmer: true });
    this.tone({ freq: 900, freqEnd: 1500, dur: 0.22, type: 'triangle', vol: 0.16, delay: 0.1, shimmer: true });
  }
  admin() {
    this.tone({ freq: 880, dur: 0.06, type: 'square', vol: 0.1 });
    this.tone({ freq: 1320, dur: 0.1, type: 'sine', vol: 0.16, delay: 0.05, shimmer: true });
  }
}

export const audio = new AudioMan();
