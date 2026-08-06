import {
  BONUS_QUESTIONS,
  OPS,
  TIERS,
  buildBoard,
  buildRun,
  generateQuestion,
  pickOp,
  type Op,
  type Rng,
} from './math-engine';

/** Deterministic stand-in for Math.random so generation is reproducible. */
function seededRng(seed = 1): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** 200 questions is enough to catch a range or invariant slip. */
function sample(tier: number, op: Op, count = 200) {
  const rng = seededRng(tier * 31 + op.length);
  return Array.from({ length: count }, () => generateQuestion(tier, op, 'result', rng));
}

describe('generateQuestion', () => {
  it('defines six tiers', () => {
    expect(TIERS).toHaveLength(6);
  });

  for (let tier = 0; tier < 6; tier++) {
    describe(`tier ${tier + 1}`, () => {
      it('never produces a negative subtraction', () => {
        for (const q of sample(tier, 'sub')) expect(q.answer).toBeGreaterThanOrEqual(0);
      });

      it('divides exactly, every time', () => {
        for (const q of sample(tier, 'div')) {
          expect(q.a % q.b).toBe(0);
          expect(q.answer * q.b).toBe(q.a);
        }
      });

      it('never divides by zero', () => {
        for (const q of sample(tier, 'div')) expect(q.b).toBeGreaterThan(0);
      });

      it('keeps operands inside the tier ranges', () => {
        const spec = TIERS[tier];
        for (const q of sample(tier, 'add')) {
          expect(q.a).toBeGreaterThanOrEqual(spec.add.a.min);
          expect(q.a).toBeLessThanOrEqual(spec.add.a.max);
          expect(q.b).toBeGreaterThanOrEqual(spec.add.b.min);
          expect(q.b).toBeLessThanOrEqual(spec.add.b.max);
          expect(q.answer).toBeLessThanOrEqual(spec.add.maxResult);
        }
      });

      it('computes the answer that matches its operator', () => {
        for (const op of OPS) {
          for (const q of sample(tier, op, 40)) {
            const expected = { add: q.a + q.b, sub: q.a - q.b, mul: q.a * q.b, div: q.a / q.b }[op];
            expect(q.answer).toBe(expected);
          }
        }
      });

      it('uses only the multiplication tables the tier allows', () => {
        const allowed = new Set(TIERS[tier].mul.tables);
        for (const q of sample(tier, 'mul')) expect(allowed.has(q.a)).toBe(true);
      });
    });
  }

  it('honours a no-regrouping tier: no column of an addition carries', () => {
    for (const q of sample(2, 'add')) {
      expect((q.a % 10) + (q.b % 10)).toBeLessThan(10);
    }
  });

  it('honours an always-regrouping tier: every addition carries', () => {
    for (const q of sample(3, 'add')) {
      expect((q.a % 10) + (q.b % 10)).toBeGreaterThanOrEqual(10);
    }
  });

  it('honours a no-borrow tier: no column of a subtraction borrows', () => {
    for (const q of sample(2, 'sub')) expect(q.a % 10).toBeGreaterThanOrEqual(q.b % 10);
  });

  it('is deterministic for a given seed', () => {
    const a = generateQuestion(3, 'mul', 'result', seededRng(9));
    const b = generateQuestion(3, 'mul', 'result', seededRng(9));
    expect(a).toEqual(b);
  });

  it('marks which slot is hidden', () => {
    expect(generateQuestion(0, 'add', 'operand', seededRng()).unknown).toBe('operand');
  });
});

describe('buildBoard', () => {
  const boards = (tier: number, op: Op, count = 120) => {
    const rng = seededRng(tier * 7 + 3);
    return Array.from({ length: count }, () =>
      buildBoard(generateQuestion(tier, op, 'result', rng), tier, rng),
    );
  };

  for (let tier = 0; tier < 6; tier++) {
    for (const op of OPS) {
      describe(`tier ${tier + 1} ${op}`, () => {
        it('always includes the correct answer', () => {
          for (const b of boards(tier, op)) {
            expect(b.stones.some((s) => s.value === b.answer)).toBe(true);
          }
        });

        it('shows as many stones as the tier calls for', () => {
          for (const b of boards(tier, op)) {
            expect(b.stones).toHaveLength(TIERS[tier].stones);
          }
        });

        it('never repeats a value across stones', () => {
          for (const b of boards(tier, op)) {
            expect(new Set(b.stones.map((s) => s.value)).size).toBe(b.stones.length);
          }
        });

        it('never offers a negative stone', () => {
          for (const b of boards(tier, op)) {
            for (const s of b.stones) expect(s.value).toBeGreaterThanOrEqual(0);
          }
        });

        it('traces every wrong stone to a declared error family', () => {
          const families = new Set([
            'adjacent',
            'wrong-op',
            'regroup-slip',
            'reversal',
            'near-miss',
          ]);
          for (const b of boards(tier, op)) {
            for (const s of b.stones) {
              if (s.value === b.answer) expect(s.family).toBe('answer');
              else expect(families.has(s.family)).toBe(true);
            }
          }
        });
      });
    }
  }

  it('hides operand b when the question asks for it', () => {
    const rng = seededRng(4);
    const board = buildBoard(generateQuestion(2, 'mul', 'operand', rng), 2, rng);
    expect(board.answer).toBe(board.question.b);
    expect(board.stones.some((s) => s.value === board.question.b)).toBe(true);
  });

  it('is deterministic for a given seed', () => {
    const one = buildBoard(generateQuestion(1, 'add', 'result', seededRng(5)), 1, seededRng(5));
    const two = buildBoard(generateQuestion(1, 'add', 'result', seededRng(5)), 1, seededRng(5));
    expect(one.stones).toEqual(two.stones);
  });
});

describe('pickOp weak-spot bias', () => {
  const tally = (right: number, wrong: number) => ({ right, wrong });

  it('picks evenly when nothing has been recorded yet', () => {
    const rng = seededRng(2);
    const counts: Record<string, number> = { add: 0, sub: 0, mul: 0, div: 0 };
    for (let i = 0; i < 4000; i++) counts[pickOp({}, rng)]++;
    for (const op of OPS) expect(counts[op]).toBeGreaterThan(700);
  });

  it('leans toward the operation she gets wrong most', () => {
    const stats = {
      add: tally(20, 0),
      sub: tally(20, 0),
      mul: tally(20, 0),
      div: tally(0, 20),
    };
    const rng = seededRng(3);
    const counts: Record<string, number> = { add: 0, sub: 0, mul: 0, div: 0 };
    for (let i = 0; i < 4000; i++) counts[pickOp(stats, rng)]++;
    expect(counts['div']).toBeGreaterThan(counts['add'] * 2);
  });

  it('never starves an operation she has mastered', () => {
    const stats = { div: tally(0, 50) };
    const rng = seededRng(6);
    const counts: Record<string, number> = { add: 0, sub: 0, mul: 0, div: 0 };
    for (let i = 0; i < 4000; i++) counts[pickOp(stats, rng)]++;
    for (const op of OPS) expect(counts[op]).toBeGreaterThan(200);
  });
});

describe('buildRun', () => {
  it('builds six stone boards, one boss and the bonus round', () => {
    const run = buildRun(2, {}, seededRng(8));
    expect(run.boards).toHaveLength(6);
    expect(run.bonus).toHaveLength(BONUS_QUESTIONS);
    expect(run.boss.question.unknown).toBe('result');
  });

  it('hides an operand in every bonus question', () => {
    for (const board of buildRun(1, {}, seededRng(12)).bonus) {
      expect(board.question.unknown).toBe('operand');
    }
  });

  it('keeps every board at the run tier', () => {
    const run = buildRun(4, {}, seededRng(15));
    for (const board of [...run.boards, run.boss, ...run.bonus]) {
      expect(board.stones.length).toBe(TIERS[4].stones);
    }
    expect(run.tier).toBe(4);
  });

  it('is deterministic for a given seed', () => {
    expect(buildRun(0, {}, seededRng(21))).toEqual(buildRun(0, {}, seededRng(21)));
  });
});
