import { Injectable, computed, effect, signal } from '@angular/core';
import { SEED_STORIES } from './story-bank';
import { chaptersInOrder, type Chapter, type Story } from './story-types';

const STORAGE_KEY = 'pelegames.stories.v1';

/**
 * What the device holds. Seeded stories are **not** copied in here: the store
 * is an overlay, so a story that ships with the app keeps arriving from
 * `story-bank.ts` until someone edits it, and only the edit is saved.
 */
interface StoryStore {
  version: 1;
  /** Authored stories, plus edited copies of seeded ones under the same id. */
  stories: Story[];
  /** Seeded stories deleted on this device. Kept so they do not come back. */
  hiddenSeedIds: string[];
}

const EMPTY: StoryStore = { version: 1, stories: [], hiddenSeedIds: [] };

/** What `importStories` should do about an id that already exists. */
export type ImportMode = 'replace' | 'copy';

export interface ImportOutcome {
  added: number;
  replaced: number;
  copied: number;
}

/**
 * The story library.
 *
 * There is no backend and no admin account in this app, so "the CMS" is the
 * editor screen writing to `localStorage`, the same place `Progress` lives.
 * That is stated plainly in the editor's own UI rather than left for the user
 * to discover: content is on this device, and export is the backup.
 */
@Injectable({ providedIn: 'root' })
export class Stories {
  private readonly store = signal<StoryStore>(load());

  /** True once a write has failed — private browsing, or a full quota. */
  readonly storageFailed = signal(false);

  /**
   * Seed first, then the device's own. An edited seed story keeps its original
   * position, so fixing a typo does not move the story to the bottom of the
   * shelf.
   */
  readonly all = computed<Story[]>(() => {
    const { stories, hiddenSeedIds } = this.store();
    const local = new Map(stories.map((story) => [story.id, story]));
    const merged: Story[] = [];

    for (const seed of SEED_STORIES) {
      if (hiddenSeedIds.includes(seed.id)) continue;
      const edited = local.get(seed.id);
      if (edited) {
        local.delete(seed.id);
        merged.push(edited);
      } else {
        merged.push(seed);
      }
    }
    merged.push(...local.values());
    return merged;
  });

  readonly count = computed(() => this.all().length);

  /**
   * Stories that ship with the app but were deleted on this device. The editor
   * offers them back, so "delete" on bundled content is never a one-way door.
   */
  readonly hiddenSeeds = computed(() =>
    SEED_STORIES.filter((story) => this.store().hiddenSeedIds.includes(story.id)),
  );

  constructor() {
    effect(() => this.storageFailed.set(!save(this.store())));
  }

  byId(id: string): Story | undefined {
    return this.all().find((story) => story.id === id);
  }

  chapter(storyId: string, chapterId: string): Chapter | undefined {
    const story = this.byId(storyId);
    return story?.chapters.find((chapter) => chapter.id === chapterId);
  }

  /** Ordered, so "next chapter" is a position in this list and nothing else. */
  chapters(storyId: string): Chapter[] {
    const story = this.byId(storyId);
    return story ? chaptersInOrder(story) : [];
  }

  isSeed(id: string): boolean {
    return SEED_STORIES.some((story) => story.id === id);
  }

  /** Whether this id is free for a new story — the editor checks before saving. */
  isIdTaken(id: string): boolean {
    return this.all().some((story) => story.id === id);
  }

  /** Create or update. Saving over a seeded story shadows it rather than editing it in place. */
  save(story: Story): void {
    this.store.update((s) => {
      const stories = [...s.stories];
      const index = stories.findIndex((existing) => existing.id === story.id);
      if (index === -1) stories.push(story);
      else stories[index] = story;
      return {
        ...s,
        stories,
        hiddenSeedIds: s.hiddenSeedIds.filter((id) => id !== story.id),
      };
    });
  }

  remove(id: string): void {
    this.store.update((s) => ({
      ...s,
      stories: s.stories.filter((story) => story.id !== id),
      hiddenSeedIds:
        this.isSeed(id) && !s.hiddenSeedIds.includes(id)
          ? [...s.hiddenSeedIds, id]
          : s.hiddenSeedIds,
    }));
  }

  /** Puts a deleted seeded story back, and discards the local edit if there was one. */
  restoreSeed(id: string): void {
    this.store.update((s) => ({
      ...s,
      stories: s.stories.filter((story) => story.id !== id),
      hiddenSeedIds: s.hiddenSeedIds.filter((hidden) => hidden !== id),
    }));
  }

  /**
   * Validated stories only — `parseImport` has already rejected the rest.
   * An id that already exists is never overwritten silently: the caller has
   * picked `replace` or `copy` for each one first.
   */
  importStories(
    incoming: readonly Story[],
    modes: Readonly<Record<string, ImportMode>>,
  ): ImportOutcome {
    const outcome: ImportOutcome = { added: 0, replaced: 0, copied: 0 };
    for (const story of incoming) {
      if (!this.isIdTaken(story.id)) {
        this.save(story);
        outcome.added++;
      } else if (modes[story.id] === 'copy') {
        this.save({ ...story, id: freeId(story.id, (id) => this.isIdTaken(id)) });
        outcome.copied++;
      } else {
        this.save(story);
        outcome.replaced++;
      }
    }
    return outcome;
  }

  /** The documented interchange shape: `{ version, stories: [...] }`. */
  exportJson(ids?: readonly string[]): string {
    const stories = this.all().filter((story) => !ids || ids.includes(story.id));
    return JSON.stringify({ version: 1, stories }, null, 2);
  }
}

/** `nachal-teatron` -> `nachal-teatron-2`, then `-3`, until one is free. */
function freeId(base: string, taken: (id: string) => boolean): string {
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken(candidate)) return candidate;
  }
}

function load(): StoryStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<StoryStore>;
    return {
      version: 1,
      stories: Array.isArray(parsed.stories) ? parsed.stories : [],
      hiddenSeedIds: Array.isArray(parsed.hiddenSeedIds) ? parsed.hiddenSeedIds : [],
    };
  } catch {
    // A corrupt store must not take the library down with it — the seeded
    // story still reads, and the editor can export over the top.
    return { ...EMPTY };
  }
}

/** Returns false rather than throwing, so the editor can say so on screen. */
function save(store: StoryStore): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}
