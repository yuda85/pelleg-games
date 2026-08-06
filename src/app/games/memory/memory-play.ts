import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Progress } from '../../core/progress';
import { Audio } from '../../core/sfx';
import { stickerForSet } from '../../core/cosmetics';
import { Icon } from '../../shared/icon';
import { Mascot, type Mood } from '../../shared/mascot';
import { Pips } from '../../shared/pips/pips';
import {
  MEMORY_SET_COUNT,
  MEMORY_SET_SIZE,
  buildBoard,
  buildVanishRounds,
  starsForBoard,
} from './memory-engine';
import { MemoryBoardView, type BoardResult } from './memory-board';
import { Vanished, type VanishResult } from './vanished';

type Phase = 'play' | 'reveal' | 'bonus' | 'summary';

const COINS_PER_STAR = 5;
const STREAK_THRESHOLD = 2;
const STREAK_BONUS = 10;

/**
 * One run: three grids of growing size, then the vanishing-word bonus.
 *
 * The streak threshold is 2 rather than 3 because a set is only three boards —
 * at 3 it could only ever fire on the last one.
 */
@Component({
  selector: 'pg-memory-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Mascot, Pips, MemoryBoardView, Vanished],
  templateUrl: './memory-play.html',
  styleUrl: './memory-play.scss',
})
export class MemoryPlay {
  private readonly progress = inject(Progress);
  private readonly audio = inject(Audio);
  private readonly router = inject(Router);

  readonly setIndex = input(0, { transform: (v: string | number) => Number(v) || 0 });

  protected readonly phase = signal<Phase>('play');
  protected readonly index = signal(0);
  protected readonly scores = signal<number[]>([]);
  protected readonly streak = signal(0);
  protected readonly bestStreak = signal(0);
  protected readonly lastStars = signal(0);
  protected readonly bonusCoins = signal(0);
  /** Bumped on replay so a repeated set is freshly dealt. */
  private readonly attempt = signal(0);

  protected readonly board = computed(() => {
    this.attempt();
    return buildBoard(this.setIndex(), this.index());
  });

  protected readonly vanishRounds = computed(() => {
    this.attempt();
    this.setIndex();
    return buildVanishRounds();
  });

  protected readonly coins = this.progress.coins;
  protected readonly color = this.progress.color;
  protected readonly hat = this.progress.hat;

  protected readonly setSize = MEMORY_SET_SIZE;
  protected readonly hasNextSet = computed(() => this.setIndex() + 1 < MEMORY_SET_COUNT);
  protected readonly sticker = computed(() => stickerForSet('memory', this.setIndex()));
  protected readonly runStars = computed(() => this.scores().reduce((n, s) => n + s, 0));
  protected readonly runCoins = computed(
    () => this.scores().reduce((n, s) => n + s * COINS_PER_STAR, 0) + this.bonusCoins(),
  );
  protected readonly perfect = computed(() => this.runStars() === MEMORY_SET_SIZE * 3);
  protected readonly starSlots = [1, 2, 3];

  protected readonly mood = computed<Mood>(() => {
    if (this.phase() === 'summary') return this.perfect() ? 'cheer' : 'happy';
    if (this.phase() === 'reveal') return this.lastStars() === 3 ? 'cheer' : 'happy';
    return this.streak() >= STREAK_THRESHOLD ? 'happy' : 'idle';
  });

  protected readonly cheer = computed(() => {
    if (this.lastStars() === 3)
      return this.streak() >= STREAK_THRESHOLD ? 'זִכָּרוֹן בַּרְזֶל!' : 'מֻשְׁלָם!';
    return this.lastStars() === 2 ? 'יָפֶה מְאוֹד!' : 'הִצְלַחְתְּ!';
  });

  constructor() {
    // Landing on a different set starts a fresh run.
    effect(() => {
      this.setIndex();
      this.reset();
    });
  }

  protected onSolved(result: BoardResult): void {
    const stars = Math.min(
      starsForBoard(result.mistakes, this.board().pairs),
      result.hints > 0 ? 2 : 3,
    );
    const clean = result.mistakes === 0 && result.hints === 0;
    const streak = clean ? this.streak() + 1 : 0;

    this.streak.set(streak);
    this.bestStreak.update((n) => Math.max(n, streak));

    const coins = stars * COINS_PER_STAR + (streak >= STREAK_THRESHOLD ? STREAK_BONUS : 0);
    this.scores.update((list) => [...list, stars]);
    this.progress.addCoins(coins);
    this.lastStars.set(stars);

    if (streak >= STREAK_THRESHOLD) this.audio.streak(streak);
    this.phase.set('reveal');
  }

  protected next(): void {
    const solved = this.scores().length;
    if (solved >= MEMORY_SET_SIZE) {
      this.phase.set('bonus');
      return;
    }
    this.index.set(solved);
    this.phase.set('play');
  }

  protected onBonusDone(result: VanishResult): void {
    // Flat per-answer payout: there is no clock here to convert into coins.
    const coins = 15 + result.correct * 10;
    this.bonusCoins.set(coins);
    this.progress.addCoins(coins);
    this.audio.play('coin');
    this.progress.recordSetStars('memory', this.setIndex(), this.runStars());
    this.progress.completeSet('memory', this.setIndex(), this.sticker().id);
    this.phase.set('summary');
  }

  protected replay(): void {
    this.attempt.update((n) => n + 1);
    this.reset();
  }

  protected nextSet(): void {
    void this.router.navigate(['/memory', this.setIndex() + 1]);
  }

  private reset(): void {
    this.phase.set('play');
    this.index.set(0);
    this.scores.set([]);
    this.streak.set(0);
    this.bestStreak.set(0);
    this.lastStars.set(0);
    this.bonusCoins.set(0);
  }
}
