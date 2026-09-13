import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Reading } from '../core/reading';
import { Stories } from '../core/stories';
import { SEED_STORIES } from '../core/story-bank';
import { Library } from './library';

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

async function render() {
  store.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(Library);
  await fixture.whenStable();
  return {
    fixture,
    el: fixture.nativeElement as HTMLElement,
    reading: TestBed.inject(Reading),
    stories: TestBed.inject(Stories),
  };
}

function type(fixture: { whenStable(): Promise<unknown> }, el: HTMLElement, value: string) {
  const input = el.querySelector<HTMLInputElement>('.search input')!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  return fixture.whenStable();
}

describe('Library', () => {
  it('shows a card per story, with its chapter count', async () => {
    const { el } = await render();
    expect(el.querySelectorAll('.book').length).toBe(SEED_STORIES.length);
    expect(el.querySelector('.book__meta')!.textContent).toContain(String(STORY.chapters.length));
  });

  it('draws a cover for a story that has no picture', async () => {
    const { el } = await render();
    expect(el.querySelector('pg-story-cover svg')).not.toBeNull();
    expect(el.querySelector('pg-story-cover img')).toBeNull();
  });

  it('shows the chapter count and an estimated reading time', async () => {
    const { el } = await render();
    const meta = el.querySelector('.book__meta')!.textContent ?? '';
    expect(meta).toContain('פְּרָקִים');
    expect(meta).toContain('דַּקּוֹת');
  });

  it('hides "continue reading" until a story has been opened', async () => {
    const { el } = await render();
    expect(el.querySelector('.resume__card')).toBeNull();
  });

  it('shows the chapter she stopped in once one is open', async () => {
    const { fixture, el, reading } = await render();
    reading.openChapter(STORY.id, STORY.chapters[1].id);
    await fixture.whenStable();
    expect(el.querySelector('.resume__next')!.textContent).toContain(STORY.chapters[1].title);
  });

  it('drops a finished story out of "continue reading"', async () => {
    const { fixture, el, reading } = await render();
    for (const chapter of STORY.chapters) reading.markChapterDone(STORY.id, chapter.id);
    await fixture.whenStable();
    expect(el.querySelector('.resume__card')).toBeNull();
    expect(el.querySelector('.book__chip--done')).not.toBeNull();
  });

  it('finds a story by a word of its title, typed without nikud', async () => {
    const { fixture, el } = await render();
    // "אלף" is in this story's title and in no other story's text.
    await type(fixture, el, 'אלף');
    expect(el.querySelectorAll('.book').length).toBe(1);
    expect(el.querySelector('.book__title')!.textContent).toContain(STORY.title);
  });

  it('finds stories by tag', async () => {
    const { fixture, el } = await render();
    await type(fixture, el, 'תעלומה');
    const tagged = SEED_STORIES.filter((s) => s.tags.includes('תעלומה')).length;
    expect(tagged).toBeGreaterThan(0);
    expect(el.querySelectorAll('.book').length).toBe(tagged);
  });

  it('offers a way back when a search matches nothing', async () => {
    const { fixture, el } = await render();
    await type(fixture, el, 'צוללת');
    expect(el.querySelectorAll('.book').length).toBe(0);
    el.querySelector<HTMLButtonElement>('.empty button')!.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.book').length).toBe(SEED_STORIES.length);
  });

  it('points an empty shelf at the editor rather than showing nothing', async () => {
    const { fixture, el, stories } = await render();
    for (const story of stories.all()) stories.remove(story.id);
    await fixture.whenStable();
    expect(el.querySelector('.empty')!.textContent).toContain('הַמַּדָּף עוֹד רֵיק');
    expect(el.querySelector('.search')).toBeNull();
  });
});
