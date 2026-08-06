import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Audio } from '../../core/sfx';
import { Icon } from '../../shared/icon';
import { shuffle } from '../../core/hebrew';
import type { VanishRound } from './memory-engine';

/** How long the full list stays up before one word leaves. */
const STUDY_MS = 3200;

export interface VanishResult {
  correct: number;
}

type Phase = 'study' | 'choose' | 'done';

/**
 * Bonus round: five words, then one is gone — which?
 *
 * A different memory muscle from the grid. The grid is about where a thing was;
 * this is about what was there at all. Vocalized words, so it doubles as reading
 * practice.
 */
@Component({
  selector: 'pg-vanished',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './vanished.html',
  styleUrl: './vanished.scss',
})
export class Vanished {
  private readonly audio = inject(Audio);

  readonly rounds = input.required<readonly VanishRound[]>();
  readonly done = output<VanishResult>();

  protected readonly index = signal(0);
  protected readonly correct = signal(0);
  protected readonly phase = signal<Phase>('study');
  protected readonly picked = signal<string | null>(null);

  protected readonly round = computed(() => this.rounds()[this.index()]);
  protected readonly total = computed(() => this.rounds().length);
  /** The four still on the table once one has gone. */
  protected readonly remaining = computed(() =>
    this.round().shown.filter((w) => w !== this.round().missing),
  );
  /** Choices are the five originals, shuffled — the answer must not stand out. */
  protected readonly choices = computed(() => shuffle(this.round().shown));

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));

    effect(() => {
      this.rounds();
      this.index.set(0);
      this.correct.set(0);
      this.startStudy();
    });
  }

  private startStudy(): void {
    clearTimeout(this.timer);
    this.phase.set('study');
    this.picked.set(null);
    this.timer = setTimeout(() => {
      this.audio.play('whoosh');
      this.phase.set('choose');
    }, STUDY_MS);
  }

  protected choose(word: string): void {
    if (this.phase() !== 'choose' || this.picked() !== null) return;
    this.picked.set(word);

    const right = word === this.round().missing;
    if (right) this.correct.update((n) => n + 1);
    this.audio.play(right ? 'place' : 'wrong');

    this.timer = setTimeout(() => {
      const next = this.index() + 1;
      if (next >= this.total()) {
        this.phase.set('done');
        this.audio.play(this.correct() > 0 ? 'win' : 'whoosh');
        this.done.emit({ correct: this.correct() });
        return;
      }
      this.index.set(next);
      this.startStudy();
    }, 1100);
  }

  protected isPicked(word: string): boolean {
    return this.picked() === word;
  }

  protected showAnswer(word: string): boolean {
    return this.picked() !== null && word === this.round().missing;
  }
}
