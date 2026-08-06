/**
 * Arithmetic question generator.
 *
 * Pure and dependency-free, like `hebrew.ts`. Every random choice goes through
 * an injected `Rng`, so a seed reproduces a run exactly and the tier invariants
 * can be asserted over hundreds of samples rather than trusted.
 */

import type { OpTally } from '../../core/progress';

export type Op = 'add' | 'sub' | 'mul' | 'div';
export const OPS: readonly Op[] = ['add', 'sub', 'mul', 'div'];

/** Israeli textbooks write division with a colon, not an obelus. */
export const OP_SIGN: Readonly<Record<Op, string>> = {
  add: '+',
  sub: '−',
  mul: '×',
  div: ':',
};

export type Rng = () => number;

export interface Range {
  min: number;
  max: number;
}

/** Whether an addition may carry, or a subtraction borrow. */
export type Regroup = 'never' | 'always' | 'any';

export interface Tier {
  add: { a: Range; b: Range; regroup: Regroup; maxResult: number };
  sub: { a: Range; b: Range; regroup: Regroup };
  mul: { tables: readonly number[]; other: Range };
  div: { tables: readonly number[]; quotient: Range };
  /** How many stones the board shows. */
  stones: 3 | 4;
}

const T = (n: number, m: number): Range => ({ min: n, max: m });

export const TIERS: readonly Tier[] = [
  {
    add: { a: T(1, 10), b: T(1, 10), regroup: 'any', maxResult: 20 },
    sub: { a: T(2, 20), b: T(1, 10), regroup: 'any' },
    mul: { tables: [2, 5, 10], other: T(1, 10) },
    div: { tables: [2, 5, 10], quotient: T(1, 10) },
    stones: 3,
  },
  {
    add: { a: T(1, 25), b: T(1, 25), regroup: 'any', maxResult: 50 },
    sub: { a: T(2, 50), b: T(1, 25), regroup: 'any' },
    mul: { tables: [2, 3, 4, 5, 10], other: T(1, 10) },
    div: { tables: [2, 3, 4, 5, 10], quotient: T(1, 10) },
    stones: 3,
  },
  {
    add: { a: T(11, 80), b: T(11, 80), regroup: 'never', maxResult: 99 },
    sub: { a: T(21, 99), b: T(11, 79), regroup: 'never' },
    mul: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], other: T(1, 10) },
    div: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], quotient: T(1, 10) },
    stones: 4,
  },
  {
    add: { a: T(11, 80), b: T(11, 80), regroup: 'always', maxResult: 99 },
    sub: { a: T(21, 99), b: T(11, 79), regroup: 'always' },
    mul: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], other: T(1, 10) },
    div: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], quotient: T(1, 10) },
    stones: 4,
  },
  {
    add: { a: T(10, 99), b: T(10, 99), regroup: 'any', maxResult: 198 },
    sub: { a: T(100, 999), b: T(10, 99), regroup: 'any' },
    mul: { tables: [11, 12], other: T(2, 9) },
    div: { tables: [2, 3, 4, 5, 6, 7, 8, 9], quotient: T(11, 20) },
    stones: 4,
  },
  {
    add: { a: T(100, 899), b: T(10, 99), regroup: 'any', maxResult: 999 },
    sub: { a: T(100, 999), b: T(100, 899), regroup: 'any' },
    mul: { tables: [2, 3, 4, 5, 6, 7, 8, 9], other: T(11, 99) },
    div: { tables: [2, 3, 4, 5, 6, 7, 8, 9], quotient: T(20, 111) },
    stones: 4,
  },
];

export const MATH_SET_COUNT = TIERS.length;
/** Six stone questions, then the keypad boss. */
export const MATH_SET_SIZE = 7;

export interface Question {
  op: Op;
  a: number;
  b: number;
  answer: number;
  /** 'result' hides the answer; 'operand' hides `b`, for the bonus round. */
  unknown: 'result' | 'operand';
}

function pick(range: Range, rng: Rng): number {
  return range.min + Math.floor(rng() * (range.max - range.min + 1));
}

function pickFrom<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

/** True when adding these two numbers carries in at least one column. */
function carries(a: number, b: number): boolean {
  let carry = 0;
  let x = a;
  let y = b;
  while (x > 0 || y > 0) {
    if ((x % 10) + (y % 10) + carry >= 10) return true;
    carry = 0;
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return false;
}

/** True when subtracting b from a borrows in at least one column. */
function borrows(a: number, b: number): boolean {
  let x = a;
  let y = b;
  while (y > 0) {
    if (x % 10 < y % 10) return true;
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return false;
}

function satisfies(regroup: Regroup, actual: boolean): boolean {
  return regroup === 'any' || (regroup === 'always') === actual;
}

/** Retry cap: past this the tier's ranges simply cannot meet its regroup rule. */
const ATTEMPTS = 200;

export function generateQuestion(
  tierIndex: number,
  op: Op,
  unknown: 'result' | 'operand',
  rng: Rng = Math.random,
): Question {
  const tier = TIERS[tierIndex];
  let a = 0;
  let b = 0;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (op === 'add') {
      a = pick(tier.add.a, rng);
      b = pick(tier.add.b, rng);
      if (a + b > tier.add.maxResult) continue;
      if (!satisfies(tier.add.regroup, carries(a, b))) continue;
    } else if (op === 'sub') {
      a = pick(tier.sub.a, rng);
      b = pick(tier.sub.b, rng);
      if (b > a) continue;
      if (!satisfies(tier.sub.regroup, borrows(a, b))) continue;
    } else if (op === 'mul') {
      a = pickFrom(tier.mul.tables, rng);
      b = pick(tier.mul.other, rng);
    } else {
      // Build the dividend from divisor × quotient, so division is always exact.
      b = pickFrom(tier.div.tables, rng);
      a = b * pick(tier.div.quotient, rng);
    }
    break;
  }

  const answer = { add: a + b, sub: a - b, mul: a * b, div: a / b }[op];
  return { op, a, b, answer, unknown };
}

/**
 * Where a wrong answer comes from. Named rather than random: a distractor that
 * is a plausible slip forces the same work as solving, while an arbitrary number
 * can be eliminated on sight — which is how quiz games stop teaching.
 */
export type ErrorFamily = 'adjacent' | 'wrong-op' | 'regroup-slip' | 'reversal' | 'near-miss';

export interface Stone {
  value: number;
  family: ErrorFamily | 'answer';
}

export interface Board {
  question: Question;
  stones: Stone[];
  /** The value a stone must carry to be correct. */
  answer: number;
}

/** Digit-by-digit sum with the carry dropped — the classic column slip. */
function withoutCarry(a: number, b: number): number {
  let out = 0;
  let place = 1;
  let x = a;
  let y = b;
  while (x > 0 || y > 0) {
    out += (((x % 10) + (y % 10)) % 10) * place;
    place *= 10;
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return out;
}

/** Column-wise absolute difference — subtracting the smaller digit either way. */
function withoutBorrow(a: number, b: number): number {
  let out = 0;
  let place = 1;
  let x = a;
  let y = b;
  while (x > 0 || y > 0) {
    out += Math.abs((x % 10) - (y % 10)) * place;
    place *= 10;
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return out;
}

function reversed(n: number): number {
  return Number([...String(n)].reverse().join(''));
}

/** Candidate wrong answers, best first. Filtered for validity by the caller. */
function candidates(q: Question, answer: number): { value: number; family: ErrorFamily }[] {
  const out: { value: number; family: ErrorFamily }[] = [];

  switch (q.op) {
    case 'mul':
      // Neighbouring multiples of the same table — the commonest table slip.
      out.push({ value: answer + q.a, family: 'adjacent' });
      out.push({ value: answer - q.a, family: 'adjacent' });
      out.push({ value: q.a + q.b, family: 'wrong-op' });
      break;
    case 'div':
      out.push({ value: answer + 1, family: 'adjacent' });
      out.push({ value: answer - 1, family: 'adjacent' });
      out.push({ value: q.a - q.b, family: 'wrong-op' });
      break;
    case 'add':
      out.push({ value: withoutCarry(q.a, q.b), family: 'regroup-slip' });
      out.push({ value: q.a - q.b, family: 'wrong-op' });
      out.push({ value: answer + 10, family: 'adjacent' });
      out.push({ value: answer - 10, family: 'adjacent' });
      break;
    case 'sub':
      out.push({ value: withoutBorrow(q.a, q.b), family: 'regroup-slip' });
      out.push({ value: q.a + q.b, family: 'wrong-op' });
      out.push({ value: answer + 10, family: 'adjacent' });
      out.push({ value: answer - 10, family: 'adjacent' });
      break;
  }

  if (answer >= 10) out.push({ value: reversed(answer), family: 'reversal' });
  // Fillers, so a board can always be completed even when the families collide.
  for (const delta of [1, -1, 2, -2, 3, -3, 20, -20]) {
    out.push({ value: answer + delta, family: 'near-miss' });
  }
  return out;
}

export function buildBoard(question: Question, tierIndex: number, rng: Rng = Math.random): Board {
  const answer = question.unknown === 'operand' ? question.b : question.answer;
  const count = TIERS[tierIndex].stones;

  const stones: Stone[] = [{ value: answer, family: 'answer' }];
  const seen = new Set<number>([answer]);

  for (const candidate of candidates(question, answer)) {
    if (stones.length >= count) break;
    if (candidate.value < 0 || seen.has(candidate.value)) continue;
    seen.add(candidate.value);
    stones.push({ value: candidate.value, family: candidate.family });
  }

  return { question, stones: shuffleStones(stones, rng), answer };
}

function shuffleStones(stones: readonly Stone[], rng: Rng): Stone[] {
  const out = [...stones];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Three missing-number questions make the bonus round. */
export const BONUS_QUESTIONS = 3;

export interface MathRun {
  tier: number;
  /** The six stone questions. */
  boards: Board[];
  /** The seventh: typed on a keypad, not chosen from stones. */
  boss: Board;
  bonus: Board[];
}

/**
 * Chooses an operation, leaning toward whichever she gets wrong most often.
 * The base weight of 1 means a mastered operation still appears regularly —
 * this tilts the mix, it does not replace it. Invisible to the player.
 */
export function pickOp(stats: Record<string, OpTally>, rng: Rng = Math.random): Op {
  const weights = OPS.map((op) => {
    const tally = stats[op];
    const total = tally ? tally.right + tally.wrong : 0;
    const wrongRate = total > 0 ? tally.wrong / total : 0;
    return 1 + 2 * wrongRate;
  });

  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < OPS.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return OPS[i];
  }
  return OPS[OPS.length - 1];
}

export function buildRun(
  tierIndex: number,
  stats: Record<string, OpTally>,
  rng: Rng = Math.random,
): MathRun {
  const board = (unknown: 'result' | 'operand'): Board =>
    buildBoard(generateQuestion(tierIndex, pickOp(stats, rng), unknown, rng), tierIndex, rng);

  return {
    tier: tierIndex,
    boards: Array.from({ length: MATH_SET_SIZE - 1 }, () => board('result')),
    boss: board('result'),
    bonus: Array.from({ length: BONUS_QUESTIONS }, () => board('operand')),
  };
}
