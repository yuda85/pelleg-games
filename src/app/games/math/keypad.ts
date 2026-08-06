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
import { OP_SIGN, type Board } from './math-engine';
import type { StoneResult } from './stones';

/** Wrong attempts before the boss becomes a stone question instead. */
const SURRENDER_AT = 3;

/**
 * The seventh question of a set: typed, not chosen.
 *
 * Stones alone are recognition — a child can learn to eliminate rather than
 * compute. One typed answer per set keeps the game honest.
 *
 * After three wrong attempts it hands over to the stone board. There is no hint
 * button; that escape hatch is its equivalent, and it means a set can always be
 * finished.
 */
@Component({
  selector: 'pg-keypad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './keypad.html',
  styleUrl: './keypad.scss',
})
export class Keypad {
  private readonly audio = inject(Audio);

  readonly board = input.required<Board>();
  readonly solved = output<StoneResult>();
  /** Three misses: the caller should swap in the stone board. */
  readonly surrender = output<number>();

  protected readonly entry = signal('');
  protected readonly mistakes = signal(0);
  protected readonly shaking = signal(false);
  protected readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  protected readonly prompt = computed(() => {
    const q = this.board().question;
    return `${q.a} ${OP_SIGN[q.op]} ${q.b} = ▢`;
  });

  constructor() {
    effect(() => {
      this.board();
      this.entry.set('');
      this.mistakes.set(0);
      this.shaking.set(false);
    });
  }

  protected type(digit: string): void {
    // Four digits is past any answer this game generates.
    if (this.entry().length >= 4) return;
    this.entry.update((value) => value + digit);
    this.audio.play('pick');
  }

  protected backspace(): void {
    this.entry.update((value) => value.slice(0, -1));
  }

  protected submit(): void {
    if (this.entry() === '') return;

    if (Number(this.entry()) === this.board().answer) {
      this.audio.play('place');
      this.solved.emit({ mistakes: this.mistakes(), hints: 0 });
      return;
    }

    this.mistakes.update((n) => n + 1);
    this.entry.set('');
    this.audio.play('wrong');
    this.shaking.set(true);
    setTimeout(() => this.shaking.set(false), 450);

    // Carry the mistakes across so the stone board scores the same question.
    if (this.mistakes() >= SURRENDER_AT) this.surrender.emit(this.mistakes());
  }
}
