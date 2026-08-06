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
import { MARK_NAMES, renderLetter, type Chip, type Puzzle, type Slot } from '../../core/hebrew';
import { Icon } from '../../shared/icon';
import { NikudGlyph } from '../../shared/nikud-glyph';

export interface BoardResult {
  mistakes: number;
  hints: number;
}

/**
 * One word. Marks live in sockets under (and on hard, over) each letter while
 * the board is being solved — the letters themselves stay bare so nothing is
 * rendered twice. The fully vocalized word, with every mark in its true
 * typographic position, is the reward the parent screen shows on solve.
 *
 * Two ways in, because one is not enough: drag a droplet onto a socket, or tap
 * the droplet and then tap the socket. Drag is the fun one; tap-tap is the one
 * that still works on a small phone.
 */
@Component({
  selector: 'pg-nikud-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, NikudGlyph],
  templateUrl: './nikud-board.html',
  styleUrl: './nikud-board.scss',
})
export class NikudBoard {
  private readonly audio = inject(Audio);

  readonly puzzle = input.required<Puzzle>();
  /** False when the device has no Hebrew voice — the button hides rather than no-ops. */
  readonly canListen = input(true);
  readonly solved = output<BoardResult>();
  readonly listen = output<void>();

  /** slot id -> chip id */
  protected readonly placed = signal<Record<string, string>>({});
  protected readonly selectedChip = signal<string | null>(null);
  protected readonly mistakes = signal(0);
  protected readonly hints = signal(0);
  /** Slot to flash after a wrong drop, and slot the hint is pointing at. */
  protected readonly rejected = signal<string | null>(null);
  protected readonly hinted = signal<string | null>(null);
  protected readonly drag = signal<{ chipId: string; x: number; y: number } | null>(null);

  private pressOrigin: { x: number; y: number } | null = null;
  private rejectTimer?: ReturnType<typeof setTimeout>;

  protected readonly isDone = computed(() =>
    this.puzzle().slots.every((s) => this.placed()[s.id] !== undefined),
  );

  protected readonly usedChips = computed(() => new Set(Object.values(this.placed())));

  /** The tray keeps its slots after a chip is used, so nothing jumps around. */
  protected readonly tray = computed(() => this.puzzle().chips);

  protected readonly dragChip = computed(() => {
    const id = this.drag()?.chipId;
    return id ? (this.puzzle().chips.find((c) => c.id === id) ?? null) : null;
  });

  constructor() {
    // A new word resets the board; nothing carries over between puzzles.
    effect(() => {
      this.puzzle();
      this.placed.set({});
      this.selectedChip.set(null);
      this.mistakes.set(0);
      this.hints.set(0);
      this.rejected.set(null);
      this.hinted.set(null);
      this.drag.set(null);
    });
  }

  protected letterText(index: number): string {
    const letter = this.puzzle().letters[index];
    return renderLetter(letter.base, letter.fixed);
  }

  protected slotFor(letterIndex: number, kind: 'vowel' | 'dot'): Slot | undefined {
    return this.puzzle().slots.find((s) => s.letterIndex === letterIndex && s.kind === kind);
  }

  /** Hard words carry a dot slot above the letter; nothing else reserves the room. */
  protected readonly hasDotSlots = computed(() =>
    this.puzzle().slots.some((s) => s.kind === 'dot'),
  );

  protected markName(mark: string): string {
    return MARK_NAMES[mark] ?? '';
  }

  protected placedMark(slot: Slot): string | null {
    const chipId = this.placed()[slot.id];
    if (!chipId) return null;
    return this.puzzle().chips.find((c) => c.id === chipId)?.mark ?? null;
  }

  protected isChipUsed(chip: Chip): boolean {
    return this.usedChips().has(chip.id);
  }

  // --- pointer: drag out of the tray ---------------------------------------

  protected onChipDown(event: PointerEvent, chip: Chip): void {
    if (this.isChipUsed(chip)) return;
    capturePointer(event);
    this.pressOrigin = { x: event.clientX, y: event.clientY };
  }

  protected onChipMove(event: PointerEvent, chip: Chip): void {
    const origin = this.pressOrigin;
    if (!origin || this.isChipUsed(chip)) return;
    const moved = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
    // 8px of slop, so a tap with a shaky hand still reads as a tap.
    if (moved < 8 && !this.drag()) return;
    this.drag.set({ chipId: chip.id, x: event.clientX, y: event.clientY });
    this.selectedChip.set(chip.id);
  }

  protected onChipUp(event: PointerEvent, chip: Chip): void {
    const wasDragging = this.drag() !== null;
    this.pressOrigin = null;
    this.drag.set(null);
    if (this.isChipUsed(chip)) return;

    if (!wasDragging) {
      // A plain tap arms the chip for the tap-tap path.
      const next = this.selectedChip() === chip.id ? null : chip.id;
      this.selectedChip.set(next);
      if (next) this.audio.play('pick');
      return;
    }

    const slot = this.slotUnder(event.clientX, event.clientY);
    if (slot) this.tryPlace(slot, chip);
    else this.selectedChip.set(null);
  }

  protected onChipCancel(): void {
    this.pressOrigin = null;
    this.drag.set(null);
  }

  private slotUnder(x: number, y: number): Slot | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-slot-id]');
    const id = el?.dataset['slotId'];
    return id ? (this.puzzle().slots.find((s) => s.id === id) ?? null) : null;
  }

  // --- placing --------------------------------------------------------------

  protected onSlotClick(slot: Slot): void {
    const occupant = this.placed()[slot.id];
    if (occupant) {
      // Tapping a filled socket takes the droplet back — free, and not a mistake.
      this.placed.update(({ [slot.id]: _removed, ...rest }) => rest);
      this.audio.play('pick');
      return;
    }
    const chipId = this.selectedChip();
    if (!chipId) return;
    const chip = this.puzzle().chips.find((c) => c.id === chipId);
    if (chip && !this.isChipUsed(chip)) this.tryPlace(slot, chip);
  }

  private tryPlace(slot: Slot, chip: Chip): void {
    if (chip.mark !== slot.answer) {
      this.reject(slot.id);
      return;
    }
    this.placed.update((p) => ({ ...p, [slot.id]: chip.id }));
    this.selectedChip.set(null);
    this.hinted.set(null);
    this.audio.play('place');

    if (this.isDone()) {
      this.audio.play('win');
      this.solved.emit({ mistakes: this.mistakes(), hints: this.hints() });
    }
  }

  /**
   * A wrong drop costs a star and nothing else — the droplet floats back, the
   * socket shakes, and after a few tries the hint offers itself. No lives, no
   * red X, nothing that reads as failure.
   */
  private reject(slotId: string): void {
    this.mistakes.update((n) => n + 1);
    this.selectedChip.set(null);
    this.audio.play('wrong');
    this.rejected.set(slotId);
    clearTimeout(this.rejectTimer);
    this.rejectTimer = setTimeout(() => this.rejected.set(null), 500);

    if (this.mistakes() >= 4) this.showHint();
  }

  protected showHint(): void {
    const next = this.puzzle().slots.find((s) => !this.placed()[s.id]);
    if (!next || this.hinted() === next.id) return;
    this.hints.update((n) => n + 1);
    this.hinted.set(next.id);
    this.selectedChip.set(null);
    this.audio.play('whoosh');
  }

  /** The chip the hint is currently pointing at, so the tray can light it up. */
  protected readonly hintedChipMark = computed(() => {
    const slotId = this.hinted();
    if (!slotId) return null;
    return this.puzzle().slots.find((s) => s.id === slotId)?.answer ?? null;
  });

  protected readonly needsNudge = computed(() => this.mistakes() >= 2 && !this.isDone());
}

/**
 * Keeps the move/up stream on the element the drag started from. Throws for a
 * pointer id the browser no longer considers active, which is recoverable —
 * the press just behaves as a tap.
 */
export function capturePointer(event: PointerEvent): void {
  try {
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  } catch {
    // no capture; pointermove still arrives while the pointer is over the element
  }
}
