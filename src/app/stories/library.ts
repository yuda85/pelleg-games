import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Reading } from '../core/reading';
import { Stories } from '../core/stories';
import { chaptersInOrder, readingMinutes, type Story } from '../core/story-types';
import { Icon } from '../shared/icon';
import { Mascot } from '../shared/mascot';
import { StoryCover } from './story-cover';

/** A story plus everything the shelf shows about it. */
export interface ShelfItem {
  story: Story;
  chapters: number;
  minutes: number;
  done: number;
  /** Where "המשך" goes, or null when it has not been opened. */
  resumeChapterId: string | null;
  resumeChapterTitle: string;
  finished: boolean;
}

@Component({
  selector: 'pg-library',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Mascot, StoryCover],
  templateUrl: './library.html',
  styleUrl: './library.scss',
})
export class Library {
  private readonly stories = inject(Stories);
  private readonly reading = inject(Reading);

  protected readonly query = signal('');

  protected readonly shelf = computed<ShelfItem[]>(() =>
    this.stories.all().map((story) => this.describe(story)),
  );

  /**
   * Started but not finished, most recent first. A finished story drops out —
   * "ממשיכים לקרוא" should not offer a story that has no next chapter.
   */
  protected readonly continuing = computed<ShelfItem[]>(() => {
    const order = this.reading.recentStoryIds();
    return this.shelf()
      .filter((item) => item.resumeChapterId !== null && !item.finished)
      .sort((a, b) => order.indexOf(a.story.id) - order.indexOf(b.story.id));
  });

  /** Search is over title, blurb and tags — the three things she would type. */
  protected readonly results = computed<ShelfItem[]>(() => {
    const needle = bare(this.query());
    if (needle === '') return this.shelf();
    return this.shelf().filter((item) => haystack(item.story).includes(needle));
  });

  protected readonly hasStories = computed(() => this.shelf().length > 0);

  protected onSearch(value: string): void {
    this.query.set(value);
  }

  protected clearSearch(): void {
    this.query.set('');
  }

  private describe(story: Story): ShelfItem {
    const chapters = chaptersInOrder(story);
    const done = this.reading.doneCount(story.id);
    const last = this.reading.lastChapterId(story.id);
    // The bookmark is a chapter she opened; the next unfinished chapter is
    // where she probably wants to be. Prefer the bookmark when it is still
    // unfinished, so reopening mid-chapter does not skip her forward.
    const resume =
      last && !this.reading.isChapterDone(story.id, last)
        ? chapters.find((chapter) => chapter.id === last)
        : chapters.find((chapter) => !this.reading.isChapterDone(story.id, chapter.id));

    return {
      story,
      chapters: chapters.length,
      minutes: readingMinutes(chapters),
      done,
      resumeChapterId: last === null ? null : (resume?.id ?? null),
      resumeChapterTitle: resume?.title ?? '',
      finished: done >= chapters.length && chapters.length > 0,
    };
  }
}

function haystack(story: Story): string {
  return bare([story.title, story.blurb, ...story.tags].join(' '));
}

/**
 * Titles in this app are vocalized and nobody types nikud into a search box,
 * so both sides drop their marks before comparing. `hebrew.ts`'s `stripMarks`
 * is for single words — it keeps only letters — so a whole-sentence strip
 * belongs here.
 */
function bare(text: string): string {
  return text.normalize('NFD').replace(/[֑-ׇ]/g, '').trim();
}
