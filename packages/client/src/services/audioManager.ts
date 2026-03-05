// Web Audio API manager for game sounds
// Uses synthesized sounds rather than audio files for zero-dependency deployment

type SoundName = 'dice-roll' | 'piece-move' | 'capture' | 'piece-home' | 'lock-form' | 'victory' | 'turn-start';

class AudioManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private resuming = false;

  constructor() {
    try {
      this.muted = localStorage.getItem('ludi-muted') === 'true';
    } catch {}

    // Eagerly resume AudioContext on ANY user interaction so sounds work
    // when actually needed. Browsers require a user gesture to start AudioContext.
    const unlock = () => {
      this.ensureResumed();
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('touchstart', unlock);
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  /** Ensure context is running. Call on user interaction. */
  private ensureResumed(): void {
    const ctx = this.getContext();
    if (ctx.state === 'suspended' && !this.resuming) {
      this.resuming = true;
      ctx.resume().then(() => { this.resuming = false; });
    }
  }

  play(name: SoundName): void {
    if (this.muted) return;

    try {
      const ctx = this.getContext();

      // If still suspended, resume and retry after a short delay
      if (ctx.state === 'suspended') {
        this.resuming = true;
        ctx.resume().then(() => {
          this.resuming = false;
          this.playSound(ctx, name);
        });
        return;
      }

      this.playSound(ctx, name);
    } catch {}
  }

  private playSound(ctx: AudioContext, name: SoundName): void {
    switch (name) {
      case 'dice-roll':
        this.playDiceRoll(ctx);
        break;
      case 'piece-move':
        this.playTone(ctx, 440, 0.1, 'sine');
        break;
      case 'capture':
        this.playTone(ctx, 150, 0.3, 'sawtooth');
        setTimeout(() => this.playTone(ctx, 100, 0.2, 'sawtooth'), 100);
        break;
      case 'piece-home':
        this.playTone(ctx, 660, 0.15, 'sine');
        setTimeout(() => this.playTone(ctx, 880, 0.15, 'sine'), 150);
        setTimeout(() => this.playTone(ctx, 1100, 0.2, 'sine'), 300);
        break;
      case 'lock-form':
        this.playTone(ctx, 330, 0.2, 'triangle');
        break;
      case 'victory':
        [0, 150, 300, 450, 600].forEach((delay, i) => {
          setTimeout(() => this.playTone(ctx, 440 + i * 110, 0.2, 'sine'), delay);
        });
        break;
      case 'turn-start':
        this.playTone(ctx, 520, 0.08, 'sine');
        break;
    }
  }

  private playTone(ctx: AudioContext, freq: number, duration: number, type: OscillatorType): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  private playNoise(ctx: AudioContext, duration: number, volume: number): void {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  private playDiceRoll(ctx: AudioContext): void {
    // Simulate dice tumbling: a series of short percussive clicks with
    // decreasing tempo, like dice bouncing on a wooden surface.
    const hits = [0, 40, 90, 150, 220, 300, 400, 520, 660];
    hits.forEach((delayMs, i) => {
      setTimeout(() => {
        // Each hit is a filtered noise burst (wood knock)
        const duration = 0.03 + i * 0.003;
        const bufferSize = Math.floor(ctx.sampleRate * duration);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
          data[j] = (Math.random() * 2 - 1);
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        // Bandpass filter for a wooden "clack" sound
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800 - i * 120, ctx.currentTime);
        filter.Q.setValueAtTime(2.5, ctx.currentTime);

        const gain = ctx.createGain();
        const vol = 0.18 - i * 0.015;
        gain.gain.setValueAtTime(Math.max(vol, 0.04), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start();
      }, delayMs);
    });
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('ludi-muted', String(this.muted));
    } catch {}
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }
}

export const audioManager = new AudioManager();
