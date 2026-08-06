import { WORDS_BY_LEVEL } from '../../core/words';
import type { WordEntry } from '../../core/hebrew';

/** Every set is 3 easy, 3 medium, then 1 hard — then a bonus round. */
export const NIKUD_SET_SHAPE = [
  'easy',
  'easy',
  'easy',
  'medium',
  'medium',
  'medium',
  'hard',
] as const;
export const NIKUD_SET_SIZE = NIKUD_SET_SHAPE.length;

/** As many sets as the bank supports without repeating an easy or medium word. */
export const NIKUD_SET_COUNT = Math.min(
  Math.floor(WORDS_BY_LEVEL.easy.length / 3),
  Math.floor(WORDS_BY_LEVEL.medium.length / 3),
  WORDS_BY_LEVEL.hard.length,
);

/**
 * The set a map node plays. Derived from the index rather than stored, so the
 * map stays stable across sessions and adding words never reshuffles old sets.
 */
export function wordsForSet(setIndex: number): WordEntry[] {
  const easy = WORDS_BY_LEVEL.easy;
  const medium = WORDS_BY_LEVEL.medium;
  const hard = WORDS_BY_LEVEL.hard;
  return [
    ...[0, 1, 2].map((i) => easy[(setIndex * 3 + i) % easy.length]),
    ...[0, 1, 2].map((i) => medium[(setIndex * 3 + i) % medium.length]),
    hard[setIndex % hard.length],
  ];
}
