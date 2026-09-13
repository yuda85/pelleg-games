import { Injectable, computed, effect, signal } from '@angular/core';

const STORAGE_KEY = 'pelegames.theme.v1';

/** What the settings switch offers. `system` is the default and stores nothing. */
export type ThemeChoice = 'light' | 'dark' | 'system';

export const THEME_CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system'];

export const THEME_LABELS: Readonly<Record<ThemeChoice, string>> = {
  light: 'בָּהִיר',
  dark: 'כֵּהֶה',
  system: 'לְפִי הַמַּכְשִׁיר',
};

export const THEME_ICONS: Readonly<Record<ThemeChoice, string>> = {
  light: 'sun',
  dark: 'moon',
  system: 'device',
};

/** The page colour the browser paints its chrome with, per resolved theme. */
const META_COLOR: Readonly<Record<'light' | 'dark', string>> = {
  light: '#EEF6FF',
  dark: '#12132A',
};

/**
 * Light and dark.
 *
 * The colours themselves live in `styles.scss`; this only decides which set is
 * on. It writes `data-theme` on `<html>` — the same attribute the inline script
 * in `index.html` writes before first paint, so the two never disagree and the
 * page does not flash the wrong theme on load.
 *
 * `system` writes **no** attribute: the CSS media query is then free to answer,
 * which is also what makes a change to the device preference land without this
 * service doing anything. The listener here exists only for the pieces CSS
 * cannot reach — the `theme-color` meta tag.
 */
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly choice = signal<ThemeChoice>(load());

  /** Tracks the device preference so `resolved` stays right under `system`. */
  private readonly systemDark = signal(prefersDark());

  readonly theme = this.choice.asReadonly();

  /** What is actually on screen — `system` resolved against the device. */
  readonly resolved = computed<'light' | 'dark'>(() => {
    const choice = this.choice();
    if (choice === 'system') return this.systemDark() ? 'dark' : 'light';
    return choice;
  });

  readonly isDark = computed(() => this.resolved() === 'dark');

  constructor() {
    const media = matchMediaSafe();
    media?.addEventListener('change', (event) => this.systemDark.set(event.matches));

    effect(() => {
      const choice = this.choice();
      const root = document.documentElement;
      // `system` means "no opinion recorded", so the attribute comes off and
      // the media query in the stylesheet decides.
      if (choice === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', choice);

      setMetaColor(META_COLOR[this.resolved()]);
      save(choice);
    });
  }

  set(choice: ThemeChoice): void {
    this.choice.set(choice);
  }
}

function prefersDark(): boolean {
  return matchMediaSafe()?.matches ?? false;
}

/** `matchMedia` is missing in some test environments and old webviews. */
function matchMediaSafe(): MediaQueryList | null {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  } catch {
    return null;
  }
}

function setMetaColor(color: string): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', color);
}

function load(): ThemeChoice {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return THEME_CHOICES.includes(raw as ThemeChoice) ? (raw as ThemeChoice) : 'system';
  } catch {
    return 'system';
  }
}

function save(choice: ThemeChoice): void {
  try {
    // Storing `system` too, so "I chose to follow the device" survives a later
    // change of default.
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // The theme still applies for this visit; it just is not remembered.
  }
}
