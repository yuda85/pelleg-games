import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Audio } from '../../core/sfx';
import { Icon } from '../../shared/icon';
import { SolidView } from './solid-view';
import type { Question } from './shapes-engine';

export interface QuestionResult {
  mistakes: number;
  hints: number;
}

/**
 * One question about the solid on the turntable.
 *
 * A wrong answer greys itself out and stays on screen — she can see what she has
 * already ruled out, which on a counting question is most of the work.
 */
@Component({
  selector: 'pg-shape-question',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, SolidView],
  templateUrl: './shape-question.html',
  styleUrl: './shape-question.scss',
})
export class ShapeQuestion {
  private readonly audio = inject(Audio);

  readonly question = input.required<Question>();
  readonly solved = output<QuestionResult>();

  protected readonly ruledOut = signal<readonly string[]>([]);
  protected readonly mistakes = signal(0);
  protected readonly hints = signal(0);
  protected readonly done = signal(false);

  constructor() {
    effect(() => {
      this.question();
      this.ruledOut.set([]);
      this.mistakes.set(0);
      this.hints.set(0);
      this.done.set(false);
    });
  }

  protected isOut(choice: string): boolean {
    return this.ruledOut().includes(choice);
  }

  protected choose(choice: string): void {
    if (this.done() || this.isOut(choice)) return;

    if (choice === this.question().answer) {
      this.done.set(true);
      this.audio.play('place');
      this.solved.emit({ mistakes: this.mistakes(), hints: this.hints() });
      return;
    }

    this.mistakes.update((n) => n + 1);
    this.audio.play('wrong');
    this.ruledOut.update((list) => [...list, choice]);
  }

  /** Rules out one wrong answer. Costs stars, never blocks. */
  protected hint(): void {
    const question = this.question();
    const wrong = question.choices.find((c) => c !== question.answer && !this.isOut(c));
    if (!wrong) return;
    this.hints.update((n) => n + 1);
    this.audio.play('whoosh');
    this.ruledOut.update((list) => [...list, wrong]);
  }
}
