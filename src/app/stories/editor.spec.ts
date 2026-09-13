import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Stories } from '../core/stories';
import { SEED_STORIES } from '../core/story-bank';
import { StoryEditor } from './editor';

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

async function render() {
  store.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(StoryEditor);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement, stories: TestBed.inject(Stories) };
}

/** Finds a labelled control by its visible label text. */
function control(el: HTMLElement, label: string): HTMLInputElement | HTMLTextAreaElement {
  const field = [...el.querySelectorAll<HTMLLabelElement>('.clay-field')].find((node) =>
    node.querySelector('span')?.textContent?.includes(label),
  );
  if (!field) throw new Error(`no field labelled ${label}`);
  return field.querySelector('input, textarea')!;
}

async function fill(
  fixture: { whenStable(): Promise<unknown> },
  el: HTMLElement,
  label: string,
  value: string,
) {
  const input = control(el, label);
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

function button(el: HTMLElement, text: string): HTMLButtonElement {
  const found = [...el.querySelectorAll('button')].find((node) => node.textContent?.includes(text));
  if (!found) throw new Error(`no button saying ${text}`);
  return found as HTMLButtonElement;
}

describe('StoryEditor', () => {
  it('lists what is in the library', async () => {
    const { el } = await render();
    expect(el.querySelectorAll('.row').length).toBe(SEED_STORIES.length);
    expect(el.querySelector('.row__title')!.textContent).toContain(SEED_STORIES[0].title);
  });

  it('says on screen that content lives on this device only', async () => {
    const { el } = await render();
    expect(el.querySelector('.ed__where')!.textContent).toContain('הַמַּכְשִׁיר הַזֶּה');
  });

  it('adds a whole story through the form, with no JSON typed anywhere', async () => {
    const { fixture, el, stories } = await render();

    button(el, 'סִפּוּר חָדָשׁ').click();
    await fixture.whenStable();
    await fill(fixture, el, 'שֵׁם הַסִּפּוּר', 'הדרקון שפחד מגובה');
    await fill(fixture, el, 'תַּקְצִיר', 'שלושה ערבים.');
    await fill(fixture, el, 'תָּגִיּוֹת', 'הרפתקה, הומור');

    button(el, 'פֶּרֶק חָדָשׁ').click();
    await fixture.whenStable();
    await fill(fixture, el, 'שֵׁם הַפֶּרֶק', 'הקפיצה הראשונה');
    await fill(fixture, el, 'טֶקְסְט הַפֶּרֶק', 'פסקה ראשונה.\n\n## כותרת\n\nפסקה שנייה.');

    button(el, 'שְׁמִירַת הַסִּפּוּר').click();
    await fixture.whenStable();

    const saved = stories.all().find((story) => story.title === 'הדרקון שפחד מגובה');
    expect(saved).toBeDefined();
    expect(saved!.tags).toEqual(['הרפתקה', 'הומור']);
    expect(saved!.chapters.length).toBe(1);
    expect(saved!.chapters[0].blocks.map((b) => b.kind)).toEqual([
      'paragraph',
      'heading',
      'paragraph',
    ]);
  });

  it('will not save a story with no title', async () => {
    const { fixture, el } = await render();
    button(el, 'סִפּוּר חָדָשׁ').click();
    await fixture.whenStable();
    expect(button(el, 'שְׁמִירַת הַסִּפּוּר').disabled).toBe(true);
  });

  it('refuses an id that belongs to another story', async () => {
    const { fixture, el } = await render();
    button(el, 'סִפּוּר חָדָשׁ').click();
    await fixture.whenStable();
    await fill(fixture, el, 'שֵׁם הַסִּפּוּר', 'משהו');
    await fill(fixture, el, 'מְזַהֶה', SEED_STORIES[0].id);
    expect(el.querySelector('.error')).not.toBeNull();
    expect(button(el, 'שְׁמִירַת הַסִּפּוּר').disabled).toBe(true);
  });

  it('previews a chapter with the reading screen’s own blocks', async () => {
    const { fixture, el } = await render();
    button(el, 'סִפּוּר חָדָשׁ').click();
    await fixture.whenStable();
    button(el, 'פֶּרֶק חָדָשׁ').click();
    await fixture.whenStable();
    await fill(fixture, el, 'טֶקְסְט הַפֶּרֶק', 'אחת.\n\nשתיים.');
    button(el, 'תְּצוּגָה מַקְדִּימָה').click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.preview__page .para').length).toBe(2);
  });

  it('adds an activity at a chosen point between paragraphs', async () => {
    const { fixture, el, stories } = await render();
    button(el, 'סִפּוּר חָדָשׁ').click();
    await fixture.whenStable();
    await fill(fixture, el, 'שֵׁם הַסִּפּוּר', 'עם עצירה');
    button(el, 'פֶּרֶק חָדָשׁ').click();
    await fixture.whenStable();
    await fill(fixture, el, 'שֵׁם הַפֶּרֶק', 'פרק');
    await fill(fixture, el, 'טֶקְסְט הַפֶּרֶק', 'אחת.\n\nשתיים.\n\nשלוש.');

    button(el, 'עֲצִירָה').click();
    await fixture.whenStable();
    await fill(fixture, el, 'כּוֹתֶרֶת', 'נסו בקול');
    await fill(fixture, el, 'הוֹרָאוֹת', 'אמרו את המשפט הפוך.');
    const anchor = el.querySelector<HTMLSelectElement>('.act select:last-of-type') ?? null;
    expect(anchor).not.toBeNull();

    button(el, 'שְׁמִירַת הַסִּפּוּר').click();
    await fixture.whenStable();

    const saved = stories.all().find((story) => story.title === 'עם עצירה')!;
    const kinds = saved.chapters[0].blocks.map((b) => b.kind);
    // Default anchor is the end of what is written.
    expect(kinds).toEqual(['paragraph', 'paragraph', 'paragraph', 'activity']);
  });

  it('offers a deleted bundled story back rather than losing it', async () => {
    const { fixture, el, stories } = await render();
    stories.remove(SEED_STORIES[0].id);
    await fixture.whenStable();
    expect(stories.byId(SEED_STORIES[0].id)).toBeUndefined();

    button(el, 'הַחְזָרָה').click();
    await fixture.whenStable();
    expect(stories.byId(SEED_STORIES[0].id)?.title).toBe(SEED_STORIES[0].title);
  });

  it('reports what is wrong with an import rather than swallowing it', async () => {
    const { fixture, el } = await render();
    button(el, 'יְבוּא').click();
    await fixture.whenStable();

    const box = el.querySelector<HTMLTextAreaElement>('.clay-field textarea')!;
    box.value = '{ not json';
    box.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.querySelector('.errors')).not.toBeNull();
    expect(el.querySelector('.preflight')).toBeNull();
  });

  it('flags a duplicate id and writes nothing until a choice is confirmed', async () => {
    const { fixture, el, stories } = await render();
    const json = stories.exportJson();
    const before = stories.count();

    button(el, 'יְבוּא').click();
    await fixture.whenStable();
    const box = el.querySelector<HTMLTextAreaElement>('.clay-field textarea')!;
    box.value = json;
    box.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.querySelector('.preflight__clash')).not.toBeNull();
    expect(stories.count()).toBe(before);

    el.querySelector<HTMLButtonElement>('.preflight > button')!.click();
    await fixture.whenStable();
    // The safe default is a copy, so every original is still there beside it.
    expect(stories.count()).toBe(before * 2);
    expect(stories.byId(SEED_STORIES[0].id)).toBeDefined();
  });
});
