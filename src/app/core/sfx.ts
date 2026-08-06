import { Injectable, inject } from '@angular/core';
import { Progress } from './progress';

/**
 * Every sound is synthesised with the Web Audio API — no audio files, no
 * network, nothing to load. Keeps the game instant and fully offline.
 */
export type Sfx = 'pick' | 'place' | 'wrong' | 'star' | 'coin' | 'win' | 'whoosh';

interface Tone {
  freq: number;
  /** Seconds from the cue start. */
  at: number;
  dur: number;
  type: OscillatorType;
  gain: number;
}

const CUES: Readonly<Record<Sfx, readonly Tone[]>> = {
  pick: [{ freq: 660, at: 0, dur: 0.07, type: 'sine', gain: 0.16 }],
  place: [
    { freq: 784, at: 0, dur: 0.09, type: 'triangle', gain: 0.2 },
    { freq: 1175, at: 0.06, dur: 0.12, type: 'sine', gain: 0.16 },
  ],
  // Deliberately soft and low: a wrong drop is information, not a punishment.
  wrong: [{ freq: 190, at: 0, dur: 0.16, type: 'sine', gain: 0.12 }],
  star: [
    { freq: 988, at: 0, dur: 0.1, type: 'triangle', gain: 0.18 },
    { freq: 1319, at: 0.08, dur: 0.14, type: 'triangle', gain: 0.16 },
  ],
  coin: [
    { freq: 1047, at: 0, dur: 0.06, type: 'square', gain: 0.09 },
    { freq: 1568, at: 0.05, dur: 0.1, type: 'square', gain: 0.08 },
  ],
  win: [
    { freq: 523, at: 0, dur: 0.13, type: 'triangle', gain: 0.2 },
    { freq: 659, at: 0.12, dur: 0.13, type: 'triangle', gain: 0.2 },
    { freq: 784, at: 0.24, dur: 0.13, type: 'triangle', gain: 0.2 },
    { freq: 1047, at: 0.36, dur: 0.3, type: 'triangle', gain: 0.22 },
  ],
  whoosh: [{ freq: 320, at: 0, dur: 0.18, type: 'sawtooth', gain: 0.07 }],
};

@Injectable({ providedIn: 'root' })
export class Audio {
  private readonly progress = inject(Progress);
  private ctx: AudioContext | null = null;

  play(cue: Sfx): void {
    if (!this.progress.soundOn()) return;
    const ctx = this.context();
    if (!ctx) return;
    // Browsers start the context suspended until a gesture; resuming here is
    // harmless once it is already running.
    if (ctx.state === 'suspended') void ctx.resume();

    const start = ctx.currentTime + 0.01;
    for (const tone of CUES[cue]) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = tone.type;
      osc.frequency.value = tone.freq;

      const from = start + tone.at;
      const to = from + tone.dur;
      // Ramp both ends — a raw start/stop clicks.
      amp.gain.setValueAtTime(0.0001, from);
      amp.gain.exponentialRampToValueAtTime(tone.gain, from + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, to);

      osc.connect(amp).connect(ctx.destination);
      osc.start(from);
      osc.stop(to + 0.02);
    }
  }

  /** Rising run for a streak — pitch climbs with the combo. */
  streak(count: number): void {
    if (!this.progress.soundOn()) return;
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const steps = Math.min(count, 6);
    const start = ctx.currentTime + 0.01;
    for (let i = 0; i < steps; i++) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 523 * Math.pow(2, i / 12);
      const from = start + i * 0.055;
      amp.gain.setValueAtTime(0.0001, from);
      amp.gain.exponentialRampToValueAtTime(0.16, from + 0.01);
      amp.gain.exponentialRampToValueAtTime(0.0001, from + 0.09);
      osc.connect(amp).connect(ctx.destination);
      osc.start(from);
      osc.stop(from + 0.11);
    }
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof AudioContext === 'undefined') return null;
    this.ctx = new AudioContext();
    return this.ctx;
  }
}
