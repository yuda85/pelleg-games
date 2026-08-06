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
import type { Card, MemoryBoard } from './memory-engine';

export interface BoardResult {
  mistakes: number;
  hints: number;
}

/** How long a mismatched pair stays face-up before closing again. */
const PEEK_MS = 900;
/** How long a hint holds a pair open. */
const HINT_MS = 1400;

/**
 * A grid of shells. Open two; if they belong together they stay open.
 *
 * There is no clock. Memory plus a countdown is just stress, and the whole app
 * promises the child that nothing here is racing her.
 */
@Component({
  selector: 'pg-memory-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './memory-board.html',
  styleUrl: './memory-board.scss',
})
export class MemoryBoardView {
  private readonly audio = inject(Audio);

  readonly board = input.required<MemoryBoard>();
  readonly solved = output<BoardResult>();

  /** Cards currently face-up and not yet matched — at most two. */
  protected readonly open = signal<readonly string[]>([]);
  protected readonly matched = signal<ReadonlySet<string>>(new Set());
  protected readonly mistakes = signal(0);
  protected readonly hints = signal(0);
  /** Set briefly after a wrong pair, to tint those two shells. */
  protected readonly wrong = signal<readonly string[]>([]);
  /** True while a mismatch is closing, so further taps are ignored. */
  private busy = false;
  private timers: ReturnType<typeof setTimeout>[] = [];

  protected readonly foundPairs = computed(() => this.matched().size / 2);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimers());

    // A new board is a clean game.
    effect(() => {
      this.board();
      this.clearTimers();
      this.open.set([]);
      this.matched.set(new Set());
      this.mistakes.set(0);
      this.hints.set(0);
      this.wrong.set([]);
      this.busy = false;
    });
  }

  protected isOpen(card: Card): boolean {
    return this.open().includes(card.id) || this.matched().has(card.id);
  }

  protected isMatched(card: Card): boolean {
    return this.matched().has(card.id);
  }

  protected isWrong(card: Card): boolean {
    return this.wrong().includes(card.id);
  }

  protected flip(card: Card): void {
    if (this.busy || this.isOpen(card)) return;

    const open = [...this.open(), card.id];
    this.open.set(open);
    this.audio.play('pick');
    if (open.length < 2) return;

    const [first, second] = open.map((id) => this.cardById(id));
    if (first.pairId === second.pairId) {
      this.matched.update((set) => new Set(set).add(first.id).add(second.id));
      this.open.set([]);
      this.audio.play('place');
      if (this.matched().size === this.board().cards.length) {
        this.audio.play('win');
        this.solved.emit({ mistakes: this.mistakes(), hints: this.hints() });
      }
      return;
    }

    // Wrong: hold both open long enough to be read, then close. Counted, but
    // nothing is lost and nothing shouts.
    this.mistakes.update((n) => n + 1);
    this.audio.play('wrong');
    this.wrong.set(open);
    this.busy = true;
    this.after(PEEK_MS, () => {
      this.open.set([]);
      this.wrong.set([]);
      this.busy = false;
    });
  }

  /** Opens one unmatched pair for a moment. Costs stars, never blocks. */
  protected hint(): void {
    if (this.busy) return;
    const matched = this.matched();
    const next = this.board().cards.find((c) => !matched.has(c.id));
    if (!next) return;
    const partner = this.board().cards.find((c) => c.pairId === next.pairId && c.id !== next.id);
    if (!partner) return;

    this.hints.update((n) => n + 1);
    this.audio.play('whoosh');
    this.open.set([next.id, partner.id]);
    this.busy = true;
    this.after(HINT_MS, () => {
      this.open.set([]);
      this.busy = false;
    });
  }

  private cardById(id: string): Card {
    return this.board().cards.find((c) => c.id === id)!;
  }

  private after(ms: number, run: () => void): void {
    this.timers.push(setTimeout(run, ms));
  }

  private clearTimers(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];
  }
}
