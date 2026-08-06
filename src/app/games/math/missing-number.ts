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
import { Stones, type StoneResult } from './stones';
import type { Board } from './math-engine';

const ROUND_SECONDS = 45;

export interface BonusResult {
  secondsLeft: number;
  correct: number;
}

/**
 * Bonus round: the answer is given and an operand is missing.
 *
 * Working backwards is a different move from computing forwards — algebra
 * readiness, not more of the same drill — and it reuses the same generator with
 * a different slot hidden. Deep water instead of the bright brook, so it reads
 * as a reward.
 */
@Component({
  selector: 'pg-missing-number',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Stones],
  templateUrl: './missing-number.html',
  styleUrl: './missing-number.scss',
})
export class MissingNumber {
  private readonly audio = inject(Audio);

  readonly boards = input.required<readonly Board[]>();
  readonly chill = input(false);
  readonly done = output<BonusResult>();

  protected readonly index = signal(0);
  protected readonly correct = signal(0);
  protected readonly secondsLeft = signal(ROUND_SECONDS);
  protected readonly finished = signal(false);
  protected readonly roundSeconds = ROUND_SECONDS;

  protected readonly current = computed(() => this.boards()[this.index()]);
  protected readonly total = computed(() => this.boards().length);

  private ticker?: ReturnType<typeof setInterval>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.ticker));

    effect(() => {
      this.boards();
      this.index.set(0);
      this.correct.set(0);
      this.finished.set(false);
      this.secondsLeft.set(ROUND_SECONDS);
      this.startClock();
    });
  }

  private startClock(): void {
    clearInterval(this.ticker);
    if (this.chill()) return;
    this.ticker = setInterval(() => {
      if (this.finished()) return;
      const left = this.secondsLeft() - 1;
      this.secondsLeft.set(left);
      // Running out is not a loss — the round just ends with no bonus.
      if (left <= 0) this.finish();
    }, 1000);
  }

  protected onSolved(result: StoneResult): void {
    if (result.mistakes === 0 && result.hints === 0) this.correct.update((n) => n + 1);
    const next = this.index() + 1;
    if (next >= this.total()) {
      this.finish();
      return;
    }
    this.index.set(next);
  }

  protected finish(): void {
    if (this.finished()) return;
    this.finished.set(true);
    clearInterval(this.ticker);
    this.audio.play(this.correct() > 0 ? 'win' : 'whoosh');
    this.done.emit({ secondsLeft: Math.max(this.secondsLeft(), 0), correct: this.correct() });
  }

  protected skip(): void {
    this.finish();
  }
}
