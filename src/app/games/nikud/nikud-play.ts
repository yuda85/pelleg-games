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
import { Audio } from '../../core/sfx';
import { Progress } from '../../core/progress';
import { NIKUD_SET_COUNT, NIKUD_SET_SIZE, wordsForSet } from './nikud-sets';
import { Speech } from '../../core/speech';
import { buildPuzzle, stripMarks } from '../../core/hebrew';
import { starsFor } from '../../core/scoring';
import { stickerForSet } from '../../core/cosmetics';
import { Icon } from '../../shared/icon';
import { Mascot, type Mood } from '../../shared/mascot';
import { Pips } from '../../shared/pips/pips';
import { NikudBoard, type BoardResult } from './nikud-board';
import { Scramble, type ScrambleResult } from './scramble';

type Phase = 'play' | 'reveal' | 'bonus' | 'summary';

interface WordScore {
  wordId: string;
  stars: number;
  coins: number;
}

const COINS_PER_STAR = 5;
/** Paid once when the streak reaches this length, then again on every word. */
const STREAK_THRESHOLD = 3;
const STREAK_BONUS = 10;

/**
 * One run: three easy words, three medium, one hard, then a bonus round.
 *
 * Scoring only ever adds. Stars are recorded as a best-ever per word, coins are
 * banked as they are earned, and a bad run costs nothing that a replay can't
 * win back — the pressure is all upside.
 */
@Component({
  selector: 'pg-nikud-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Mascot, NikudBoard, Scramble, RouterLink, Pips],
  templateUrl: './nikud-play.html',
  styleUrl: './nikud-play.scss',
})
export class NikudPlay {
  private readonly progress = inject(Progress);
  private readonly audio = inject(Audio);
  private readonly speech = inject(Speech);
  private readonly router = inject(Router);

  /** Bound from the route param. */
  readonly setIndex = input(0, { transform: (v: string | number) => Number(v) || 0 });

  protected readonly phase = signal<Phase>('play');
  protected readonly wordIndex = signal(0);
  protected readonly scores = signal<WordScore[]>([]);
  protected readonly streak = signal(0);
  protected readonly bestStreak = signal(0);
  protected readonly lastStars = signal(0);
  protected readonly bonusCoins = signal(0);
  protected readonly justRevealed = signal(false);
  /** Bumped on replay so the tray reshuffles instead of repeating itself. */
  private readonly attempt = signal(0);

  protected readonly words = computed(() => wordsForSet(this.setIndex()));
  protected readonly current = computed(() => this.words()[this.wordIndex()]);
  protected readonly puzzle = computed(() => {
    this.attempt();
    return buildPuzzle(this.current());
  });
  /**
   * The longest word in the set. Unscrambling two letters is not a puzzle, and
   * re-meeting the word they just worked hardest on is the useful repetition.
   */
  protected readonly bonusWord = computed(() =>
    this.words().reduce((longest, word) =>
      stripMarks(word.word).length >= stripMarks(longest.word).length ? word : longest,
    ),
  );

  protected readonly coins = this.progress.coins;
  protected readonly canListen = this.speech.available;
  protected readonly color = this.progress.color;
  protected readonly hat = this.progress.hat;
  protected readonly chill = this.progress.chill;

  protected readonly setSize = NIKUD_SET_SIZE;
  protected readonly hasNextSet = computed(() => this.setIndex() + 1 < NIKUD_SET_COUNT);
  protected readonly sticker = computed(() => stickerForSet('nikud', this.setIndex()));

  /** Words banked so far this run — one filled pip each. */
  protected readonly solvedCount = computed(() => this.scores().length);
  protected readonly starScores = computed(() => this.scores().map((s) => s.stars));
  protected readonly runStars = computed(() => this.scores().reduce((n, s) => n + s.stars, 0));
  protected readonly runCoins = computed(
    () => this.scores().reduce((n, s) => n + s.coins, 0) + this.bonusCoins(),
  );
  protected readonly perfect = computed(() => this.runStars() === NIKUD_SET_SIZE * 3);

  protected readonly mood = computed<Mood>(() => {
    if (this.phase() === 'summary') return this.perfect() ? 'cheer' : 'happy';
    if (this.phase() === 'reveal') return this.lastStars() === 3 ? 'cheer' : 'happy';
    return this.streak() >= STREAK_THRESHOLD ? 'happy' : 'idle';
  });

  protected readonly cheer = computed(() => {
    if (this.lastStars() === 3) {
      const streak = this.streak();
      if (streak >= 5) return 'בִּלְתִּי נִתְפָּס!';
      if (streak >= STREAK_THRESHOLD) return 'רְצִיפוּת מְטֹרֶפֶת!';
      return 'מֻשְׁלָם!';
    }
    return this.lastStars() === 2 ? 'יָפֶה מְאוֹד!' : 'הִצְלַחְתְּ!';
  });

  constructor() {
    // Landing on a different set — by link or by "next set" — starts a fresh run.
    effect(() => {
      this.setIndex();
      this.reset();
    });
  }

  protected onSolved(result: BoardResult): void {
    // A hint hands over the answer, so it caps the word at two stars.
    const stars = Math.min(starsFor(result.mistakes), result.hints > 0 ? 2 : 3);
    const clean = result.mistakes === 0 && result.hints === 0;
    const streak = clean ? this.streak() + 1 : 0;

    this.streak.set(streak);
    this.bestStreak.update((n) => Math.max(n, streak));

    const coins = stars * COINS_PER_STAR + (streak >= STREAK_THRESHOLD ? STREAK_BONUS : 0);
    const wordId = this.current().id;

    this.scores.update((list) => [...list, { wordId, stars, coins }]);
    this.progress.recordWord(wordId, stars, coins);
    this.lastStars.set(stars);

    if (streak >= STREAK_THRESHOLD) this.audio.streak(streak);

    this.phase.set('reveal');
    this.justRevealed.set(true);
    this.speech.say(this.puzzle().vocalized);
  }

  protected next(): void {
    this.justRevealed.set(false);
    this.speech.stop();
    const nextIndex = this.wordIndex() + 1;
    if (nextIndex < this.words().length) {
      this.wordIndex.set(nextIndex);
      this.phase.set('play');
      return;
    }
    this.phase.set('bonus');
  }

  protected onBonusDone(result: ScrambleResult): void {
    // Time left converts to coins, so speed pays without a clock ever punishing.
    const coins = 15 + Math.round(result.secondsLeft * 0.8);
    this.bonusCoins.set(coins);
    this.progress.addCoins(coins);
    this.audio.play('coin');
    this.progress.recordSetStars('nikud', this.setIndex(), this.runStars());
    this.progress.completeSet('nikud', this.setIndex(), this.sticker().id);
    this.phase.set('summary');
  }

  protected replay(): void {
    this.attempt.update((n) => n + 1);
    this.reset();
  }

  protected nextSet(): void {
    // The reset rides on the setIndex effect, so no ordering dance is needed.
    void this.router.navigate(['/nikud', this.setIndex() + 1]);
  }

  protected speak(): void {
    this.speech.say(this.puzzle().vocalized);
  }

  private reset(): void {
    this.speech.stop();
    this.phase.set('play');
    this.wordIndex.set(0);
    this.scores.set([]);
    this.streak.set(0);
    this.bestStreak.set(0);
    this.lastStars.set(0);
    this.bonusCoins.set(0);
    this.justRevealed.set(false);
  }

  protected readonly starSlots = [1, 2, 3];
}
