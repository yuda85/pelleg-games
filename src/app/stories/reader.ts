import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Reading, TEXT_SIZES, TEXT_SIZE_LABELS, type TextSize } from '../core/reading';
import { Stories } from '../core/stories';
import { storyBranches, wordCountFor } from '../core/story-types';
import { Icon } from '../shared/icon';
import { StoryBlocks, type ChoiceMade } from './story-blocks';

/** How often the scroll position is written, at most. */
const SAVE_EVERY_MS = 600;

/**
 * The reading screen.
 *
 * Quiet on purpose. Scrolling is scrolling — no page-turn machinery, no
 * pagination to fight with a font-size change. There is no timer, no score,
 * no streak and nothing that moves while she reads: the only animation on the
 * page is a stop card opening.
 *
 * Two things are saved: the chapter she is in and how far down it she was.
 * A chapter is marked read only by the button at the end. Reaching the bottom
 * is not the same as having read it — she may have scrolled ahead to see how
 * long it was.
 */
@Component({
  selector: 'pg-reader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, StoryBlocks],
  templateUrl: './reader.html',
  styleUrl: './reader.scss',
  host: { '[class]': '"read--" + textSize()' },
})
export class Reader {
  readonly storyId = input.required<string>();
  readonly chapterId = input.required<string>();

  private readonly stories = inject(Stories);
  private readonly reading = inject(Reading);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sizes = TEXT_SIZES;
  protected readonly sizeLabels = TEXT_SIZE_LABELS;
  protected readonly textSize = this.reading.textSize;
  protected readonly sizePanelOpen = signal(false);

  /** 0-1 through the chapter. Drives the hairline bar under the toolbar. */
  protected readonly progress = signal(0);
  protected readonly progressPercent = computed(() => Math.round(this.progress() * 100));

  protected readonly story = computed(() => this.stories.byId(this.storyId()));
  protected readonly chapters = computed(() => this.stories.chapters(this.storyId()));

  protected readonly index = computed(() =>
    this.chapters().findIndex((chapter) => chapter.id === this.chapterId()),
  );
  protected readonly chapter = computed(() => this.chapters()[this.index()]);

  protected readonly previous = computed(() => this.chapters()[this.index() - 1] ?? null);
  protected readonly next = computed(() => this.chapters()[this.index() + 1] ?? null);

  /** The marks set so far — what decides which blocks this reading shows. */
  protected readonly marks = computed(() => this.reading.marks(this.storyId()));

  protected readonly picks = computed(() => {
    const entry = this.reading.forStory(this.storyId());
    return entry?.picks ?? {};
  });

  /** Whether this story forks at all, so a linear one says nothing about it. */
  protected readonly branching = computed(() => {
    const story = this.story();
    return story ? storyBranches(story) : false;
  });

  protected readonly minutes = computed(() => {
    const chapter = this.chapter();
    // The estimate follows the branch taken, not the sum of every branch.
    return chapter ? Math.max(1, Math.round(wordCountFor(chapter, this.marks()) / 120)) : 0;
  });

  protected readonly done = computed(() =>
    this.reading.isChapterDone(this.storyId(), this.chapterId()),
  );

  private lastSaved = 0;

  constructor() {
    // Bookmark the chapter as soon as it opens, so closing the app mid-chapter
    // still resumes here. It does not mark it read.
    effect(() => {
      const chapter = this.chapter();
      if (chapter) this.reading.openChapter(this.storyId(), chapter.id);
    });

    const onScroll = () => this.onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', onScroll);
      // The throttle may have swallowed the last move; write it on the way out.
      this.persistOffset();
    });

    // The router scrolls to the top on navigation, so the restore has to happen
    // after that, on the frame after the chapter has rendered at its real height.
    afterNextRender(() => requestAnimationFrame(() => this.restoreOffset()));
  }

  protected setTextSize(size: TextSize): void {
    this.reading.setTextSize(size);
  }

  protected toggleSizePanel(): void {
    this.sizePanelOpen.update((open) => !open);
  }

  /** The explicit button. Nothing else in this component calls it. */
  protected finishChapter(): void {
    this.reading.markChapterDone(this.storyId(), this.chapterId());
  }

  protected undoFinish(): void {
    this.reading.markChapterUnread(this.storyId(), this.chapterId());
  }

  protected onChosen(choice: ChoiceMade): void {
    this.reading.choose(
      this.storyId(),
      choice.blockId,
      choice.index,
      choice.option.sets,
      choice.siblings,
    );
  }

  protected onUnchosen(choice: ChoiceMade): void {
    this.reading.clearPick(this.storyId(), choice.blockId, choice.siblings);
  }

  private onScroll(): void {
    this.progress.set(scrollRatio());
    const now = Date.now();
    if (now - this.lastSaved < SAVE_EVERY_MS) return;
    this.lastSaved = now;
    this.persistOffset();
  }

  private persistOffset(): void {
    const chapter = this.chapter();
    if (chapter) this.reading.setOffset(this.storyId(), chapter.id, scrollRatio());
  }

  private restoreOffset(): void {
    const chapter = this.chapter();
    if (!chapter) return;
    const offset = this.reading.offset(this.storyId(), chapter.id);
    this.progress.set(offset);
    if (offset <= 0.01) return;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    // 'auto', not 'smooth': landing softly from the top is a long animation
    // that lands somewhere else if she starts scrolling herself.
    window.scrollTo({ top: height * offset, behavior: 'auto' });
  }
}

function scrollRatio(): number {
  const height = document.documentElement.scrollHeight - window.innerHeight;
  if (height <= 0) return 1;
  return Math.min(1, Math.max(0, window.scrollY / height));
}
