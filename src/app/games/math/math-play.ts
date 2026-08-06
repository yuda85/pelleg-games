import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Progress, type OpTally } from '../../core/progress';
import { Audio } from '../../core/sfx';
import { stickerForSet } from '../../core/cosmetics';
import { starsFor } from '../../core/scoring';
import { Icon } from '../../shared/icon';
import { Mascot, type Mood } from '../../shared/mascot';
import { Pips } from '../../shared/pips/pips';
import { MATH_SET_COUNT, MATH_SET_SIZE, buildRun, type Board } from './math-engine';
import { Stones, type StoneResult } from './stones';
import { Keypad } from './keypad';
import { MissingNumber, type BonusResult } from './missing-number';

type Phase = 'play' | 'boss' | 'reveal' | 'bonus' | 'summary';

const COINS_PER_STAR = 5;
const STREAK_THRESHOLD = 3;
const STREAK_BONUS = 10;

/**
 * One run: six stone questions, a keypad boss, then the missing-number bonus.
 * Scoring only ever adds, exactly as in the nikud game.
 */
@Component({
  selector: 'pg-math-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Mascot, Pips, Stones, Keypad, MissingNumber],
  templateUrl: './math-play.html',
  styleUrl: './math-play.scss',
})
export class MathPlay {
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
  /** Mistakes handed over when the boss surrenders to the stone board. */
  protected readonly carriedMistakes = signal(0);
  /** Bumped on replay so a repeated set is freshly generated. */
  private readonly attempt = signal(0);
  /**
   * The weak-spot weights as they stood when this run began.
   *
   * Reading `progress.opStats()` directly would make the run depend on a signal
   * that `recordOp` writes on every answer — so answering one question would
   * silently regenerate all the questions after it. A run is fixed once dealt.
   */
  private readonly statsAtStart = signal<Record<string, OpTally>>({});

  protected readonly run = computed(() => {
    this.attempt();
    return buildRun(this.setIndex(), this.statsAtStart());
  });

  /**
   * The boss board stays in play after a surrender — the child answers the same
   * question on stones, so `index` past the six stone boards means "the boss".
   */
  protected readonly board = computed<Board>(() => {
    const run = this.run();
    return this.index() >= run.boards.length ? run.boss : run.boards[this.index()];
  });

  protected readonly coins = this.progress.coins;
  protected readonly color = this.progress.color;
  protected readonly hat = this.progress.hat;
  protected readonly chill = this.progress.chill;

  protected readonly setSize = MATH_SET_SIZE;
  protected readonly hasNextSet = computed(() => this.setIndex() + 1 < MATH_SET_COUNT);
  protected readonly sticker = computed(() => stickerForSet('math', this.setIndex()));
  protected readonly runStars = computed(() => this.scores().reduce((n, s) => n + s, 0));
  protected readonly runCoins = computed(
    () => this.scores().reduce((n, s) => n + s * COINS_PER_STAR, 0) + this.bonusCoins(),
  );
  protected readonly perfect = computed(() => this.runStars() === MATH_SET_SIZE * 3);
  protected readonly starSlots = [1, 2, 3];

  protected readonly mood = computed<Mood>(() => {
    if (this.phase() === 'summary') return this.perfect() ? 'cheer' : 'happy';
    if (this.phase() === 'reveal') return this.lastStars() === 3 ? 'cheer' : 'happy';
    return this.streak() >= STREAK_THRESHOLD ? 'happy' : 'idle';
  });

  protected readonly cheer = computed(() => {
    if (this.lastStars() < 3) return this.lastStars() === 2 ? 'יָפֶה מְאוֹד!' : 'הִצְלַחְתְּ!';
    if (this.streak() >= 5) return 'בִּלְתִּי נִתְפָּס!';
    return this.streak() >= STREAK_THRESHOLD ? 'רְצִיפוּת מְטֹרֶפֶת!' : 'מֻשְׁלָם!';
  });

  constructor() {
    // Landing on a different set starts a fresh run.
    effect(() => {
      this.setIndex();
      this.reset();
    });
  }

  protected onSolved(result: StoneResult): void {
    const stars = Math.min(starsFor(result.mistakes), result.hints > 0 ? 2 : 3);
    const clean = result.mistakes === 0 && result.hints === 0;
    const streak = clean ? this.streak() + 1 : 0;

    this.progress.recordOp(this.board().question.op, clean);
    this.streak.set(streak);
    this.bestStreak.update((n) => Math.max(n, streak));

    const coins = stars * COINS_PER_STAR + (streak >= STREAK_THRESHOLD ? STREAK_BONUS : 0);
    this.scores.update((list) => [...list, stars]);
    this.progress.addCoins(coins);
    this.lastStars.set(stars);

    if (streak >= STREAK_THRESHOLD) this.audio.streak(streak);
    this.phase.set('reveal');
  }

  /** Three misses on the boss: fall back to stones, carrying the cost across. */
  protected onSurrender(mistakes: number): void {
    this.carriedMistakes.set(mistakes);
    this.phase.set('play');
  }

  protected next(): void {
    const solved = this.scores().length;
    if (solved >= MATH_SET_SIZE) {
      this.phase.set('bonus');
      return;
    }
    this.carriedMistakes.set(0);
    this.index.set(solved);
    // The last question of a set is the boss, typed rather than chosen.
    this.phase.set(solved === MATH_SET_SIZE - 1 ? 'boss' : 'play');
  }

  protected onBonusDone(result: BonusResult): void {
    const coins = 15 + Math.round(result.secondsLeft * 0.8);
    this.bonusCoins.set(coins);
    this.progress.addCoins(coins);
    this.audio.play('coin');
    this.progress.recordSetStars('math', this.setIndex(), this.runStars());
    this.progress.completeSet('math', this.setIndex(), this.sticker().id);
    this.phase.set('summary');
  }

  protected replay(): void {
    this.attempt.update((n) => n + 1);
    this.reset();
  }

  protected nextSet(): void {
    void this.router.navigate(['/math', this.setIndex() + 1]);
  }

  private reset(): void {
    // Untracked: reset() runs inside the setIndex effect, so a tracked read here
    // would make that effect depend on opStats and re-deal the run on every
    // answer — the exact bug statsAtStart exists to prevent.
    this.statsAtStart.set(untracked(() => this.progress.opStats()));
    this.phase.set('play');
    this.index.set(0);
    this.scores.set([]);
    this.streak.set(0);
    this.bestStreak.set(0);
    this.lastStars.set(0);
    this.bonusCoins.set(0);
    this.carriedMistakes.set(0);
  }
}
