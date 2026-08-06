import { Injectable, computed, inject, signal } from '@angular/core';
import { Progress } from './progress';

/**
 * Hebrew read-aloud through the browser's built-in speech synthesis.
 * Nikud is about sound, so hearing the solved word is what closes the loop —
 * and this needs no key, no account and no network call.
 *
 * Voice availability varies by platform, and the voice list is populated
 * asynchronously, so `available` is a signal rather than a one-shot check.
 * With no Hebrew voice the game stays silent instead of reading Hebrew with an
 * English one, and the listen buttons hide themselves.
 */
@Injectable({ providedIn: 'root' })
export class Speech {
  private readonly progress = inject(Progress);
  private readonly voice = signal<SpeechSynthesisVoice | null>(null);

  readonly available = computed(() => this.voice() !== null);

  constructor() {
    if (typeof speechSynthesis === 'undefined') return;
    this.refresh();
    // Several browsers only fill the list after the first getVoices() call.
    speechSynthesis.addEventListener('voiceschanged', () => this.refresh());
  }

  say(text: string, rate = 0.8): void {
    const voice = this.voice();
    if (!voice || !this.progress.speechOn()) return;

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = rate; // slower than default — this is a reading exercise
    utterance.pitch = 1.1;
    speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  private refresh(): void {
    const voices = speechSynthesis.getVoices();
    this.voice.set(voices.find((v) => v.lang.toLowerCase().startsWith('he')) ?? null);
  }
}
