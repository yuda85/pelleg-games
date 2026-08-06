import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Audio } from '../../core/sfx';
import { Icon } from '../../shared/icon';
import { SolidView } from './solid-view';
import type { BonusRound } from './shapes-engine';

export interface BonusResult {
  correct: number;
}

/**
 * Bonus round: does this one roll, or does it stack?
 *
 * No numbers at all — just the curved-versus-flat idea that makes the counting
 * questions make sense in the first place. Deep water, like the other games'
 * bonus rounds.
 */
@Component({
  selector: 'pg-roll-sort',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, SolidView],
  templateUrl: './roll-sort.html',
  styleUrl: './roll-sort.scss',
})
export class RollSort {
  private readonly audio = inject(Audio);

  readonly rounds = input.required<readonly BonusRound[]>();
  readonly done = output<BonusResult>();

  protected readonly index = signal(0);
  protected readonly correct = signal(0);
  protected readonly picked = signal<boolean | null>(null);

  protected readonly round = computed(() => this.rounds()[this.index()]);
  protected readonly total = computed(() => this.rounds().length);
  protected readonly wasRight = computed(
    () => this.picked() !== null && this.picked() === this.round().rolls,
  );

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      this.rounds();
      clearTimeout(this.timer);
      this.index.set(0);
      this.correct.set(0);
      this.picked.set(null);
    });
  }

  protected answer(rolls: boolean): void {
    if (this.picked() !== null) return;
    this.picked.set(rolls);

    const right = rolls === this.round().rolls;
    if (right) this.correct.update((n) => n + 1);
    this.audio.play(right ? 'place' : 'wrong');

    this.timer = setTimeout(() => {
      const next = this.index() + 1;
      if (next >= this.total()) {
        this.audio.play(this.correct() > 0 ? 'win' : 'whoosh');
        this.done.emit({ correct: this.correct() });
        return;
      }
      this.index.set(next);
      this.picked.set(null);
    }, 1200);
  }
}
