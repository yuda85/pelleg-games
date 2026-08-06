/**
 * Hebrew vocalization (nikud) engine.
 *
 * A word is authored once, fully vocalized, as a plain string — that string is
 * the single source of truth. Everything the game needs (bare letters, which
 * letters carry a vowel, which vowel, the distractor pool) is derived from it,
 * so the data can never disagree with itself.
 *
 * Marks split into two classes:
 *   vowels     — the thing being taught. Stripped out and dropped back in by the player.
 *   structural — dagesh, shin/sin dot, meteg. Pre-placed, except on `hard`
 *                where the shin/sin dot becomes playable too (that distinction
 *                is exactly what third/fourth graders get wrong).
 */

/** Hebrew consonants, including final forms. */
const LETTER_RE = /[א-ת]/;

// --- Vowel marks ------------------------------------------------------------
export const SHEVA = 'ְ';
export const HATAF_SEGOL = 'ֱ';
export const HATAF_PATAH = 'ֲ';
export const HATAF_QAMATS = 'ֳ';
export const HIRIQ = 'ִ';
export const TSERE = 'ֵ';
export const SEGOL = 'ֶ';
export const PATAH = 'ַ';
export const QAMATS = 'ָ';
export const HOLAM = 'ֹ';
export const QUBUTS = 'ֻ';

// --- Structural marks -------------------------------------------------------
export const DAGESH = 'ּ';
export const METEG = 'ֽ';
export const SHIN_DOT = 'ׁ';
export const SIN_DOT = 'ׂ';

export const VOWELS = [
  SHEVA,
  HATAF_SEGOL,
  HATAF_PATAH,
  HATAF_QAMATS,
  HIRIQ,
  TSERE,
  SEGOL,
  PATAH,
  QAMATS,
  HOLAM,
  QUBUTS,
] as const;

export const STRUCTURAL = [DAGESH, METEG, SHIN_DOT, SIN_DOT] as const;

export type Vowel = (typeof VOWELS)[number];
export type Structural = (typeof STRUCTURAL)[number];
/** Anything the player can pick up and place. */
export type Mark = Vowel | typeof SHIN_DOT | typeof SIN_DOT;

const VOWEL_SET: ReadonlySet<string> = new Set(VOWELS);
const STRUCTURAL_SET: ReadonlySet<string> = new Set(STRUCTURAL);

/** Hebrew names, shown on the chip and spoken by the hint. */
export const MARK_NAMES: Readonly<Record<string, string>> = {
  [SHEVA]: 'שְׁוָא',
  [HATAF_SEGOL]: 'חֲטַף סֶגוֹל',
  [HATAF_PATAH]: 'חֲטַף פַּתָּח',
  [HATAF_QAMATS]: 'חֲטַף קָמָץ',
  [HIRIQ]: 'חִירִיק',
  [TSERE]: 'צֵירֵה',
  [SEGOL]: 'סֶגוֹל',
  [PATAH]: 'פַּתָּח',
  [QAMATS]: 'קָמָץ',
  [HOLAM]: 'חוֹלָם',
  [QUBUTS]: 'קֻבּוּץ',
  [SHIN_DOT]: 'נְקֻדַּת שִׁי"ן',
  [SIN_DOT]: 'נְקֻדַּת שִׂי"ן',
};

/**
 * Vowels a level is allowed to draw distractors from. A distractor the child
 * has never met is noise, not a challenge — so the pool grows with the level.
 */
export const LEVEL_VOWELS: Readonly<Record<Level, readonly Vowel[]>> = {
  easy: [QAMATS, PATAH, SEGOL, HIRIQ, TSERE, HOLAM],
  medium: [QAMATS, PATAH, SEGOL, HIRIQ, TSERE, HOLAM, SHEVA],
  hard: [
    QAMATS,
    PATAH,
    SEGOL,
    HIRIQ,
    TSERE,
    HOLAM,
    SHEVA,
    QUBUTS,
    HATAF_PATAH,
    HATAF_SEGOL,
    HATAF_QAMATS,
  ],
};

export type Level = 'easy' | 'medium' | 'hard';

/**
 * Extra wrong chips added to the tray, by level. Easy words often have a single
 * slot, so one distractor would make it a coin flip — two is the floor.
 */
const DISTRACTORS: Readonly<Record<Level, number>> = { easy: 2, medium: 3, hard: 3 };

export function isLetter(ch: string): boolean {
  return LETTER_RE.test(ch);
}

export function isVowel(ch: string): boolean {
  return VOWEL_SET.has(ch);
}

export function isStructural(ch: string): boolean {
  return STRUCTURAL_SET.has(ch);
}

/** One consonant plus every mark authored on it. */
export interface ParsedLetter {
  base: string;
  vowels: string[];
  structural: string[];
}

/**
 * Split a vocalized word into letters and their marks.
 *
 * Mark order inside a letter is deliberately not trusted: NFC canonical
 * ordering puts the vowel before the dagesh before the shin dot, but hand-typed
 * Hebrew routinely arrives in the order the keys were pressed. Grouping by
 * base letter and classifying each mark makes both spellings parse the same.
 */
export function parseWord(word: string): ParsedLetter[] {
  const out: ParsedLetter[] = [];
  for (const ch of word.normalize('NFC')) {
    if (isLetter(ch)) {
      out.push({ base: ch, vowels: [], structural: [] });
      continue;
    }
    const current = out.at(-1);
    if (!current) continue; // a mark before any letter is malformed — drop it
    if (isVowel(ch)) current.vowels.push(ch);
    else if (isStructural(ch)) current.structural.push(ch);
  }
  return out;
}

/**
 * Rebuild a letter as displayable text. NFC re-sorts the marks into canonical
 * combining-class order, which is what fonts position correctly.
 */
export function renderLetter(base: string, marks: readonly string[]): string {
  return (base + marks.join('')).normalize('NFC');
}

/** The bare consonants, no marks at all. */
export function stripMarks(word: string): string {
  return parseWord(word)
    .map((l) => l.base)
    .join('');
}

// --- Puzzle model -----------------------------------------------------------

export type SlotKind = 'vowel' | 'dot';

/** A gap under (or over) a letter, waiting for the right mark. */
export interface Slot {
  id: string;
  letterIndex: number;
  kind: SlotKind;
  answer: Mark;
}

/** A draggable mark in the tray. */
export interface Chip {
  id: string;
  mark: Mark;
  kind: SlotKind;
}

/** A letter as the board shows it: base plus whatever stays pre-placed. */
export interface BoardLetter {
  index: number;
  base: string;
  /** Marks already on the letter and not playable (dagesh, and the dot below hard). */
  fixed: string[];
}

export interface Puzzle {
  wordId: string;
  /** Fully vocalized answer, for the reveal and for text-to-speech. */
  vocalized: string;
  meaning: string;
  level: Level;
  letters: BoardLetter[];
  slots: Slot[];
  chips: Chip[];
}

/** Injectable randomness keeps puzzle generation deterministic under test. */
export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface WordEntry {
  id: string;
  /** Fully vocalized. The one authored field everything else derives from. */
  word: string;
  meaning: string;
  level: Level;
  /** Expected vowel-slot count — a cross-check that catches nikud typos. */
  slots: number;
}

/**
 * Turn a word entry into a playable board.
 *
 * On `hard`, a shin/sin dot is lifted out of `fixed` and becomes its own slot
 * above the letter, so שׂ vs שׁ has to be decided rather than read off.
 */
export function buildPuzzle(entry: WordEntry, rng: Rng = Math.random): Puzzle {
  const parsed = parseWord(entry.word);
  const playableDots = entry.level === 'hard';

  const letters: BoardLetter[] = [];
  const slots: Slot[] = [];

  parsed.forEach((letter, index) => {
    const fixed: string[] = [];

    for (const mark of letter.structural) {
      const isDot = mark === SHIN_DOT || mark === SIN_DOT;
      if (isDot && playableDots) {
        slots.push({ id: `s${index}-dot`, letterIndex: index, kind: 'dot', answer: mark as Mark });
      } else {
        fixed.push(mark);
      }
    }

    // A letter carries at most one vowel in practice; extras stay pre-placed
    // rather than producing an unsolvable second slot on the same letter.
    const [vowel, ...extraVowels] = letter.vowels;
    if (vowel) {
      slots.push({ id: `s${index}-v`, letterIndex: index, kind: 'vowel', answer: vowel as Mark });
    }
    fixed.push(...extraVowels);

    letters.push({ index, base: letter.base, fixed });
  });

  const chips = buildChips(slots, entry.level, rng);

  return {
    wordId: entry.id,
    vocalized: entry.word.normalize('NFC'),
    meaning: entry.meaning,
    level: entry.level,
    letters,
    slots,
    chips,
  };
}

/**
 * Tray contents: every answer exactly once, plus wrong-but-plausible extras.
 * The answers are always present, so the board is always solvable.
 */
function buildChips(slots: readonly Slot[], level: Level, rng: Rng): Chip[] {
  const marks: Mark[] = slots.map((s) => s.answer);

  const vowelSlots = slots.filter((s) => s.kind === 'vowel');
  if (vowelSlots.length > 0) {
    const answers = new Set(vowelSlots.map((s) => s.answer as string));
    const candidates = LEVEL_VOWELS[level].filter((v) => !answers.has(v));
    marks.push(...shuffle(candidates, rng).slice(0, DISTRACTORS[level]));
  }

  // A lone dot slot would give the answer away, so both dots always appear.
  if (slots.some((s) => s.kind === 'dot')) {
    const dots = new Set(slots.filter((s) => s.kind === 'dot').map((s) => s.answer as string));
    for (const dot of [SHIN_DOT, SIN_DOT] as const) {
      if (!dots.has(dot)) marks.push(dot);
    }
  }

  return shuffle(marks, rng).map((mark, i) => ({
    id: `c${i}`,
    mark,
    kind: mark === SHIN_DOT || mark === SIN_DOT ? 'dot' : 'vowel',
  }));
}
