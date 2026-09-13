import {
  blocksFromText,
  mergeActivities,
  parseImport,
  readingMinutes,
  splitActivities,
  textFromBlocks,
  wordCount,
  type ActivityBlock,
  type Block,
  type Chapter,
} from './story-types';

function chapterOf(blocks: Block[]): Chapter {
  return { id: 'c1', title: 'פרק', order: 0, blocks };
}

const ACTIVITY: ActivityBlock = {
  id: 'a1',
  kind: 'activity',
  activity: 'game',
  title: 'עצירה',
  instructions: 'אמרו משפט בקול',
};

describe('blocksFromText', () => {
  it('splits on blank lines and keeps one paragraph per chunk', () => {
    const blocks = blocksFromText('ראשונה.\n\nשנייה.\n\n\nשלישית.');
    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'paragraph', 'paragraph']);
    expect(blocks.map((b) => (b as { text: string }).text)).toEqual([
      'ראשונה.',
      'שנייה.',
      'שלישית.',
    ]);
  });

  it('joins a soft-wrapped paragraph into one line', () => {
    const [block] = blocksFromText('שורה ראשונה\nוהמשך שלה.');
    expect((block as { text: string }).text).toBe('שורה ראשונה והמשך שלה.');
  });

  it('reads "## " as a sub-heading and "---" as a scene break', () => {
    const blocks = blocksFromText('פתיחה.\n\n## הכותרת\n\n---\n\nסיום.');
    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'heading', 'scene', 'paragraph']);
    expect((blocks[1] as { text: string }).text).toBe('הכותרת');
  });

  it('reads a "> " run as one note and keeps its line breaks', () => {
    const blocks = blocksFromText('פתיחה.\n\n> שורה ראשונה\n> שורה שנייה\n\nהמשך.');
    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'note', 'paragraph']);
    expect((blocks[1] as { text: string }).text).toBe('שורה ראשונה\nשורה שנייה');
  });

  it('round-trips a note through textFromBlocks', () => {
    const source = '> שורה ראשונה\n> שורה שנייה';
    expect(textFromBlocks(blocksFromText(source))).toBe(source);
  });

  it('drops empty chunks rather than making empty paragraphs', () => {
    expect(blocksFromText('\n\n   \n\n')).toEqual([]);
  });

  it('keeps markup as text — nothing here ever produces HTML', () => {
    const [block] = blocksFromText('<script>alert(1)</script> אמרה נחל.');
    expect((block as { text: string }).text).toBe('<script>alert(1)</script> אמרה נחל.');
  });

  it('round-trips through textFromBlocks', () => {
    const source = 'פתיחה.\n\n## כותרת\n\n---\n\nסיום.';
    expect(textFromBlocks(blocksFromText(source))).toBe(source);
  });
});

describe('activity anchoring', () => {
  it('splits activities out with the index of the block they follow', () => {
    const text = blocksFromText('א.\n\nב.\n\nג.');
    const { activities } = splitActivities([text[0], text[1], ACTIVITY, text[2]]);
    expect(activities).toEqual([{ after: 1, block: ACTIVITY }]);
  });

  it('puts them back where they were', () => {
    const text = blocksFromText('א.\n\nב.\n\nג.');
    const original = [text[0], text[1], ACTIVITY, text[2]];
    const { text: textOnly, activities } = splitActivities(original);
    expect(mergeActivities(textOnly, activities)).toEqual(original);
  });

  it('anchors before the first paragraph with -1', () => {
    const text = blocksFromText('א.');
    expect(mergeActivities(text, [{ after: -1, block: ACTIVITY }])).toEqual([ACTIVITY, text[0]]);
  });

  it('keeps an activity whose paragraph was deleted under it, at the end', () => {
    const text = blocksFromText('א.');
    const merged = mergeActivities(text, [{ after: 7, block: ACTIVITY }]);
    expect(merged).toEqual([text[0], ACTIVITY]);
  });
});

describe('reading time', () => {
  it('counts the words of prose and of an activity that is read aloud', () => {
    const blocks = [...blocksFromText('אחת שתיים שלוש'), ACTIVITY];
    // 3 prose + 1 title + 3 instruction words.
    expect(wordCount(chapterOf(blocks))).toBe(7);
  });

  it('never promises less than a minute', () => {
    expect(readingMinutes([chapterOf(blocksFromText('מילה'))])).toBe(1);
  });

  it('rounds a real chapter to whole minutes at a read-aloud pace', () => {
    const words = Array.from({ length: 240 }, () => 'מילה').join(' ');
    expect(readingMinutes([chapterOf(blocksFromText(words))])).toBe(2);
  });
});

describe('parseImport', () => {
  const good = {
    version: 1,
    stories: [
      {
        id: 'demo',
        title: 'סיפור',
        blurb: 'תקציר',
        tags: ['תג'],
        chapters: [
          {
            id: 'c1',
            title: 'פרק',
            order: 0,
            blocks: [{ id: 'b1', kind: 'paragraph', text: 'שלום' }],
          },
        ],
      },
    ],
  };

  it('accepts the shape the exporter writes', () => {
    const { stories, errors } = parseImport(JSON.stringify(good));
    expect(errors).toEqual([]);
    expect(stories.length).toBe(1);
    expect(stories[0].chapters[0].blocks.length).toBe(1);
  });

  it('accepts a bare array too', () => {
    expect(parseImport(JSON.stringify(good.stories)).stories.length).toBe(1);
  });

  it('reports broken JSON rather than throwing', () => {
    const { stories, errors } = parseImport('{ nope');
    expect(stories).toEqual([]);
    expect(errors.length).toBe(1);
  });

  it('names the story that is missing an id', () => {
    const { stories, errors } = parseImport(JSON.stringify([{ title: 'ללא מזהה', chapters: [] }]));
    expect(stories).toEqual([]);
    expect(errors[0]).toContain('id');
  });

  it('rejects a story with no valid chapter', () => {
    const broken = { ...good.stories[0], chapters: [{ title: '', blocks: [] }] };
    expect(parseImport(JSON.stringify([broken])).stories).toEqual([]);
  });

  it('keeps the good stories in a file that also has a bad one', () => {
    const { stories, errors } = parseImport(JSON.stringify([good.stories[0], { title: 'רע' }]));
    expect(stories.length).toBe(1);
    expect(errors.length).toBe(1);
  });

  it('drops a block of an unknown kind instead of importing it', () => {
    const story = {
      ...good.stories[0],
      chapters: [
        {
          id: 'c1',
          title: 'פרק',
          blocks: [
            { id: 'b1', kind: 'iframe', text: 'לא' },
            { id: 'b2', kind: 'paragraph', text: 'כן' },
          ],
        },
      ],
    };
    const { stories } = parseImport(JSON.stringify([story]));
    expect(stories[0].chapters[0].blocks.map((b) => b.id)).toEqual(['b2']);
  });

  it('falls back to a known activity kind rather than trusting the file', () => {
    const story = {
      ...good.stories[0],
      chapters: [
        {
          id: 'c1',
          title: 'פרק',
          blocks: [
            { id: 'b1', kind: 'activity', activity: 'nonsense', title: 'כ', instructions: 'ה' },
          ],
        },
      ],
    };
    const block = parseImport(JSON.stringify([story])).stories[0].chapters[0].blocks[0];
    expect((block as ActivityBlock).activity).toBe('game');
  });
});
