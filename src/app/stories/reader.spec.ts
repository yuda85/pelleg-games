import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Reading } from '../core/reading';
import { Stories } from '../core/stories';
import { SEED_STORIES } from '../core/story-bank';
import { Reader } from './reader';

const store = new Map<string, string>();
beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
    configurable: true,
  });
});

const STORY = SEED_STORIES[0];

async function render(chapterIndex = 0, keepStorage = false) {
  if (!keepStorage) store.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(Reader);
  fixture.componentRef.setInput('storyId', STORY.id);
  fixture.componentRef.setInput('chapterId', STORY.chapters[chapterIndex].id);
  await fixture.whenStable();
  return {
    fixture,
    el: fixture.nativeElement as HTMLElement,
    reading: TestBed.inject(Reading),
    stories: TestBed.inject(Stories),
  };
}

/**
 * jsdom does not lay anything out, so a scrollable page has to be described
 * rather than produced: a height taller than the window, and a scroll position
 * inside it. The component reads exactly these three values.
 */
function fakeScroll(ratio: number, height = 4000, viewport = 800) {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: height,
    configurable: true,
  });
  Object.defineProperty(window, 'innerHeight', { value: viewport, configurable: true });
  Object.defineProperty(window, 'scrollY', {
    value: (height - viewport) * ratio,
    configurable: true,
  });
}

function text(el: HTMLElement): string {
  return el.textContent ?? '';
}

describe('Reader', () => {
  it('renders every paragraph of the chapter', async () => {
    const { el } = await render();
    const paragraphs = STORY.chapters[0].blocks.filter((b) => b.kind === 'paragraph').length;
    expect(el.querySelectorAll('.para').length).toBe(paragraphs);
  });

  it('renders an activity as a collapsed card, not as prose', async () => {
    const { el } = await render();
    const stops = STORY.chapters[0].blocks.filter((b) => b.kind === 'activity').length;
    expect(el.querySelectorAll('.stop').length).toBe(stops);
    expect(el.querySelectorAll('.stop__body:not([hidden])').length).toBe(0);
  });

  it('opens and closes a stop when its header is pressed', async () => {
    const { fixture, el } = await render();
    const head = el.querySelector<HTMLButtonElement>('.stop__head')!;
    head.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.stop__body:not([hidden])').length).toBe(1);
    expect(head.getAttribute('aria-expanded')).toBe('true');
    head.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.stop__body:not([hidden])').length).toBe(0);
  });

  it('bookmarks the chapter on open without marking it read', async () => {
    const { reading } = await render();
    expect(reading.lastChapterId(STORY.id)).toBe(STORY.chapters[0].id);
    expect(reading.isChapterDone(STORY.id, STORY.chapters[0].id)).toBe(false);
  });

  it('marks the chapter read only when the end button is pressed', async () => {
    const { fixture, el, reading } = await render();
    expect(reading.isChapterDone(STORY.id, STORY.chapters[0].id)).toBe(false);

    el.querySelector<HTMLButtonElement>('.end__cta')!.click();
    await fixture.whenStable();
    expect(reading.isChapterDone(STORY.id, STORY.chapters[0].id)).toBe(true);
  });

  it('offers the next chapter by name once the chapter is finished', async () => {
    const { fixture, el } = await render();
    el.querySelector<HTMLButtonElement>('.end__cta')!.click();
    await fixture.whenStable();
    expect(text(el.querySelector('.end__next-title')!)).toContain(STORY.chapters[1].title);
  });

  it('ends the last chapter with the story ending, not a next-chapter card', async () => {
    const last = STORY.chapters.length - 1;
    const { fixture, el } = await render(last);
    el.querySelector<HTMLButtonElement>('.end__cta')!.click();
    await fixture.whenStable();
    expect(el.querySelector('.end__card--fin')).not.toBeNull();
    expect(el.querySelector('.end__next-title')).toBeNull();
  });

  it('takes back a chapter marked by mistake', async () => {
    const { fixture, el, reading } = await render();
    el.querySelector<HTMLButtonElement>('.end__cta')!.click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('.end__quiet')!.click();
    await fixture.whenStable();
    expect(reading.isChapterDone(STORY.id, STORY.chapters[0].id)).toBe(false);
  });

  it('carries the saved text size as a host class', async () => {
    const { fixture, reading } = await render();
    reading.setTextSize('xl');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).className).toContain('read--xl');
  });

  it('does not offer a previous chapter on the first one', async () => {
    const { el } = await render(0);
    expect(el.querySelectorAll('.steps__link').length).toBe(1);
  });

  it('saves how far down the chapter she is, as a ratio', async () => {
    const { fixture, reading } = await render();
    fakeScroll(0.4);
    window.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    expect(reading.offset(STORY.id, STORY.chapters[0].id)).toBeCloseTo(0.4, 2);
  });

  it('scrolls back to where she stopped when the chapter is reopened', async () => {
    const first = await render();
    fakeScroll(0.6);
    window.dispatchEvent(new Event('scroll'));
    await first.fixture.whenStable();

    // Reopening the same chapter, with the saved position still in storage.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const calls: number[] = [];
    window.scrollTo = ((options: ScrollToOptions) =>
      calls.push(options.top ?? 0)) as typeof window.scrollTo;
    fakeScroll(0);
    const fixture = TestBed.createComponent(Reader);
    fixture.componentRef.setInput('storyId', STORY.id);
    fixture.componentRef.setInput('chapterId', STORY.chapters[0].id);
    await fixture.whenStable();
    // The restore runs after render, on the next frame — poll rather than
    // betting on one tick of a timer this test does not control.
    for (let i = 0; i < 20 && calls.length === 0; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    expect(calls.length).toBeGreaterThan(0);
    expect(calls.at(-1)).toBeCloseTo((4000 - 800) * 0.6, 0);
  });

  it('shows a calm tool closed, with its length, and opens it on tap', async () => {
    const { fixture, el } = await render();
    const card = el.querySelector('pg-calm-card')!;
    expect(card.querySelector('.calm__stage')).toBeNull();

    card.querySelector<HTMLButtonElement>('.calm__head')!.click();
    await fixture.whenStable();
    expect(card.querySelector('.calm__body')).not.toBeNull();
    // Nothing about the tool is scored, and it can always be closed.
    expect(card.textContent).toContain('סְגִירָה');
  });

  it('takes a fork and changes what the rest of the chapter says', async () => {
    // Chapter 3 carries the fork: three options, each with its own branch.
    const { fixture, el, reading } = await render(2);
    const before = el.querySelectorAll('.para').length;

    const stop = [...el.querySelectorAll<HTMLElement>('.stop--fork')].at(0)!;
    stop.querySelector<HTMLButtonElement>('.stop__head')!.click();
    await fixture.whenStable();

    const forks = stop.querySelectorAll<HTMLButtonElement>('.fork');
    expect(forks.length).toBeGreaterThan(1);
    forks[0].click();
    await fixture.whenStable();

    expect(reading.marks(STORY.id).size).toBe(1);
    expect(el.querySelectorAll('.para').length).toBeGreaterThan(before);
    expect(forks[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('swaps one branch for the other rather than showing both', async () => {
    const { fixture, el, reading } = await render(2);
    const stop = [...el.querySelectorAll<HTMLElement>('.stop--fork')].at(0)!;
    stop.querySelector<HTMLButtonElement>('.stop__head')!.click();
    await fixture.whenStable();

    const forks = stop.querySelectorAll<HTMLButtonElement>('.fork');
    forks[0].click();
    await fixture.whenStable();
    const first = el.querySelectorAll('.para').length;

    forks[1].click();
    await fixture.whenStable();
    expect(reading.marks(STORY.id).size).toBe(1);
    expect(el.querySelectorAll('.para').length).toBe(first);
  });

  it('takes a fork back when the chosen option is pressed again', async () => {
    const { fixture, el, reading } = await render(2);
    const stop = [...el.querySelectorAll<HTMLElement>('.stop--fork')].at(0)!;
    stop.querySelector<HTMLButtonElement>('.stop__head')!.click();
    await fixture.whenStable();

    const fork = stop.querySelector<HTMLButtonElement>('.fork')!;
    fork.click();
    await fixture.whenStable();
    fork.click();
    await fixture.whenStable();

    expect(reading.marks(STORY.id).size).toBe(0);
    expect(
      reading.pick(
        STORY.id,
        fork.closest('.stop')!.querySelector('.stop__body')!.id.replace('stop-', ''),
      ),
    ).toBe(-1);
  });

  it('remembers the fork when the chapter is reopened', async () => {
    const first = await render(2);
    const stop = [...first.el.querySelectorAll<HTMLElement>('.stop--fork')].at(0)!;
    stop.querySelector<HTMLButtonElement>('.stop__head')!.click();
    await first.fixture.whenStable();
    stop.querySelectorAll<HTMLButtonElement>('.fork')[0].click();
    await first.fixture.whenStable();
    const paras = first.el.querySelectorAll('.para').length;

    const again = await render(2, true);
    expect(again.el.querySelectorAll('.para').length).toBe(paras);
  });

  it('says so when the chapter is not in the story', async () => {
    store.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Reader);
    fixture.componentRef.setInput('storyId', STORY.id);
    fixture.componentRef.setInput('chapterId', 'no-such-chapter');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.missing')).not.toBeNull();
  });
});
