/**
 * Solid-geometry question generator.
 *
 * Pure and dependency-free — no Babylon in here. The 3D view is a renderer for
 * what this file decides, which keeps the questions testable without a canvas.
 */
import { shuffle, type Rng } from '../../core/hebrew';

/** Which Babylon primitive draws this solid. */
export type SolidKind = 'box' | 'cuboid' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'prism';

export interface Solid {
  id: SolidKind;
  name: string;
  /**
   * Face / edge / vertex counts, given only for polyhedra.
   *
   * For curved solids these are genuinely contested — Israeli textbooks
   * variously call a sphere "no faces" or "one curved face", and a cylinder
   * "two faces" or "three". Rather than pick a side and risk contradicting her
   * teacher, curved solids simply never get counting questions. `null` is the
   * honest value, and the generator honours it.
   */
  faces: number | null;
  edges: number | null;
  vertices: number | null;
  /** A solid rolls when some part of its surface is curved. */
  rolls: boolean;
}

export const SOLIDS: readonly Solid[] = [
  { id: 'box', name: 'קֻבִּיָּה', faces: 6, edges: 12, vertices: 8, rolls: false },
  { id: 'cuboid', name: 'תֵּבָה', faces: 6, edges: 12, vertices: 8, rolls: false },
  { id: 'pyramid', name: 'פִּירָמִידָה', faces: 5, edges: 8, vertices: 5, rolls: false },
  { id: 'prism', name: 'מְנסָרָה', faces: 5, edges: 9, vertices: 6, rolls: false },
  { id: 'sphere', name: 'כַּדּוּר', faces: null, edges: null, vertices: null, rolls: true },
  { id: 'cylinder', name: 'גָּלִיל', faces: null, edges: null, vertices: null, rolls: true },
  { id: 'cone', name: 'חָרוּט', faces: null, edges: null, vertices: null, rolls: true },
];

export const POLYHEDRA = SOLIDS.filter((s) => s.faces !== null);

export function solidById(id: SolidKind): Solid {
  return SOLIDS.find((s) => s.id === id) ?? SOLIDS[0];
}

export type QuestionKind = 'name' | 'faces' | 'edges' | 'vertices' | 'rolls';

export interface Question {
  kind: QuestionKind;
  /** The solid on the turntable. */
  solid: Solid;
  prompt: string;
  /** Answer buttons, one of them right. */
  choices: string[];
  answer: string;
}

/** Six questions, then the bonus round. */
export const SHAPES_SET_SIZE = 6;

/**
 * What each set asks about. Later sets drop the giveaway "name it" questions and
 * lean on counting, which is the part that actually needs the rotating model.
 */
const SET_KINDS: readonly (readonly QuestionKind[])[] = [
  ['name', 'name', 'rolls', 'name', 'rolls', 'faces'],
  ['name', 'rolls', 'faces', 'name', 'faces', 'vertices'],
  ['name', 'faces', 'vertices', 'rolls', 'faces', 'edges'],
  ['faces', 'vertices', 'name', 'edges', 'faces', 'vertices'],
  ['faces', 'edges', 'vertices', 'faces', 'edges', 'vertices'],
  ['edges', 'vertices', 'faces', 'edges', 'vertices', 'edges'],
];

export const SHAPES_SET_COUNT = SET_KINDS.length;

export function kindsForSet(setIndex: number): readonly QuestionKind[] {
  return SET_KINDS[setIndex % SET_KINDS.length];
}

const COUNT_LABEL: Readonly<Record<'faces' | 'edges' | 'vertices', string>> = {
  faces: 'פֵּאוֹת',
  edges: 'מִקְצוֹעוֹת',
  vertices: 'קָדְקֳדִים',
};

/** Wrong counts near the right one, so eliminating takes real counting. */
function countChoices(answer: number, rng: Rng): string[] {
  const values = new Set<number>([answer]);
  for (const delta of [1, -1, 2, -2, 3, 4]) {
    if (values.size >= 4) break;
    const value = answer + delta;
    if (value > 0) values.add(value);
  }
  return shuffle([...values], rng).map(String);
}

export function buildQuestion(kind: QuestionKind, rng: Rng = Math.random): Question {
  if (kind === 'name') {
    const solid = shuffle(SOLIDS, rng)[0];
    const others = shuffle(
      SOLIDS.filter((s) => s.id !== solid.id),
      rng,
    ).slice(0, 3);
    return {
      kind,
      solid,
      prompt: 'אֵיזוֹ צוּרָה זֹאת?',
      choices: shuffle([solid, ...others], rng).map((s) => s.name),
      answer: solid.name,
    };
  }

  if (kind === 'rolls') {
    const solid = shuffle(SOLIDS, rng)[0];
    return {
      kind,
      solid,
      prompt: 'הַאִם הַצּוּרָה מִתְגַּלְגֶּלֶת?',
      choices: ['כֵּן', 'לֹא'],
      answer: solid.rolls ? 'כֵּן' : 'לֹא',
    };
  }

  // Counting only ever asks about a polyhedron — see the note on `Solid`.
  const solid = shuffle(POLYHEDRA, rng)[0];
  const answer = solid[kind]!;
  return {
    kind,
    solid,
    prompt: `כַּמָּה ${COUNT_LABEL[kind]} יֵשׁ לַצּוּרָה?`,
    choices: countChoices(answer, rng),
    answer: String(answer),
  };
}

export function buildRun(setIndex: number, rng: Rng = Math.random): Question[] {
  return kindsForSet(setIndex).map((kind) => buildQuestion(kind, rng));
}

// --- bonus: sort the solids by whether they roll ------------------------------

export const BONUS_ROUNDS = 4;

export interface BonusRound {
  solid: Solid;
  rolls: boolean;
}

/**
 * Four solids in a row, each sorted into "rolls" or "doesn't". A different move
 * from the main game: no numbers, just the curved-versus-flat idea that makes
 * the counting questions make sense in the first place.
 */
export function buildBonus(rng: Rng = Math.random): BonusRound[] {
  const rollers = shuffle(
    SOLIDS.filter((s) => s.rolls),
    rng,
  ).slice(0, 2);
  const stackers = shuffle(
    SOLIDS.filter((s) => !s.rolls),
    rng,
  ).slice(0, 2);
  return shuffle([...rollers, ...stackers], rng).map((solid) => ({ solid, rolls: solid.rolls }));
}
