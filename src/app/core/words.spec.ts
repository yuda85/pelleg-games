import {
  LEVEL_VOWELS,
  MARK_NAMES,
  SHIN_DOT,
  SIN_DOT,
  buildPuzzle,
  isLetter,
  isStructural,
  isVowel,
  parseWord,
  type Level,
} from './hebrew';
import { WORDS, WORDS_BY_LEVEL } from './words';

/**
 * The word bank is the one place a silent mistake would teach a child something
 * wrong, so every entry is re-derived from its own vocalized string here.
 */
describe('word bank', () => {
  it('has twenty words at each level', () => {
    expect(WORDS_BY_LEVEL.easy).toHaveLength(20);
    expect(WORDS_BY_LEVEL.medium).toHaveLength(20);
    expect(WORDS_BY_LEVEL.hard).toHaveLength(20);
  });

  it('has unique ids', () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
  });

  it('has unique words', () => {
    const bare = WORDS.map((w) => w.word.normalize('NFC'));
    expect(new Set(bare).size).toBe(WORDS.length);
  });

  for (const entry of WORDS) {
    describe(`${entry.id} ${entry.word}`, () => {
      const parsed = parseWord(entry.word);

      it('contains only Hebrew letters and recognised marks', () => {
        for (const ch of entry.word.normalize('NFC')) {
          expect(isLetter(ch) || isVowel(ch) || isStructural(ch)).toBe(true);
        }
      });

      it('carries exactly the declared number of vowels', () => {
        const vowels = parsed.reduce((n, l) => n + l.vowels.length, 0);
        expect(vowels).toBe(entry.slots);
      });

      it('puts at most one vowel on a letter', () => {
        expect(parsed.every((l) => l.vowels.length <= 1)).toBe(true);
      });

      it('gives every ש a shin or sin dot', () => {
        for (const letter of parsed) {
          if (letter.base !== 'ש') continue;
          const dots = letter.structural.filter((m) => m === SHIN_DOT || m === SIN_DOT);
          expect(dots).toHaveLength(1);
        }
      });

      it('uses only vowels introduced at or below its level', () => {
        const allowed = new Set<string>(LEVEL_VOWELS[entry.level]);
        for (const letter of parsed) {
          for (const vowel of letter.vowels) expect(allowed.has(vowel)).toBe(true);
        }
      });

      it('names every mark it uses', () => {
        for (const letter of parsed) {
          for (const mark of [...letter.vowels, ...letter.structural]) {
            if (isStructural(mark) && mark !== SHIN_DOT && mark !== SIN_DOT) continue;
            expect(MARK_NAMES[mark]).toBeTruthy();
          }
        }
      });

      it('builds a solvable board', () => {
        const puzzle = buildPuzzle(entry);
        const pool = puzzle.chips.map((c) => c.mark);
        expect(puzzle.slots.length).toBeGreaterThan(0);
        for (const slot of puzzle.slots) {
          const at = pool.indexOf(slot.answer);
          expect(at).toBeGreaterThanOrEqual(0);
          pool.splice(at, 1);
        }
      });
    });
  }

  const LENGTH_RANGE: Readonly<Record<Level, [number, number]>> = {
    easy: [2, 3],
    medium: [3, 4],
    hard: [3, 5],
  };

  it('keeps words within the letter count its level promises', () => {
    for (const entry of WORDS) {
      const [min, max] = LENGTH_RANGE[entry.level];
      const length = parseWord(entry.word).length;
      expect({ id: entry.id, length }).toEqual({
        id: entry.id,
        length: Math.min(Math.max(length, min), max),
      });
    }
  });

  it('raises the slot count as the level rises', () => {
    expect(Math.max(...WORDS_BY_LEVEL.easy.map((w) => w.slots))).toBeLessThanOrEqual(2);
    expect(Math.min(...WORDS_BY_LEVEL.hard.map((w) => w.slots))).toBeGreaterThanOrEqual(3);
  });

  it('gives every word a Hebrew clue', () => {
    for (const entry of WORDS) expect(entry.meaning.trim().length).toBeGreaterThan(0);
  });
});
