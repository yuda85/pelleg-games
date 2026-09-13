import { Injectable, computed, effect, signal } from '@angular/core';

const STORAGE_KEY = 'pelegames.reading.v1';

/**
 * Text size steps. Stored as a name rather than a pixel value so a later change
 * to the scale reaches saves that already exist.
 */
export type TextSize = 'sm' | 'md' | 'lg' | 'xl';

export const TEXT_SIZES: readonly TextSize[] = ['sm', 'md', 'lg', 'xl'];

export const TEXT_SIZE_LABELS: Readonly<Record<TextSize, string>> = {
  sm: 'קָטָן',
  md: 'רָגִיל',
  lg: 'גָּדוֹל',
  xl: 'עָנָק',
};

export interface StoryReading {
  /** The chapter she was last in — what "המשך קריאה" opens. */
  lastChapterId: string;
  /** Chapters marked finished, by the explicit button. Never by scrolling. */
  doneChapterIds: string[];
  /** How far down each chapter she had scrolled, 0-1. */
  offsets: Record<string, number>;
  /**
   * The forks taken, as the marks the chosen options set — the *plot*, not the
   * words. "She went with the duck" is what the next chapter needs to make
   * sense; what she said out loud at a stop is still never recorded.
   */
  marks: string[];
  /** Which option is showing as chosen, per stop, so a page reopens as it was. */
  picks: Record<string, number>;
  /** Epoch ms, so the library can put the most recent story on top. */
  updatedAt: number;
}

interface ReadingState {
  version: 1;
  textSize: TextSize;
  /** Turns off the calm tools' animation for someone who wants none. */
  stillMotion: boolean;
  stories: Record<string, StoryReading>;
}

const DEFAULT_STATE: ReadingState = {
  version: 1,
  textSize: 'md',
  stillMotion: false,
  stories: {},
};

/**
 * Where she got to, and how she likes to read.
 *
 * Deliberately apart from `Stories`: content is authored, exported and shared;
 * this is private and stays on the device. It also holds **nothing a child
 * said** — an activity's chosen option is never recorded, only that a chapter
 * was finished and how far down a page she was.
 *
 * This app has no accounts and no child profiles, so one device is one reader.
 * Two children sharing a tablet share a bookmark.
 */
@Injectable({ providedIn: 'root' })
export class Reading {
  private readonly state = signal<ReadingState>(load());

  readonly textSize = computed(() => this.state().textSize);
  readonly stillMotion = computed(() => this.state().stillMotion);

  /** Story ids that have been opened, newest first — the "ממשיכים לקרוא" row. */
  readonly recentStoryIds = computed(() =>
    Object.entries(this.state().stories)
      .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
      .map(([id]) => id),
  );

  constructor() {
    applyMotion(this.state().stillMotion);
    effect(() => save(this.state()));
  }

  setTextSize(size: TextSize): void {
    this.state.update((s) => ({ ...s, textSize: size }));
  }

  /**
   * Mirrored onto `<html>` as well as stored, because `styles.scss` is what
   * actually stops the animation and the boot script needs it before Angular
   * exists.
   */
  setStillMotion(still: boolean): void {
    this.state.update((s) => ({ ...s, stillMotion: still }));
    applyMotion(still);
  }

  /** The whole entry for a story, for callers that need more than one field. */
  forStory(storyId: string): StoryReading | undefined {
    return this.state().stories[storyId];
  }

  lastChapterId(storyId: string): string | null {
    return this.state().stories[storyId]?.lastChapterId ?? null;
  }

  isChapterDone(storyId: string, chapterId: string): boolean {
    return this.state().stories[storyId]?.doneChapterIds.includes(chapterId) ?? false;
  }

  doneCount(storyId: string): number {
    return this.state().stories[storyId]?.doneChapterIds.length ?? 0;
  }

  offset(storyId: string, chapterId: string): number {
    return this.state().stories[storyId]?.offsets[chapterId] ?? 0;
  }

  /* --- forks ------------------------------------------------------------ */

  /** The marks set so far in this story — what decides which blocks show. */
  marks(storyId: string): ReadonlySet<string> {
    return new Set(this.state().stories[storyId]?.marks ?? []);
  }

  /** Which option is showing as chosen at a stop, or -1 for none yet. */
  pick(storyId: string, blockId: string): number {
    return this.state().stories[storyId]?.picks[blockId] ?? -1;
  }

  /**
   * Take a fork. A stop offers one mark at a time, so choosing again at the
   * same stop clears the mark the previous choice set rather than leaving the
   * story believing both.
   */
  choose(
    storyId: string,
    blockId: string,
    index: number,
    sets?: string,
    clears: readonly string[] = [],
  ): void {
    this.update(storyId, (entry) => ({
      ...entry,
      picks: { ...entry.picks, [blockId]: index },
      marks: [
        ...entry.marks.filter((mark) => !clears.includes(mark) && mark !== sets),
        ...(sets ? [sets] : []),
      ],
    }));
  }

  /** Undo a fork, so the story can be read down the other branch. */
  clearPick(storyId: string, blockId: string, clears: readonly string[] = []): void {
    this.update(storyId, (entry) => {
      const picks = { ...entry.picks };
      delete picks[blockId];
      return { ...entry, picks, marks: entry.marks.filter((mark) => !clears.includes(mark)) };
    });
  }

  /** Called when a chapter opens. Bookmarks it without claiming it was read. */
  openChapter(storyId: string, chapterId: string): void {
    this.update(storyId, (entry) => ({ ...entry, lastChapterId: chapterId }));
  }

  /**
   * Scroll position, as a fraction of the scrollable height. A ratio rather
   * than a pixel offset, because the same chapter is a different height at a
   * different text size or on a different screen.
   */
  setOffset(storyId: string, chapterId: string, offset: number): void {
    const clamped = Math.min(1, Math.max(0, offset));
    this.update(storyId, (entry) => ({
      ...entry,
      offsets: { ...entry.offsets, [chapterId]: clamped },
    }));
  }

  /**
   * Only the explicit "סיימנו את הפרק" button reaches this. Hitting the bottom
   * of the page is not the same as having read it — she may have scrolled to
   * see how long it was.
   */
  markChapterDone(storyId: string, chapterId: string): void {
    this.update(storyId, (entry) => ({
      ...entry,
      lastChapterId: chapterId,
      doneChapterIds: entry.doneChapterIds.includes(chapterId)
        ? entry.doneChapterIds
        : [...entry.doneChapterIds, chapterId],
      // A finished chapter reopens at the top, not at the last scroll position.
      offsets: { ...entry.offsets, [chapterId]: 0 },
    }));
  }

  /** Undo, for a button pressed by mistake. */
  markChapterUnread(storyId: string, chapterId: string): void {
    this.update(storyId, (entry) => ({
      ...entry,
      doneChapterIds: entry.doneChapterIds.filter((id) => id !== chapterId),
    }));
  }

  /** Start the story over — forks included. Content and preferences untouched. */
  resetStory(storyId: string): void {
    this.state.update((s) => {
      const stories = { ...s.stories };
      delete stories[storyId];
      return { ...s, stories };
    });
  }

  private update(storyId: string, change: (entry: StoryReading) => StoryReading): void {
    this.state.update((s) => {
      const entry = s.stories[storyId] ?? {
        lastChapterId: '',
        doneChapterIds: [],
        offsets: {},
        marks: [],
        picks: {},
        updatedAt: 0,
      };
      return {
        ...s,
        stories: { ...s.stories, [storyId]: { ...change(entry), updatedAt: nextStamp(s) } },
      };
    });
  }
}

/**
 * `updatedAt` is an ordering key for "ממשיכים לקרוא" before it is a timestamp.
 * Two stories opened inside the same millisecond would otherwise tie, and a
 * stable sort would leave the older one on top — so a tie is nudged forward.
 */
function nextStamp(state: ReadingState): number {
  const newest = Object.values(state.stories).reduce(
    (max, entry) => Math.max(max, entry.updatedAt),
    0,
  );
  return Math.max(Date.now(), newest + 1);
}

function load(): ReadingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<ReadingState>;
    return {
      version: 1,
      textSize: TEXT_SIZES.includes(parsed.textSize as TextSize)
        ? (parsed.textSize as TextSize)
        : 'md',
      stillMotion: parsed.stillMotion === true,
      // Saves written before stories could fork have neither field.
      stories: isRecord(parsed.stories) ? withForks(parsed.stories) : {},
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function withForks(raw: Record<string, unknown>): Record<string, StoryReading> {
  const stories: Record<string, StoryReading> = {};
  for (const [id, value] of Object.entries(raw)) {
    const entry = value as Partial<StoryReading>;
    stories[id] = {
      lastChapterId: entry.lastChapterId ?? '',
      doneChapterIds: entry.doneChapterIds ?? [],
      offsets: entry.offsets ?? {},
      marks: entry.marks ?? [],
      picks: entry.picks ?? {},
      updatedAt: entry.updatedAt ?? 0,
    };
  }
  return stories;
}

/** The attribute the stylesheet reads, kept in step with the stored value. */
function applyMotion(still: boolean): void {
  const root = document.documentElement;
  if (still) root.setAttribute('data-motion', 'still');
  else root.removeAttribute('data-motion');
  try {
    if (still) localStorage.setItem('pelegames.motion.v1', 'still');
    else localStorage.removeItem('pelegames.motion.v1');
  } catch {
    // Same as the rest: it applies now, it just is not remembered.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function save(state: ReadingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The story still reads; it just forgets the bookmark.
  }
}
