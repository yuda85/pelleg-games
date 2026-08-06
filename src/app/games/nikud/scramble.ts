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
import { shuffle, stripMarks, type WordEntry } from '../../core/hebrew';
import { Icon } from '../../shared/icon';
import { capturePointer } from './nikud-board';

const ROUND_SECONDS = 45;

export interface ScrambleResult {
  secondsLeft: number;
  moves: number;
}

/**
 * Bonus round: the letters of a word, out of order, no nikud at all.
 *
 * It runs on a different skill and wears a different skin — deep water instead
 * of the bright brook — so it reads as a reward rather than more of the same.
 * The clock is generous, and chill mode removes it entirely.
 */
@Component({
  selector: 'pg-scramble',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './scramble.html',
  styleUrl: './scramble.scss',
})
export class Scramble {
  private readonly audio = inject(Audio);

  readonly word = input.required<WordEntry>();
  readonly chill = input(false);
  readonly done = output<ScrambleResult>();

  protected readonly tiles = signal<string[]>([]);
  protected readonly picked = signal<number | null>(null);
  protected readonly moves = signal(0);
  protected readonly secondsLeft = signal(ROUND_SECONDS);
  protected readonly finished = signal(false);
  protected readonly drag = signal<{ from: number; x: number; y: number } | null>(null);

  private pressOrigin: { x: number; y: number } | null = null;
  private ticker?: ReturnType<typeof setInterval>;

  protected readonly target = computed(() => stripMarks(this.word().word));
  protected readonly isSolved = computed(() => this.tiles().join('') === this.target());
  protected readonly dragLetter = computed(() => {
    const from = this.drag()?.from;
    return from === undefined ? null : this.tiles()[from];
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.ticker));

    effect(() => {
      this.tiles.set(scrambleOf(this.target()));
      this.picked.set(null);
      this.moves.set(0);
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
      // Time out is not a loss — the round just ends and the bonus is zero.
      if (left <= 0) this.finish();
    }, 1000);
  }

  // --- tap-tap --------------------------------------------------------------

  protected onTileClick(index: number): void {
    if (this.finished()) return;
    const from = this.picked();
    if (from === null) {
      this.picked.set(index);
      this.audio.play('pick');
      return;
    }
    this.picked.set(null);
    if (from !== index) this.swap(from, index);
  }

  // --- drag -----------------------------------------------------------------

  protected onTileDown(event: PointerEvent): void {
    if (this.finished()) return;
    capturePointer(event);
    this.pressOrigin = { x: event.clientX, y: event.clientY };
  }

  protected onTileMove(event: PointerEvent, index: number): void {
    const origin = this.pressOrigin;
    if (!origin) return;
    const moved = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
    if (moved < 8 && !this.drag()) return;
    this.drag.set({ from: index, x: event.clientX, y: event.clientY });
    this.picked.set(index);
  }

  protected onTileUp(event: PointerEvent, index: number): void {
    const dragging = this.drag();
    this.pressOrigin = null;
    this.drag.set(null);
    if (!dragging) {
      this.onTileClick(index);
      return;
    }
    this.picked.set(null);
    const over = this.tileUnder(event.clientX, event.clientY);
    if (over !== null && over !== dragging.from) this.swap(dragging.from, over);
  }

  protected onTileCancel(): void {
    this.pressOrigin = null;
    this.drag.set(null);
  }

  private tileUnder(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-tile]');
    const raw = el?.dataset['tile'];
    return raw === undefined ? null : Number(raw);
  }

  private swap(a: number, b: number): void {
    this.tiles.update((letters) => {
      const next = [...letters];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
    this.moves.update((n) => n + 1);
    this.audio.play('place');
    if (this.isSolved()) this.finish();
  }

  protected finish(): void {
    if (this.finished()) return;
    this.finished.set(true);
    clearInterval(this.ticker);
    this.audio.play(this.isSolved() ? 'win' : 'whoosh');
    this.done.emit({ secondsLeft: Math.max(this.secondsLeft(), 0), moves: this.moves() });
  }

  protected skip(): void {
    this.finish();
  }
}

/** Shuffle until it actually looks shuffled — handing over a solved word is a dud round. */
function scrambleOf(word: string): string[] {
  const letters = [...word];
  if (letters.length < 2) return letters;
  for (let attempt = 0; attempt < 12; attempt++) {
    const mixed = shuffle(letters);
    if (mixed.join('') !== word) return mixed;
  }
  // A word of identical letters can't be scrambled; reversing is the best we can do.
  return letters.reverse();
}
