import { TestBed } from '@angular/core/testing';
import { Reading } from './reading';

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
function makeReading(): Reading {
  TestBed.tick();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(Reading);
}

describe('Reading state', () => {
  beforeEach(() => localStorage.clear());

  it('starts with nothing read and a normal text size', () => {
    const reading = makeReading();
    expect(reading.textSize()).toBe('md');
    expect(reading.lastChapterId('s')).toBeNull();
    expect(reading.doneCount('s')).toBe(0);
  });

  it('bookmarks a chapter when it opens, without marking it read', () => {
    const reading = makeReading();
    reading.openChapter('s', 'c1');
    expect(reading.lastChapterId('s')).toBe('c1');
    expect(reading.isChapterDone('s', 'c1')).toBe(false);
  });

  it('marks a chapter read only when told to', () => {
    const reading = makeReading();
    reading.openChapter('s', 'c1');
    reading.setOffset('s', 'c1', 1);
    // Scrolled to the very bottom — still not read.
    expect(reading.isChapterDone('s', 'c1')).toBe(false);
    reading.markChapterDone('s', 'c1');
    expect(reading.isChapterDone('s', 'c1')).toBe(true);
    expect(reading.doneCount('s')).toBe(1);
  });

  it('does not count the same chapter twice', () => {
    const reading = makeReading();
    reading.markChapterDone('s', 'c1');
    reading.markChapterDone('s', 'c1');
    expect(reading.doneCount('s')).toBe(1);
  });

  it('reopens a finished chapter at the top', () => {
    const reading = makeReading();
    reading.setOffset('s', 'c1', 0.9);
    reading.markChapterDone('s', 'c1');
    expect(reading.offset('s', 'c1')).toBe(0);
  });

  it('undoes a chapter marked by mistake', () => {
    const reading = makeReading();
    reading.markChapterDone('s', 'c1');
    reading.markChapterUnread('s', 'c1');
    expect(reading.isChapterDone('s', 'c1')).toBe(false);
  });

  it('clamps a scroll ratio into 0-1', () => {
    const reading = makeReading();
    reading.setOffset('s', 'c1', 4.2);
    expect(reading.offset('s', 'c1')).toBe(1);
    reading.setOffset('s', 'c1', -3);
    expect(reading.offset('s', 'c1')).toBe(0);
  });

  it('restores the chapter, the position and the text size after a reload', () => {
    const first = makeReading();
    first.setTextSize('xl');
    first.openChapter('s', 'c2');
    first.setOffset('s', 'c2', 0.5);

    const second = makeReading();
    expect(second.textSize()).toBe('xl');
    expect(second.lastChapterId('s')).toBe('c2');
    expect(second.offset('s', 'c2')).toBe(0.5);
  });

  it('lists opened stories newest first', () => {
    const reading = makeReading();
    reading.openChapter('old', 'c1');
    reading.openChapter('new', 'c1');
    expect(reading.recentStoryIds()[0]).toBe('new');
  });

  it('resets one story without touching another, or the text size', () => {
    const reading = makeReading();
    reading.setTextSize('lg');
    reading.markChapterDone('a', 'c1');
    reading.markChapterDone('b', 'c1');
    reading.resetStory('a');
    expect(reading.doneCount('a')).toBe(0);
    expect(reading.doneCount('b')).toBe(1);
    expect(reading.textSize()).toBe('lg');
  });

  it('ignores a text size it does not recognise in an old save', () => {
    localStorage.setItem(
      'pelegames.reading.v1',
      JSON.stringify({ version: 1, textSize: 'gigantic', stories: {} }),
    );
    expect(makeReading().textSize()).toBe('md');
  });
});
