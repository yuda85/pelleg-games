import { TestBed } from '@angular/core/testing';
import { Theme } from './theme';

const KEY = 'pelegames.theme.v1';

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

/** The listeners the service registers, so a device change can be simulated. */
const listeners: ((event: { matches: boolean }) => void)[] = [];

function stubMedia(dark: boolean): void {
  listeners.length = 0;
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({
      matches: dark,
      addEventListener: (_: string, fn: (event: { matches: boolean }) => void) =>
        listeners.push(fn),
      removeEventListener: () => undefined,
    }),
    configurable: true,
  });
}

function makeTheme(): Theme {
  TestBed.tick();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  const theme = TestBed.inject(Theme);
  TestBed.tick();
  return theme;
}

function attr(): string | null {
  return document.documentElement.getAttribute('data-theme');
}

describe('Theme', () => {
  beforeEach(() => {
    store.clear();
    document.documentElement.removeAttribute('data-theme');
    stubMedia(false);
  });

  it('follows the device when nothing was chosen', () => {
    const theme = makeTheme();
    expect(theme.theme()).toBe('system');
    expect(theme.resolved()).toBe('light');
    // No attribute, so the stylesheet's media query is what answers.
    expect(attr()).toBeNull();
  });

  it('resolves to dark when the device prefers dark and nothing was chosen', () => {
    stubMedia(true);
    const theme = makeTheme();
    expect(theme.resolved()).toBe('dark');
    expect(theme.isDark()).toBe(true);
    expect(attr()).toBeNull();
  });

  it('writes the attribute for an explicit choice, in both directions', () => {
    const theme = makeTheme();
    theme.set('dark');
    TestBed.tick();
    expect(attr()).toBe('dark');

    theme.set('light');
    TestBed.tick();
    expect(attr()).toBe('light');
  });

  it('keeps light when it was chosen on a device that prefers dark', () => {
    stubMedia(true);
    const theme = makeTheme();
    theme.set('light');
    TestBed.tick();
    expect(theme.resolved()).toBe('light');
    expect(attr()).toBe('light');
  });

  it('remembers an explicit choice across visits', () => {
    makeTheme().set('dark');
    expect(makeTheme().theme()).toBe('dark');
    expect(attr()).toBe('dark');
  });

  it('takes the attribute back off when the device is followed again', () => {
    const theme = makeTheme();
    theme.set('dark');
    TestBed.tick();
    theme.set('system');
    TestBed.tick();
    expect(attr()).toBeNull();
  });

  it('follows a device that changes its mind, while on system', () => {
    const theme = makeTheme();
    expect(theme.resolved()).toBe('light');
    listeners.forEach((fn) => fn({ matches: true }));
    TestBed.tick();
    expect(theme.resolved()).toBe('dark');
  });

  it('ignores a device change once a theme was chosen', () => {
    const theme = makeTheme();
    theme.set('light');
    TestBed.tick();
    listeners.forEach((fn) => fn({ matches: true }));
    TestBed.tick();
    expect(theme.resolved()).toBe('light');
  });

  it('falls back to the device when the stored value is nonsense', () => {
    store.set(KEY, 'neon');
    expect(makeTheme().theme()).toBe('system');
  });

  it('keeps the browser chrome colour in step with the theme', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
    try {
      const theme = makeTheme();
      theme.set('dark');
      TestBed.tick();
      expect(meta.getAttribute('content')).toBe('#12132A');
      theme.set('light');
      TestBed.tick();
      expect(meta.getAttribute('content')).toBe('#EEF6FF');
    } finally {
      meta.remove();
    }
  });
});
