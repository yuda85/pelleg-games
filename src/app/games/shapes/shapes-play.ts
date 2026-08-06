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
import { starsFor } from '../../core/scoring';
import { Icon } from '../../shared/icon';
import { Mascot, type Mood } from '../../shared/mascot';
import { Pips } from '../../shared/pips/pips';
import { SHAPES_SET_COUNT, SHAPES_SET_SIZE, buildBonus, buildRun } from './shapes-engine';
import { ShapeQuestion, type QuestionResult } from './shape-question';
import { RollSort, type BonusResult } from './roll-sort';

type Phase = 'play' | 'reveal' | 'bonus' | 'summary';

const COINS_PER_STAR = 5;
const STREAK_THRESHOLD = 3;
const STREAK_BONUS = 10;

/** One run: six questions about rotating solids, then the roll-or-stack bonus. */
@Component({
  selector: 'pg-shapes-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Mascot, Pips, ShapeQuestion, RollSort],
  templateUrl: './shapes-play.html',
  styleUrl: './shapes-play.scss',
})
export class ShapesPlay {
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
  /** Bumped on replay so a repeated set asks fresh questions. */
  private readonly attempt = signal(0);

  protected readonly run = computed(() => {
    this.attempt();
    return buildRun(this.setIndex());
  });
  protected readonly bonus = computed(() => {
    this.attempt();
    this.setIndex();
    return buildBonus();
  });
  protected readonly question = computed(() => this.run()[this.index()]);

  protected readonly coins = this.progress.coins;
  protected readonly color = this.progress.color;
  protected readonly hat = this.progress.hat;

  protected readonly setSize = SHAPES_SET_SIZE;
  protected readonly hasNextSet = computed(() => this.setIndex() + 1 < SHAPES_SET_COUNT);
  protected readonly sticker = computed(() => stickerForSet('shapes', this.setIndex()));
  protected readonly runStars = computed(() => this.scores().reduce((n, s) => n + s, 0));
  protected readonly runCoins = computed(
    () => this.scores().reduce((n, s) => n + s * COINS_PER_STAR, 0) + this.bonusCoins(),
  );
  protected readonly perfect = computed(() => this.runStars() === SHAPES_SET_SIZE * 3);
  protected readonly starSlots = [1, 2, 3];

  protected readonly mood = computed<Mood>(() => {
    if (this.phase() === 'summary') return this.perfect() ? 'cheer' : 'happy';
    if (this.phase() === 'reveal') return this.lastStars() === 3 ? 'cheer' : 'happy';
    return this.streak() >= STREAK_THRESHOLD ? 'happy' : 'idle';
  });

  protected readonly cheer = computed(() => {
    if (this.lastStars() === 3)
      return this.streak() >= STREAK_THRESHOLD ? 'עַיִן חַדָּה!' : 'מֻשְׁלָם!';
    return this.lastStars() === 2 ? 'יָפֶה מְאוֹד!' : 'הִצְלַחְתְּ!';
  });

  constructor() {
    effect(() => {
      this.setIndex();
      this.reset();
    });
  }

  protected onSolved(result: QuestionResult): void {
    const stars = Math.min(starsFor(result.mistakes), result.hints > 0 ? 2 : 3);
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
    if (solved >= SHAPES_SET_SIZE) {
      this.phase.set('bonus');
      return;
    }
    this.index.set(solved);
    this.phase.set('play');
  }

  protected onBonusDone(result: BonusResult): void {
    const coins = 15 + result.correct * 10;
    this.bonusCoins.set(coins);
    this.progress.addCoins(coins);
    this.audio.play('coin');
    this.progress.recordSetStars('shapes', this.setIndex(), this.runStars());
    this.progress.completeSet('shapes', this.setIndex(), this.sticker().id);
    this.phase.set('summary');
  }

  protected replay(): void {
    this.attempt.update((n) => n + 1);
    this.reset();
  }

  protected nextSet(): void {
    void this.router.navigate(['/shapes', this.setIndex() + 1]);
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
