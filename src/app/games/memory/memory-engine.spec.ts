import {
  MEMORY_SET_COUNT,
  MEMORY_SET_SIZE,
  VANISH_ROUNDS,
  buildBoard,
  buildVanishRounds,
  modeForSet,
  pairsForBoard,
  starsForBoard,
} from './memory-engine';
import type { Rng } from '../../core/hebrew';

function seededRng(seed = 1): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('buildBoard', () => {
  for (let set = 0; set < MEMORY_SET_COUNT; set++) {
    for (let board = 0; board < MEMORY_SET_SIZE; board++) {
      describe(`set ${set + 1} board ${board + 1} (${modeForSet(set)})`, () => {
        const made = buildBoard(set, board, seededRng(set * 13 + board));

        it('deals two cards per pair', () => {
          expect(made.cards).toHaveLength(made.pairs * 2);
        });

        it('deals the number of pairs the tier asks for', () => {
          expect(made.pairs).toBe(pairsForBoard(set, board));
        });

        it('gives every pairId exactly two cards', () => {
          const counts = new Map<string, number>();
          for (const card of made.cards) {
            counts.set(card.pairId, (counts.get(card.pairId) ?? 0) + 1);
          }
          expect([...counts.values()].every((n) => n === 2)).toBe(true);
        });

        it('never repeats a face, so a board has one defensible answer', () => {
          const texts = made.cards.map((c) => c.text);
          expect(new Set(texts).size).toBe(texts.length);
        });

        it('gives every card non-empty text', () => {
          for (const card of made.cards) expect(card.text.trim().length).toBeGreaterThan(0);
        });

        it('gives every card a unique id', () => {
          expect(new Set(made.cards.map((c) => c.id)).size).toBe(made.cards.length);
        });
      });
    }
  }

  it('pairs a bare word with its vocalized form in nikud mode', () => {
    const board = buildBoard(0, 0, seededRng(4));
    const first = board.cards[0];
    const partner = board.cards.find((c) => c.pairId === first.pairId && c.id !== first.id)!;
    expect(new Set([first.face, partner.face])).toEqual(new Set(['bare', 'vocalized']));
  });

  it('pairs a word with its clue in clue mode', () => {
    const board = buildBoard(1, 0, seededRng(4));
    const first = board.cards[0];
    const partner = board.cards.find((c) => c.pairId === first.pairId && c.id !== first.id)!;
    expect(new Set([first.face, partner.face])).toEqual(new Set(['vocalized', 'clue']));
  });

  it('draws on both pairings in a mixed set', () => {
    const faces = new Set(buildBoard(2, 2, seededRng(9)).cards.map((c) => c.face));
    expect(faces.has('bare')).toBe(true);
    expect(faces.has('clue')).toBe(true);
  });

  it('is deterministic for a given seed', () => {
    expect(buildBoard(3, 1, seededRng(21))).toEqual(buildBoard(3, 1, seededRng(21)));
  });

  /**
   * The per-board checks above use one seed each. Uniqueness has to hold for
   * every deal, not the lucky one — especially on mixed boards, where the two
   * halves are picked in separate passes and could otherwise collide.
   */
  it('keeps faces and words unique across a hundred deals of every board', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (let set = 0; set < MEMORY_SET_COUNT; set++) {
        for (let board = 0; board < MEMORY_SET_SIZE; board++) {
          const made = buildBoard(set, board, seededRng(seed * 97 + set * 7 + board));
          const texts = made.cards.map((c) => c.text);
          expect(new Set(texts).size).toBe(texts.length);
          expect(new Set(made.cards.map((c) => c.pairId)).size).toBe(made.pairs);
          expect(made.pairs).toBe(pairsForBoard(set, board));
        }
      }
    }
  });

  it('grows the board as the sets go on', () => {
    expect(pairsForBoard(0, 0)).toBeLessThan(pairsForBoard(MEMORY_SET_COUNT - 1, 0));
  });

  it('never deals a board bigger than twenty cards', () => {
    for (let set = 0; set < MEMORY_SET_COUNT; set++) {
      for (let board = 0; board < MEMORY_SET_SIZE; board++) {
        expect(buildBoard(set, board, seededRng(1)).cards.length).toBeLessThanOrEqual(20);
      }
    }
  });
});

describe('starsForBoard', () => {
  it('rewards a clean game with three stars', () => {
    expect(starsForBoard(0, 6)).toBe(3);
  });

  it('scales its thresholds with the board size', () => {
    // Five wrong flips is a good game on ten pairs and a poor one on four.
    expect(starsForBoard(5, 10)).toBe(3);
    expect(starsForBoard(5, 4)).toBe(2);
  });

  it('never drops below one star', () => {
    expect(starsForBoard(99, 4)).toBe(1);
  });
});

describe('buildVanishRound', () => {
  it('builds the expected number of rounds', () => {
    expect(buildVanishRounds(seededRng(2))).toHaveLength(VANISH_ROUNDS);
  });

  it('takes away one of the words it showed', () => {
    for (const round of buildVanishRounds(seededRng(7))) {
      expect(round.shown).toContain(round.missing);
    }
  });

  it('shows five distinct words', () => {
    for (const round of buildVanishRounds(seededRng(8))) {
      expect(round.shown).toHaveLength(5);
      expect(new Set(round.shown).size).toBe(5);
    }
  });
});
