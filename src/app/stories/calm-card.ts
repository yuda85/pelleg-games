import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CALM_TOOLS } from '../core/calm-tools';
import { Reading } from '../core/reading';
import type { CalmBlock } from '../core/story-types';
import { Icon } from '../shared/icon';

/**
 * A calm tool, on the page.
 *
 * Closed until it is opened, skippable at every moment, and finished whenever
 * she says so. There is no timer running her out, no score, no sound, and no
 * claim at the end that she is now calm — the outro says the tool is still
 * there, not that it worked.
 *
 * The one moving part is the shape at the top, and it is driven by CSS so
 * `prefers-reduced-motion` and the reader's own "עֲצִירַת תְּנוּעָה" switch both
 * stop it without this component knowing.
 */
@Component({
  selector: 'pg-calm-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './calm-card.html',
  styleUrl: './calm-card.scss',
})
export class CalmCard {
  readonly block = input.required<CalmBlock>();
  /** The editor's preview opens every tool, so the writer sees what she wrote. */
  readonly openAll = input(false);

  private readonly reading = inject(Reading);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly opened = signal(false);
  protected readonly step = signal(0);
  protected readonly finished = signal(false);
  protected readonly stillMotion = this.reading.stillMotion;

  protected readonly tool = computed(() => CALM_TOOLS[this.block().tool]);

  protected readonly isOpen = computed(() => this.openAll() || this.opened());

  /** The story's words when it supplied any, the tool's otherwise. */
  protected readonly title = computed(() => this.block().title?.trim() || this.tool().name);
  protected readonly intro = computed(() => this.block().intro?.trim() || this.tool().intro);

  protected readonly steps = computed<readonly string[]>(() => {
    const custom = this.block().steps?.filter((line) => line.trim() !== '');
    return custom && custom.length > 0 ? custom : (this.tool().steps ?? []);
  });

  protected readonly options = computed<readonly string[]>(() => {
    const custom = this.block().options?.filter((line) => line.trim() !== '');
    return custom && custom.length > 0 ? custom : (this.tool().options ?? []);
  });

  protected readonly currentStep = computed(() => this.steps()[this.step()] ?? '');

  /* --- `hold`: a length of quiet she sets and stops ---------------------- */

  /** Lengths on offer, or [] for the other modes. */
  protected readonly holds = computed<readonly number[]>(() => this.tool().holds ?? []);
  /** Seconds still to go; -1 before a length has been picked. */
  protected readonly remaining = signal(-1);
  protected readonly chosenHold = signal(0);
  /** 0-1 through the chosen length, for the ring. */
  protected readonly holdProgress = computed(() => {
    const total = this.chosenHold();
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, (total - this.remaining()) / total));
  });
  protected readonly isLastStep = computed(() => this.step() >= this.steps().length - 1);

  /**
   * `breathe` and `pulse` walk their two lines on their own so nobody has to
   * tap in time with their own breathing. Everything else waits for a tap.
   */
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  protected open(): void {
    this.opened.set(true);
    this.step.set(0);
    this.finished.set(false);
    this.remaining.set(-1);
    this.chosenHold.set(0);
    const mode = this.tool().mode;
    if (mode === 'breathe' || mode === 'pulse') this.startTimer(mode === 'breathe' ? 5500 : 3000);
  }

  /** Starts the quiet she asked for. Nothing marks how long she actually held it. */
  protected startHold(seconds: number): void {
    this.stopTimer();
    this.chosenHold.set(seconds);
    this.remaining.set(seconds);
    this.timer = setInterval(() => {
      const left = this.remaining() - 1;
      if (left <= 0) {
        this.remaining.set(0);
        this.done();
      } else {
        this.remaining.set(left);
      }
    }, 1000);
  }

  protected close(): void {
    this.stopTimer();
    this.opened.set(false);
  }

  protected next(): void {
    if (this.isLastStep()) this.done();
    else this.step.update((n) => n + 1);
  }

  protected back(): void {
    this.step.update((n) => Math.max(0, n - 1));
  }

  /** "סיימנו" and "דילוג" land in the same place: the tool closes, nothing is scored. */
  protected done(): void {
    this.stopTimer();
    this.finished.set(true);
  }

  protected again(): void {
    this.open();
  }

  protected toggleMotion(): void {
    this.reading.setStillMotion(!this.stillMotion());
  }

  private startTimer(everyMs: number): void {
    this.stopTimer();
    // A cycle that runs itself, but only while the card is open; nothing here
    // survives leaving the page.
    this.timer = setInterval(() => {
      this.step.update((n) => (n + 1) % Math.max(1, this.steps().length));
    }, everyMs);
  }

  private stopTimer(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
}
