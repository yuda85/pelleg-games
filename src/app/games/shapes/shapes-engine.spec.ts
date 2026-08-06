import {
  BONUS_ROUNDS,
  POLYHEDRA,
  SHAPES_SET_COUNT,
  SHAPES_SET_SIZE,
  SOLIDS,
  buildBonus,
  buildQuestion,
  buildRun,
  kindsForSet,
  type QuestionKind,
} from './shapes-engine';
import type { Rng } from '../../core/hebrew';

function seededRng(seed = 1): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const COUNT_KINDS: QuestionKind[] = ['faces', 'edges', 'vertices'];

describe('solid data', () => {
  it("gives Euler's formula for every polyhedron", () => {
    // F - E + V = 2 holds for any convex polyhedron. If a count is mistyped,
    // this catches it without anyone having to re-count by hand.
    for (const solid of POLYHEDRA) {
      expect(solid.faces! - solid.edges! + solid.vertices!).toBe(2);
    }
  });

  it('leaves the counts unset on every curved solid', () => {
    for (const solid of SOLIDS.filter((s) => s.rolls)) {
      expect(solid.faces).toBeNull();
      expect(solid.edges).toBeNull();
      expect(solid.vertices).toBeNull();
    }
  });

  it('marks exactly the curved solids as rolling', () => {
    const rolling = SOLIDS.filter((s) => s.rolls).map((s) => s.id);
    expect(rolling.sort()).toEqual(['cone', 'cylinder', 'sphere']);
  });

  it('names every solid in Hebrew', () => {
    for (const solid of SOLIDS) expect(solid.name.trim().length).toBeGreaterThan(0);
  });

  it('has a unique id and name per solid', () => {
    expect(new Set(SOLIDS.map((s) => s.id)).size).toBe(SOLIDS.length);
    expect(new Set(SOLIDS.map((s) => s.name)).size).toBe(SOLIDS.length);
  });
});

describe('buildQuestion', () => {
  const many = (kind: QuestionKind, count = 200) => {
    const rng = seededRng(kind.length * 17 + 5);
    return Array.from({ length: count }, () => buildQuestion(kind, rng));
  };

  it('never asks a counting question about a curved solid', () => {
    for (const kind of COUNT_KINDS) {
      for (const q of many(kind)) {
        expect(q.solid.rolls).toBe(false);
        expect(q.solid.faces).not.toBeNull();
      }
    }
  });

  for (const kind of ['name', 'rolls', 'faces', 'edges', 'vertices'] as QuestionKind[]) {
    describe(kind, () => {
      it('always offers the right answer', () => {
        for (const q of many(kind)) expect(q.choices).toContain(q.answer);
      });

      it('never repeats a choice', () => {
        for (const q of many(kind)) expect(new Set(q.choices).size).toBe(q.choices.length);
      });

      it('asks something in Hebrew', () => {
        for (const q of many(kind, 5)) expect(q.prompt.trim().length).toBeGreaterThan(0);
      });
    });
  }

  it('answers a counting question with the solid’s real count', () => {
    for (const kind of COUNT_KINDS) {
      for (const q of many(kind, 60)) {
        expect(q.answer).toBe(String(q.solid[kind]));
      }
    }
  });

  it('offers only positive counts', () => {
    for (const kind of COUNT_KINDS) {
      for (const q of many(kind, 60)) {
        for (const choice of q.choices) expect(Number(choice)).toBeGreaterThan(0);
      }
    }
  });

  it('answers the rolling question from the solid itself', () => {
    for (const q of many('rolls', 80)) {
      expect(q.answer).toBe(q.solid.rolls ? 'כֵּן' : 'לֹא');
    }
  });

  it('offers four names to choose between', () => {
    for (const q of many('name', 40)) expect(q.choices).toHaveLength(4);
  });

  it('is deterministic for a given seed', () => {
    expect(buildQuestion('faces', seededRng(9))).toEqual(buildQuestion('faces', seededRng(9)));
  });
});

describe('buildRun', () => {
  it('builds a full set of questions for every set', () => {
    for (let set = 0; set < SHAPES_SET_COUNT; set++) {
      const run = buildRun(set, seededRng(set + 3));
      expect(run).toHaveLength(SHAPES_SET_SIZE);
      expect(run.map((q) => q.kind)).toEqual([...kindsForSet(set)]);
    }
  });

  it('stops handing out free name questions in the later sets', () => {
    const early = kindsForSet(0).filter((k) => k === 'name').length;
    const late = kindsForSet(SHAPES_SET_COUNT - 1).filter((k) => k === 'name').length;
    expect(late).toBeLessThan(early);
  });
});

describe('buildBonus', () => {
  it('deals the expected number of solids', () => {
    expect(buildBonus(seededRng(2))).toHaveLength(BONUS_ROUNDS);
  });

  it('balances rollers against stackers, so guessing one answer fails', () => {
    for (let seed = 1; seed < 40; seed++) {
      const rounds = buildBonus(seededRng(seed));
      expect(rounds.filter((r) => r.rolls)).toHaveLength(2);
      expect(rounds.filter((r) => !r.rolls)).toHaveLength(2);
    }
  });

  it('labels each round from its own solid', () => {
    for (const round of buildBonus(seededRng(5))) {
      expect(round.rolls).toBe(round.solid.rolls);
    }
  });

  it('never repeats a solid within a round', () => {
    for (let seed = 1; seed < 20; seed++) {
      const ids = buildBonus(seededRng(seed)).map((r) => r.solid.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
