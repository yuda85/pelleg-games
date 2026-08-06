import { Injectable, computed, effect, signal } from '@angular/core';
import { migrate } from './migrate';

const STORAGE_KEY = 'pelegames.progress.v2';
const LEGACY_KEY = 'pelegames.progress.v1';

export type GameId = 'nikud' | 'math' | 'memory' | 'shapes';
export type OpId = 'add' | 'sub' | 'mul' | 'div';

export interface OpTally {
  right: number;
  wrong: number;
}

export interface SaveState {
  version: 2;
  coins: number;
  /** Best stars per word. Nikud-only; kept for a future "replay what you missed". */
  stars: Record<string, number>;
  /** Best stars per set, keyed `${game}:${index}`. This is what the maps show. */
  setStars: Record<string, number>;
  setsDone: Record<GameId, number>;
  opStats: Record<string, OpTally>;
  stickers: string[];
  owned: string[];
  hat: string | null;
  color: string;
  /** What the doll is wearing, keyed by slot. Purely cosmetic. */
  outfit: Record<string, string>;
  soundOn: boolean;
  speechOn: boolean;
  /** Chill mode drops the countdown from bonus rounds entirely. */
  chill: boolean;
}

const DEFAULT_STATE: SaveState = {
  version: 2,
  coins: 0,
  stars: {},
  setStars: {},
  setsDone: { nikud: 0, math: 0, memory: 0, shapes: 0 },
  opStats: {},
  stickers: [],
  owned: [],
  hat: null,
  color: 'aqua',
  outfit: {},
  soundOn: true,
  speechOn: true,
  chill: false,
};

@Injectable({ providedIn: 'root' })
export class Progress {
  private readonly state = signal<SaveState>(load());

  readonly coins = computed(() => this.state().coins);
  readonly stickers = computed(() => this.state().stickers);
  readonly owned = computed(() => this.state().owned);
  readonly hat = computed(() => this.state().hat);
  readonly color = computed(() => this.state().color);
  readonly soundOn = computed(() => this.state().soundOn);
  readonly speechOn = computed(() => this.state().speechOn);
  readonly chill = computed(() => this.state().chill);
  readonly opStats = computed(() => this.state().opStats);

  /** Stars banked across every game — what the hub shows. */
  readonly totalStars = computed(() =>
    Object.values(this.state().setStars).reduce((sum, n) => sum + n, 0),
  );

  constructor() {
    effect(() => save(this.state()));
  }

  setsDoneFor(game: GameId): number {
    return this.state().setsDone[game] ?? 0;
  }

  isSetUnlocked(game: GameId, setIndex: number): boolean {
    return setIndex <= this.setsDoneFor(game);
  }

  /** Best run for a set node on the map, 0 if never played. */
  starsForSet(game: GameId, setIndex: number): number {
    return this.state().setStars[`${game}:${setIndex}`] ?? 0;
  }

  /** Scores only ever go up, so a bad replay costs nothing. */
  recordSetStars(game: GameId, setIndex: number, stars: number): void {
    const key = `${game}:${setIndex}`;
    this.state.update((s) => ({
      ...s,
      setStars: { ...s.setStars, [key]: Math.max(s.setStars[key] ?? 0, stars) },
    }));
  }

  starsForWord(wordId: string): number {
    return this.state().stars[wordId] ?? 0;
  }

  recordWord(wordId: string, stars: number, coins: number): void {
    this.state.update((s) => ({
      ...s,
      coins: s.coins + coins,
      stars: { ...s.stars, [wordId]: Math.max(s.stars[wordId] ?? 0, stars) },
    }));
  }

  /** Feeds the weak-spot bias in the maths generator. */
  recordOp(op: OpId, correct: boolean): void {
    this.state.update((s) => {
      const tally = s.opStats[op] ?? { right: 0, wrong: 0 };
      const next: OpTally = correct
        ? { ...tally, right: tally.right + 1 }
        : { ...tally, wrong: tally.wrong + 1 };
      return { ...s, opStats: { ...s.opStats, [op]: next } };
    });
  }

  addCoins(amount: number): void {
    this.state.update((s) => ({ ...s, coins: s.coins + amount }));
  }

  completeSet(game: GameId, setIndex: number, stickerId: string): void {
    this.state.update((s) => ({
      ...s,
      setsDone: { ...s.setsDone, [game]: Math.max(s.setsDone[game] ?? 0, setIndex + 1) },
      stickers: s.stickers.includes(stickerId) ? s.stickers : [...s.stickers, stickerId],
    }));
  }

  /** Returns false when there aren't enough coins, so the caller can react. */
  buy(itemId: string, price: number): boolean {
    const s = this.state();
    if (s.owned.includes(itemId) || s.coins < price) return false;
    this.state.set({ ...s, coins: s.coins - price, owned: [...s.owned, itemId] });
    return true;
  }

  /** What the doll is wearing in a slot, or '' for nothing. */
  wearing(slot: string): string {
    return this.state().outfit[slot] ?? '';
  }

  /** Dressing is free once owned; tapping the worn item again takes it off. */
  wear(slot: string, itemId: string): void {
    this.state.update((s) => ({
      ...s,
      outfit: { ...s.outfit, [slot]: s.outfit[slot] === itemId ? '' : itemId },
    }));
  }

  equipHat(hatId: string | null): void {
    this.state.update((s) => ({ ...s, hat: hatId }));
  }

  equipColor(colorId: string): void {
    this.state.update((s) => ({ ...s, color: colorId }));
  }

  toggle(key: 'soundOn' | 'speechOn' | 'chill'): void {
    this.state.update((s) => ({ ...s, [key]: !s[key] }));
  }

  reset(): void {
    this.state.set({ ...DEFAULT_STATE, setsDone: { nikud: 0, math: 0, memory: 0, shapes: 0 } });
  }
}

function load(): SaveState {
  try {
    const v2 = localStorage.getItem(STORAGE_KEY);
    if (v2) return migrate(JSON.parse(v2), DEFAULT_STATE);
    const v1 = localStorage.getItem(LEGACY_KEY);
    if (v1) return migrate(JSON.parse(v1), DEFAULT_STATE);
    return { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function save(state: SaveState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing or a full quota — the game still plays, it just forgets.
  }
}
