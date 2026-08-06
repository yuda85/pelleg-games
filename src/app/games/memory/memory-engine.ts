/**
 * Word-memory board generator.
 *
 * Pure and dependency-free, like `hebrew.ts` and `math-engine.ts`. Every random
 * choice goes through an injected `Rng`, so a seed reproduces a board exactly.
 *
 * The pairs are deliberately **not** two copies of the same card. Matching a
 * thing to its identical twin teaches nothing; matching a bare word to its
 * vocalized form, or a word to its meaning, makes the recall itself the lesson.
 * Both modes read the already-verified word bank, so this game adds no new
 * content and carries no new risk of teaching something wrong.
 */
import { shuffle, stripMarks, type Rng, type WordEntry } from '../../core/hebrew';
import { WORDS } from '../../core/words';

/** What the two faces of a pair are. */
export type PairMode = 'nikud' | 'clue';

export type CardFace = 'bare' | 'vocalized' | 'clue';

export interface Card {
  id: string;
  /** Two cards match when their pairId matches. */
  pairId: string;
  text: string;
  face: CardFace;
}

export interface MemoryBoard {
  /** How many pairs are on the board — half the card count. */
  pairs: number;
  cards: Card[];
}

/** Pairs per board, for the three boards of each set. */
export const MEMORY_TIERS: readonly (readonly number[])[] = [
  [4, 5, 6],
  [5, 6, 7],
  [6, 7, 8],
  [7, 8, 9],
  [8, 9, 10],
  [8, 10, 10],
];

export const MEMORY_SET_COUNT = MEMORY_TIERS.length;
/** Three boards, then the bonus round. */
export const MEMORY_SET_SIZE = 3;

/**
 * Which pairing a set uses. Cycling keeps the game from settling into one
 * groove; `mixed` sets draw both kinds onto the same board.
 */
const SET_MODES: readonly ('nikud' | 'clue' | 'mixed')[] = [
  'nikud',
  'clue',
  'mixed',
  'nikud',
  'clue',
  'mixed',
];

export function modeForSet(setIndex: number): 'nikud' | 'clue' | 'mixed' {
  return SET_MODES[setIndex % SET_MODES.length];
}

export function pairsForBoard(setIndex: number, boardIndex: number): number {
  return MEMORY_TIERS[setIndex % MEMORY_TIERS.length][boardIndex];
}

/** The two faces a word shows in a given mode. */
function facesFor(entry: WordEntry, mode: PairMode): [Card, Card] {
  const vocalized = entry.word.normalize('NFC');
  if (mode === 'nikud') {
    return [
      { id: `${entry.id}-a`, pairId: entry.id, text: stripMarks(entry.word), face: 'bare' },
      { id: `${entry.id}-b`, pairId: entry.id, text: vocalized, face: 'vocalized' },
    ];
  }
  return [
    { id: `${entry.id}-a`, pairId: entry.id, text: vocalized, face: 'vocalized' },
    { id: `${entry.id}-b`, pairId: entry.id, text: entry.meaning, face: 'clue' },
  ];
}

/**
 * Picks words whose faces are all distinct.
 *
 * Two words that render the same face — the same bare letters, say — would make
 * a board with two defensible answers, which reads to a child as the game being
 * broken.
 */
function pickWords(
  count: number,
  mode: PairMode,
  rng: Rng,
  taken: { faces: Set<string>; ids: Set<string> },
): WordEntry[] {
  const chosen: WordEntry[] = [];

  for (const entry of shuffle(WORDS, rng)) {
    if (chosen.length >= count) break;
    if (taken.ids.has(entry.id)) continue;
    const [a, b] = facesFor(entry, mode);
    if (taken.faces.has(a.text) || taken.faces.has(b.text)) continue;
    taken.faces.add(a.text);
    taken.faces.add(b.text);
    taken.ids.add(entry.id);
    chosen.push(entry);
  }
  return chosen;
}

export function buildBoard(
  setIndex: number,
  boardIndex: number,
  rng: Rng = Math.random,
): MemoryBoard {
  const pairs = pairsForBoard(setIndex, boardIndex);
  const setMode = modeForSet(setIndex);

  // Shared across both halves of a mixed board: a face repeated between the
  // nikud half and the clue half would be just as ambiguous as one repeated
  // inside a half, and a word must not appear twice on the same board at all.
  const taken = { faces: new Set<string>(), ids: new Set<string>() };

  const cards: Card[] = [];
  if (setMode === 'mixed') {
    const nikudPairs = Math.ceil(pairs / 2);
    for (const entry of pickWords(nikudPairs, 'nikud', rng, taken)) {
      cards.push(...facesFor(entry, 'nikud'));
    }
    for (const entry of pickWords(pairs - nikudPairs, 'clue', rng, taken)) {
      cards.push(...facesFor(entry, 'clue'));
    }
  } else {
    for (const entry of pickWords(pairs, setMode, rng, taken)) {
      cards.push(...facesFor(entry, setMode));
    }
  }

  return { pairs: cards.length / 2, cards: shuffle(cards, rng) };
}

/**
 * Stars for one board. The thresholds scale with the board: a ten-pair grid
 * costs more wrong flips than a four-pair one no matter how good the child is,
 * so a fixed threshold would hand out one star for a good game on a big board.
 */
export function starsForBoard(mistakes: number, pairs: number): 1 | 2 | 3 {
  if (mistakes <= Math.ceil(pairs / 2)) return 3;
  if (mistakes <= pairs + 1) return 2;
  return 1;
}

// --- bonus round: "what vanished?" ------------------------------------------

export interface VanishRound {
  /** Shown to the player first, all together. */
  shown: string[];
  /** The one taken away. */
  missing: string;
}

export const VANISH_ROUNDS = 3;
const VANISH_SHOWN = 5;

/**
 * A different memory muscle from the grid: hold a short list, notice what left.
 * Uses vocalized words, so it doubles as reading practice.
 */
export function buildVanishRound(rng: Rng = Math.random): VanishRound {
  const words = shuffle(WORDS, rng)
    .slice(0, VANISH_SHOWN)
    .map((w) => w.word.normalize('NFC'));
  const missing = words[Math.floor(rng() * words.length)];
  return { shown: words, missing };
}

export function buildVanishRounds(rng: Rng = Math.random): VanishRound[] {
  return Array.from({ length: VANISH_ROUNDS }, () => buildVanishRound(rng));
}
