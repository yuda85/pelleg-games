import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Reading } from '../core/reading';
import { Stories } from '../core/stories';
import { readingMinutes, wordCount, type Chapter } from '../core/story-types';
import { Icon } from '../shared/icon';
import { StoryCover } from './story-cover';

interface ChapterRow {
  chapter: Chapter;
  number: number;
  minutes: number;
  done: boolean;
  /** The bookmark sits on one chapter only — the one she was last in. */
  current: boolean;
}

/**
 * The story's own page: cover, blurb, and every chapter in order.
 *
 * Chapters are **not** locked. Skipping ahead is allowed — a bedtime story is
 * not a level ladder, and a child who wants to reread chapter one should not
 * have to argue with the app about it. What the page does refuse to do is
 * spoil: a row shows a chapter's title and its length, never a line of it.
 */
@Component({
  selector: 'pg-story-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, StoryCover],
  templateUrl: './story-page.html',
  styleUrl: './story-page.scss',
})
export class StoryPage {
  /** Bound from the route by `withComponentInputBinding`. */
  readonly storyId = input.required<string>();

  private readonly stories = inject(Stories);
  private readonly reading = inject(Reading);

  protected readonly story = computed(() => this.stories.byId(this.storyId()));
  protected readonly chapters = computed(() => this.stories.chapters(this.storyId()));

  protected readonly minutes = computed(() => readingMinutes(this.chapters()));

  protected readonly rows = computed<ChapterRow[]>(() => {
    const last = this.reading.lastChapterId(this.storyId());
    return this.chapters().map((chapter, index) => ({
      chapter,
      number: index + 1,
      minutes: Math.max(1, Math.round(wordCount(chapter) / 120)),
      done: this.reading.isChapterDone(this.storyId(), chapter.id),
      current: chapter.id === last,
    }));
  });

  protected readonly doneCount = computed(() => this.rows().filter((row) => row.done).length);
  protected readonly finished = computed(
    () => this.rows().length > 0 && this.doneCount() === this.rows().length,
  );

  protected readonly firstChapterId = computed(() => this.chapters()[0]?.id ?? null);

  /** The next unfinished chapter, or the bookmark if she stopped mid-chapter. */
  protected readonly resumeChapterId = computed(() => {
    const last = this.reading.lastChapterId(this.storyId());
    if (last && !this.reading.isChapterDone(this.storyId(), last)) return last;
    const next = this.chapters().find(
      (chapter) => !this.reading.isChapterDone(this.storyId(), chapter.id),
    );
    return next?.id ?? null;
  });

  protected readonly started = computed(() => this.reading.lastChapterId(this.storyId()) !== null);

  protected restart(): void {
    this.reading.resetStory(this.storyId());
  }
}
