import { TestBed } from '@angular/core/testing';
import { Stories } from './stories';
import { SEED_STORIES } from './story-bank';
import type { Story } from './story-types';

const KEY = 'pelegames.stories.v1';

/** The test document has an opaque origin, so it has no real `localStorage`. */
const store = new Map<string, string>();
const storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'> = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => void store.set(key, String(value)),
  removeItem: (key) => void store.delete(key),
  clear: () => store.clear(),
};

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
});

/**
 * A fresh service on a fresh injector — the stand-in for reopening the app.
 * The save runs in an `effect`, so it is flushed before the old injector goes.
 */
function makeStories(): Stories {
  TestBed.tick();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(Stories);
}

const SEED_ID = SEED_STORIES[0].id;

function storyOf(id: string, title = 'חדש'): Story {
  return {
    id,
    title,
    blurb: '',
    tags: [],
    chapters: [
      { id: 'c1', title: 'פרק', order: 0, blocks: [{ id: 'b1', kind: 'paragraph', text: 'שלום' }] },
    ],
  };
}

describe('Stories store', () => {
  beforeEach(() => localStorage.clear());

  it('ships the seeded story with nothing saved', () => {
    const stories = makeStories();
    expect(stories.count()).toBe(SEED_STORIES.length);
    expect(stories.byId(SEED_ID)?.chapters.length).toBe(3);
  });

  it('adds an authored story after the seeded ones', () => {
    const stories = makeStories();
    stories.save(storyOf('mine'));
    const ids = stories.all().map((s) => s.id);
    expect(ids.slice(0, SEED_STORIES.length)).toEqual(SEED_STORIES.map((s) => s.id));
    expect(ids.at(-1)).toBe('mine');
  });

  it('survives a reload, because the store is what was written', () => {
    makeStories().save(storyOf('mine'));
    expect(makeStories().byId('mine')?.title).toBe('חדש');
  });

  it('shadows a seeded story in place when it is edited', () => {
    const stories = makeStories();
    const seed = stories.byId(SEED_ID)!;
    stories.save({ ...seed, title: 'שם חדש' });
    expect(stories.count()).toBe(SEED_STORIES.length);
    expect(stories.all()[0].title).toBe('שם חדש');
  });

  it('keeps a deleted seeded story gone across reloads', () => {
    makeStories().remove(SEED_ID);
    expect(makeStories().byId(SEED_ID)).toBeUndefined();
  });

  it('brings a deleted seeded story back, at its original text', () => {
    const stories = makeStories();
    stories.save({ ...stories.byId(SEED_ID)!, title: 'שונה' });
    stories.remove(SEED_ID);
    stories.restoreSeed(SEED_ID);
    expect(stories.byId(SEED_ID)?.title).toBe(SEED_STORIES[0].title);
  });

  it('orders chapters by `order`, not by array position', () => {
    const stories = makeStories();
    stories.save({
      ...storyOf('mine'),
      chapters: [
        { id: 'b', title: 'שני', order: 1, blocks: [{ id: 'x', kind: 'scene' }] },
        { id: 'a', title: 'ראשון', order: 0, blocks: [{ id: 'y', kind: 'scene' }] },
      ],
    });
    expect(stories.chapters('mine').map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('recovers from a corrupt save instead of losing the library', () => {
    localStorage.setItem(KEY, '{{{ not json');
    expect(makeStories().count()).toBe(SEED_STORIES.length);
  });
});

describe('Stories import', () => {
  beforeEach(() => localStorage.clear());

  it('adds stories whose ids are free', () => {
    const stories = makeStories();
    const outcome = stories.importStories([storyOf('fresh')], {});
    expect(outcome).toEqual({ added: 1, replaced: 0, copied: 0 });
    expect(stories.byId('fresh')).toBeDefined();
  });

  it('never silently overwrites: a clashing id can come in as a copy', () => {
    const stories = makeStories();
    stories.save(storyOf('mine', 'המקורי'));
    const outcome = stories.importStories([storyOf('mine', 'המיובא')], { mine: 'copy' });
    expect(outcome.copied).toBe(1);
    expect(stories.byId('mine')?.title).toBe('המקורי');
    expect(stories.byId('mine-2')?.title).toBe('המיובא');
  });

  it('replaces only when replace was chosen for that id', () => {
    const stories = makeStories();
    stories.save(storyOf('mine', 'המקורי'));
    stories.importStories([storyOf('mine', 'המיובא')], { mine: 'replace' });
    expect(stories.byId('mine')?.title).toBe('המיובא');
    expect(stories.byId('mine-2')).toBeUndefined();
  });

  it('finds the next free suffix when a copy already exists', () => {
    const stories = makeStories();
    stories.save(storyOf('mine'));
    stories.save(storyOf('mine-2'));
    stories.importStories([storyOf('mine')], { mine: 'copy' });
    expect(stories.byId('mine-3')).toBeDefined();
  });

  it('exports the documented shape', () => {
    const parsed = JSON.parse(makeStories().exportJson()) as { version: number; stories: Story[] };
    expect(parsed.version).toBe(1);
    expect(parsed.stories[0].id).toBe(SEED_ID);
    expect(parsed.stories[0].chapters[0].blocks.length).toBeGreaterThan(0);
  });

  it('round-trips: what the exporter writes, the importer accepts', async () => {
    const json = makeStories().exportJson();
    const { parseImport } = await import('./story-types');
    const { stories, errors } = parseImport(json);
    expect(errors).toEqual([]);
    expect(stories[0].chapters.length).toBe(SEED_STORIES[0].chapters.length);
  });
});
