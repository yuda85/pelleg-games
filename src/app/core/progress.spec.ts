import { TestBed } from '@angular/core/testing';
import { Progress } from './progress';

const KEY_V1 = 'pelegames.progress.v1';
const KEY_V2 = 'pelegames.progress.v2';

/**
 * The test environment's document has an opaque origin, so it has no real
 * `localStorage`. What is under test here is the migration, not the browser's
 * storage, so an in-memory stand-in is the honest substitute.
 */
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

function makeProgress(): Progress {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(Progress);
}

describe('Progress save migration', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty when there is no save at all', () => {
    const p = makeProgress();
    expect(p.coins()).toBe(0);
    expect(p.setsDoneFor('nikud')).toBe(0);
    expect(p.setsDoneFor('math')).toBe(0);
  });

  it('lifts a v1 bare setsDone into the nikud slot', () => {
    localStorage.setItem(
      KEY_V1,
      JSON.stringify({ coins: 221, setsDone: 2, stars: {}, stickers: [], owned: [] }),
    );
    const p = makeProgress();
    expect(p.coins()).toBe(221);
    expect(p.setsDoneFor('nikud')).toBe(2);
    expect(p.setsDoneFor('math')).toBe(0);
  });

  it('seeds set stars from the per-word bests a v1 save already held', () => {
    // e01..e03, m01..m03, h01 are exactly the words of nikud set 0.
    const stars = { e01: 3, e02: 3, e03: 2, m01: 3, m02: 3, m03: 3, h01: 2 };
    localStorage.setItem(KEY_V1, JSON.stringify({ coins: 0, setsDone: 1, stars }));
    const p = makeProgress();
    expect(p.starsForSet('nikud', 0)).toBe(19);
  });

  it('renames v1 sticker ids into their game-scoped form', () => {
    localStorage.setItem(
      KEY_V1,
      JSON.stringify({ coins: 0, setsDone: 1, stars: {}, stickers: ['drop', 'fish'] }),
    );
    expect(makeProgress().stickers()).toEqual(['nikud-drop', 'nikud-fish']);
  });

  it('loads a v2 save untouched', () => {
    localStorage.setItem(
      KEY_V2,
      JSON.stringify({
        version: 2,
        coins: 50,
        setsDone: { nikud: 1, math: 3 },
        setStars: { 'math:0': 21 },
      }),
    );
    const p = makeProgress();
    expect(p.setsDoneFor('math')).toBe(3);
    expect(p.starsForSet('math', 0)).toBe(21);
  });

  it('keeps a corrupt save from wiping the child out', () => {
    localStorage.setItem(KEY_V2, '{not json');
    expect(makeProgress().coins()).toBe(0);
  });
});

describe('Progress recording', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the best set score, never the latest', () => {
    const p = makeProgress();
    p.recordSetStars('math', 0, 18);
    p.recordSetStars('math', 0, 12);
    expect(p.starsForSet('math', 0)).toBe(18);
  });

  it('unlocks only the next set', () => {
    const p = makeProgress();
    expect(p.isSetUnlocked('math', 0)).toBe(true);
    expect(p.isSetUnlocked('math', 1)).toBe(false);
    p.completeSet('math', 0, 'math-anchor');
    expect(p.isSetUnlocked('math', 1)).toBe(true);
    expect(p.isSetUnlocked('math', 2)).toBe(false);
  });

  it('tallies right and wrong per operation', () => {
    const p = makeProgress();
    p.recordOp('mul', true);
    p.recordOp('mul', false);
    p.recordOp('mul', false);
    expect(p.opStats()['mul']).toEqual({ right: 1, wrong: 2 });
  });

  it('keeps each game unlocked independently', () => {
    const p = makeProgress();
    p.completeSet('nikud', 0, 'nikud-drop');
    expect(p.isSetUnlocked('nikud', 1)).toBe(true);
    expect(p.isSetUnlocked('math', 1)).toBe(false);
  });
});
