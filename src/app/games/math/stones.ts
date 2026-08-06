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
import { OP_SIGN, type Board, type Stone } from './math-engine';

export interface StoneResult {
  mistakes: number;
  hints: number;
}

/**
 * One question, answered by hopping onto a stone.
 *
 * A wrong stone sinks and טִפִּי stays put: the question stays open, the mistake
 * costs a star, and nothing reads as failure. Same contract as the nikud board.
 */
@Component({
  selector: 'pg-stones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './stones.html',
  styleUrl: './stones.scss',
})
export class Stones {
  private readonly audio = inject(Audio);

  readonly board = input.required<Board>();
  /**
   * Mistakes already made on this question elsewhere. Non-zero when the keypad
   * boss surrendered to stones — the question keeps its cost rather than
   * resetting to a clean slate.
   */
  readonly initialMistakes = input(0);
  readonly solved = output<StoneResult>();

  protected readonly mistakes = signal(0);
  protected readonly hints = signal(0);
  protected readonly sunk = signal<ReadonlySet<number>>(new Set());
  protected readonly landed = signal<number | null>(null);

  protected readonly prompt = computed(() => {
    const q = this.board().question;
    const sign = OP_SIGN[q.op];
    return q.unknown === 'operand' ? `${q.a} ${sign} ▢ = ${q.answer}` : `${q.a} ${sign} ${q.b} = ?`;
  });

  constructor() {
    // A new board is a fresh question, apart from any cost carried into it.
    effect(() => {
      this.board();
      this.mistakes.set(this.initialMistakes());
      this.hints.set(0);
      this.sunk.set(new Set());
      this.landed.set(null);
    });
  }

  protected isSunk(stone: Stone): boolean {
    return this.sunk().has(stone.value);
  }

  protected choose(stone: Stone): void {
    if (this.isSunk(stone) || this.landed() !== null) return;

    if (stone.value === this.board().answer) {
      this.landed.set(stone.value);
      this.audio.play('place');
      this.solved.emit({ mistakes: this.mistakes(), hints: this.hints() });
      return;
    }

    this.mistakes.update((n) => n + 1);
    this.audio.play('wrong');
    this.sink(stone.value);
  }

  /** Sinks one wrong stone. Costs stars, never blocks. */
  protected hint(): void {
    const answer = this.board().answer;
    const remaining = this.board().stones.filter((s) => s.value !== answer && !this.isSunk(s));
    if (remaining.length === 0) return;
    this.hints.update((n) => n + 1);
    this.audio.play('whoosh');
    this.sink(remaining[0].value);
  }

  private sink(value: number): void {
    this.sunk.update((set) => new Set(set).add(value));
  }
}
