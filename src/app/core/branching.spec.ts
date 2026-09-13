import {
  blocksFromText,
  marksInStory,
  parseImport,
  storyBranches,
  textFromBlocks,
  visibleBlocks,
  wordCountFor,
  type ActivityBlock,
  type Block,
  type CalmBlock,
  type ImageBlock,
  type Story,
} from './story-types';

function textOf(blocks: readonly Block[]): string[] {
  return blocks.map((block) => (block as { text?: string }).text ?? `<${block.kind}>`);
}

const FORK: ActivityBlock = {
  id: 'fork',
  kind: 'activity',
  activity: 'choice',
  title: 'מה עכשיו?',
  instructions: 'בוחרים.',
  options: [
    { text: 'לענות', sets: 'ענתה' },
    { text: 'לחכות', sets: 'חיכתה' },
    { text: 'משהו אחר' },
  ],
};

function storyWith(blocks: Block[]): Story {
  return {
    id: 's',
    title: 'סיפור',
    blurb: '',
    tags: [],
    chapters: [{ id: 'c1', title: 'פרק', order: 0, blocks }],
  };
}

describe('conditional runs in the paste box', () => {
  it('marks only the blocks inside an [[אם]] run', () => {
    const blocks = blocksFromText('פתיחה.\n\n[[אם: ענתה]]\n\nרק אחרי.\n\n[[סוף]]\n\nסיום.');
    expect(blocks.map((b) => b.showIf)).toEqual([undefined, 'ענתה', undefined]);
    expect(textOf(blocks)).toEqual(['פתיחה.', 'רק אחרי.', 'סיום.']);
  });

  it('reads a leading "!" as "hide once this mark is set"', () => {
    const blocks = blocksFromText('[[אם: !ענתה]]\n\nכל עוד לא ענתה.\n\n[[סוף]]');
    expect(blocks[0].hideIf).toBe('ענתה');
    expect(blocks[0].showIf).toBeUndefined();
  });

  it('carries a condition onto headings, notes and scene breaks alike', () => {
    const blocks = blocksFromText('[[אם: x]]\n\n## כותרת\n\n> פתק\n\n---\n\n[[סוף]]');
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'note', 'scene']);
    expect(blocks.every((b) => b.showIf === 'x')).toBe(true);
  });

  it('round-trips a conditional run back into the same text', () => {
    const source = 'פתיחה.\n\n[[אם: ענתה]]\n\nרק אחרי.\n\n[[סוף]]\n\nסיום.';
    expect(textFromBlocks(blocksFromText(source))).toBe(source);
  });

  it('closes a run left open at the end of the chapter', () => {
    const blocks = blocksFromText('[[אם: x]]\n\nעד הסוף.');
    expect(textFromBlocks(blocks)).toBe('[[אם: x]]\n\nעד הסוף.\n\n[[סוף]]');
  });
});

describe('visibleBlocks', () => {
  const blocks = blocksFromText(
    'תמיד.\n\n[[אם: ענתה]]\n\nענתה.\n\n[[סוף]]\n\n[[אם: !ענתה]]\n\nלא ענתה.\n\n[[סוף]]',
  );

  it('hides a branch until its mark is set', () => {
    expect(textOf(visibleBlocks(blocks, new Set()))).toEqual(['תמיד.', 'לא ענתה.']);
  });

  it('swaps the branch once the mark is set', () => {
    expect(textOf(visibleBlocks(blocks, new Set(['ענתה'])))).toEqual(['תמיד.', 'ענתה.']);
  });

  it('leaves a story with no conditions exactly as it is', () => {
    const plain = blocksFromText('אחת.\n\nשתיים.');
    expect(visibleBlocks(plain, new Set())).toEqual(plain);
  });

  it('counts only the branch taken toward the reading time', () => {
    const chapter = { id: 'c', title: 'פ', order: 0, blocks };
    const withMark = wordCountFor(chapter, new Set(['ענתה']));
    const without = wordCountFor(chapter, new Set());
    expect(withMark).toBeGreaterThan(0);
    expect(without).toBeGreaterThan(0);
    // Each reading sees one branch, never both.
    expect(withMark).toBeLessThan(
      blocks.reduce((sum, b) => sum + ((b as { text?: string }).text?.split(' ').length ?? 0), 0),
    );
  });
});

describe('marks in a story', () => {
  it('collects every mark an option can set', () => {
    expect(marksInStory(storyWith([FORK]))).toEqual(['חיכתה', 'ענתה']);
  });

  it('says a story branches only when something actually sets a mark', () => {
    expect(storyBranches(storyWith([FORK]))).toBe(true);
    expect(storyBranches(storyWith(blocksFromText('אין כאן פיצול.')))).toBe(false);
  });
});

describe('import of the branching shapes', () => {
  function importedBlock(block: unknown): Block | undefined {
    const json = JSON.stringify([
      { id: 's', title: 'סיפור', chapters: [{ id: 'c', title: 'פרק', blocks: [block] }] },
    ]);
    return parseImport(json).stories[0]?.chapters[0]?.blocks[0];
  }

  it('accepts an option written as a plain string', () => {
    const block = importedBlock({
      id: 'b',
      kind: 'activity',
      activity: 'choice',
      title: 'כ',
      instructions: 'ה',
      options: ['אחת', 'שתיים'],
    }) as ActivityBlock;
    expect(block.options).toEqual([{ text: 'אחת' }, { text: 'שתיים' }]);
  });

  it('keeps the mark on an option written as an object', () => {
    const block = importedBlock({
      id: 'b',
      kind: 'activity',
      activity: 'choice',
      title: 'כ',
      instructions: 'ה',
      options: [{ text: 'לענות', sets: 'ענתה' }],
    }) as ActivityBlock;
    expect(block.options).toEqual([{ text: 'לענות', sets: 'ענתה' }]);
  });

  it('keeps a condition on an imported block', () => {
    const block = importedBlock({ id: 'b', kind: 'paragraph', text: 'רק אז.', showIf: 'ענתה' });
    expect(block?.showIf).toBe('ענתה');
  });

  it('accepts a calm block and its overrides', () => {
    const block = importedBlock({
      id: 'b',
      kind: 'calm',
      tool: 'flower',
      intro: 'פתיחה משלנו',
      steps: ['אחת', 'שתיים'],
    }) as CalmBlock;
    expect(block.tool).toBe('flower');
    expect(block.intro).toBe('פתיחה משלנו');
    expect(block.steps).toEqual(['אחת', 'שתיים']);
  });

  it('refuses a calm block naming a tool that does not exist', () => {
    expect(importedBlock({ id: 'b', kind: 'calm', tool: 'hypnosis' })).toBeUndefined();
  });

  it('keeps an illustration and its words', () => {
    const block = importedBlock({
      id: 'b',
      kind: 'image',
      src: 'stories/nachal-c1.webp',
      alt: 'הווילון',
      caption: 'מאחורי הווילון',
    }) as ImageBlock;
    expect(block.src).toBe('stories/nachal-c1.webp');
    expect(block.alt).toBe('הווילון');
    expect(block.caption).toBe('מאחורי הווילון');
  });

  it('refuses an illustration whose src is not a file or a data URI', () => {
    expect(importedBlock({ id: 'b', kind: 'image', src: 'javascript:alert(1)' })).toBeUndefined();
    expect(
      importedBlock({ id: 'b', kind: 'image', src: 'https://example.com/x.png' }),
    ).toBeUndefined();
    expect(
      importedBlock({ id: 'b', kind: 'image', src: 'data:image/webp;base64,AA' }),
    ).toBeDefined();
  });
});

describe('illustrations in the paste box', () => {
  it('reads a picture line, with an optional caption under it', () => {
    const blocks = blocksFromText('לפני.\n\n![הווילון](stories/a.webp)\nמאחורי הווילון\n\nאחרי.');
    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'image', 'paragraph']);
    const image = blocks[1] as ImageBlock;
    expect(image.src).toBe('stories/a.webp');
    expect(image.alt).toBe('הווילון');
    expect(image.caption).toBe('מאחורי הווילון');
  });

  it('round-trips a picture back into the same text', () => {
    const source = '![הווילון](stories/a.webp)\nמאחורי הווילון';
    expect(textFromBlocks(blocksFromText(source))).toBe(source);
  });

  it('treats a decorative picture as having no alt text to read out', () => {
    const [block] = blocksFromText('![](stories/a.webp)');
    expect((block as ImageBlock).alt).toBeUndefined();
  });
});
