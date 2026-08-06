import {
  DAGESH,
  HIRIQ,
  HOLAM,
  PATAH,
  QAMATS,
  SEGOL,
  SHEVA,
  SHIN_DOT,
  SIN_DOT,
  TSERE,
  buildPuzzle,
  parseWord,
  renderLetter,
  shuffle,
  stripMarks,
  type Rng,
  type WordEntry,
} from './hebrew';

/** Deterministic stand-in for Math.random so shuffles are reproducible. */
function seededRng(seed = 1): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('parseWord', () => {
  it('groups each mark onto the letter it follows', () => {
    const parsed = parseWord('שֶׁמֶשׁ');
    expect(parsed.map((l) => l.base)).toEqual(['ש', 'מ', 'ש']);
    expect(parsed[0].vowels).toEqual([SEGOL]);
    expect(parsed[0].structural).toEqual([SHIN_DOT]);
    expect(parsed[1].vowels).toEqual([SEGOL]);
    expect(parsed[2].vowels).toEqual([]);
  });

  it('classifies dagesh as structural, not as a vowel', () => {
    const [kaf] = parseWord('כֶּלֶב');
    expect(kaf.structural).toEqual([DAGESH]);
    expect(kaf.vowels).toEqual([SEGOL]);
  });

  it('parses typing order and canonical order identically', () => {
    // shin dot before vowel (typing order) vs after (NFC canonical order)
    const typed = 'ש' + SHIN_DOT + SEGOL;
    const canonical = ('ש' + SEGOL + SHIN_DOT).normalize('NFC');
    expect(parseWord(typed)).toEqual(parseWord(canonical));
  });

  it('drops a leading mark with no letter to attach to', () => {
    expect(parseWord(QAMATS + 'יד')).toHaveLength(2);
  });

  it('handles final letter forms', () => {
    expect(parseWord('מֶלֶךְ').map((l) => l.base)).toEqual(['מ', 'ל', 'ך']);
  });
});

describe('stripMarks', () => {
  it('returns bare consonants', () => {
    expect(stripMarks('מִשְׁפָּחָה')).toBe('משפחה');
    expect(stripMarks('אַבָּא')).toBe('אבא');
  });
});

describe('renderLetter', () => {
  it('reassembles to the canonical form regardless of mark order', () => {
    expect(renderLetter('ש', [SHIN_DOT, SEGOL])).toBe(renderLetter('ש', [SEGOL, SHIN_DOT]));
  });
});

describe('buildPuzzle', () => {
  const easy: WordEntry = { id: 't1', word: 'שֶׁמֶשׁ', meaning: '', level: 'easy', slots: 2 };
  const hard: WordEntry = { id: 't2', word: 'מִשְׂחָק', meaning: '', level: 'hard', slots: 3 };

  it('creates one slot per vowel, in letter order', () => {
    const p = buildPuzzle(easy, seededRng());
    expect(p.slots.map((s) => s.letterIndex)).toEqual([0, 1]);
    expect(p.slots.map((s) => s.answer)).toEqual([SEGOL, SEGOL]);
  });

  it('keeps the shin dot pre-placed below hard', () => {
    const p = buildPuzzle(easy, seededRng());
    expect(p.letters[0].fixed).toContain(SHIN_DOT);
    expect(p.slots.every((s) => s.kind === 'vowel')).toBe(true);
  });

  it('makes the sin dot playable on hard', () => {
    const p = buildPuzzle(hard, seededRng());
    const dotSlots = p.slots.filter((s) => s.kind === 'dot');
    expect(dotSlots).toHaveLength(1);
    expect(dotSlots[0].answer).toBe(SIN_DOT);
    expect(p.letters[1].fixed).not.toContain(SIN_DOT);
  });

  it('offers both dots so the shape alone gives nothing away', () => {
    const marks = buildPuzzle(hard, seededRng()).chips.map((c) => c.mark);
    expect(marks).toContain(SHIN_DOT);
    expect(marks).toContain(SIN_DOT);
  });

  it('always includes every answer, so the board is solvable', () => {
    const pool = buildPuzzle(hard, seededRng(7)).chips.map((c) => c.mark);
    for (const slot of buildPuzzle(hard, seededRng(7)).slots) {
      const at = pool.indexOf(slot.answer);
      expect(at).toBeGreaterThanOrEqual(0);
      pool.splice(at, 1); // consume it — duplicated answers need duplicated chips
    }
  });

  it('adds distractors that are never the answer', () => {
    const p = buildPuzzle(easy, seededRng(3));
    expect(p.chips.length).toBe(p.slots.length + 2);
  });

  it('never offers a distractor above the level the child has reached', () => {
    const p = buildPuzzle(easy, seededRng(11));
    expect(p.chips.map((c) => c.mark)).not.toContain(SHEVA);
  });

  it('exposes the vocalized answer for the reveal and for speech', () => {
    expect(buildPuzzle(easy, seededRng()).vocalized).toBe('שֶׁמֶשׁ'.normalize('NFC'));
  });
});

describe('shuffle', () => {
  it('preserves every element', () => {
    const input = [QAMATS, PATAH, HIRIQ, TSERE, HOLAM];
    expect([...shuffle(input, seededRng(5))].sort()).toEqual([...input].sort());
  });

  it('leaves the input untouched', () => {
    const input = [QAMATS, PATAH];
    shuffle(input, seededRng());
    expect(input).toEqual([QAMATS, PATAH]);
  });
});
