import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CALM_TOOLS,
  CALM_TOOL_IDS,
  isCalmToolId,
  type CalmTool,
  type CalmToolId,
} from '../core/calm-tools';
import { Stories, type ImportMode } from '../core/stories';
import {
  ACTIVITY_LABELS,
  blocksFromText,
  makeId,
  mergeActivities,
  parseImport,
  splitActivities,
  textFromBlocks,
  marksInStory,
  type ActivityKind,
  type Block,
  type Chapter,
  type ChoiceOption,
  type StopBlock,
  type Story,
} from '../core/story-types';
import { Icon } from '../shared/icon';
import { StoryBlocks } from './story-blocks';

/**
 * What the editor holds while a story is open. Chapters are edited as *text*
 * plus a list of anchored activities — nobody should have to type JSON to add
 * a bedtime story, and nobody should have to keep activity objects straight
 * inside a paragraph they are pasting from a document.
 */
interface ActivityDraft {
  /** Index into the chapter's text blocks. -1 means "before the first one". */
  after: number;
  /** An activity kind, or a calm tool id — one list in the UI, one here. */
  kind: ActivityKind | CalmToolId;
  title: string;
  instructions: string;
  /**
   * One option per line. A line may end with `= mark` to make that option a
   * fork: what follows the equals sign is the mark later blocks test for.
   */
  optionsText: string;
}

/** Which entries in the stop-type list are calm tools rather than activities. */
function isCalm(kind: ActivityDraft['kind']): kind is CalmToolId {
  return isCalmToolId(kind);
}

interface ChapterDraft {
  id: string;
  title: string;
  text: string;
  activities: ActivityDraft[];
}

interface StoryDraft {
  id: string;
  /** The id the draft was loaded under, so a rename can clean up after itself. */
  originalId: string | null;
  title: string;
  blurb: string;
  cover: string;
  tagsText: string;
  chapters: ChapterDraft[];
}

type View = 'list' | 'story' | 'chapter';

const ACTIVITY_KINDS: readonly ActivityKind[] = ['game', 'choice', 'move'];

/** The stop-type menu: the story's own activities first, then the calm tools. */
const STOP_KINDS: readonly (ActivityKind | CalmToolId)[] = [...ACTIVITY_KINDS, ...CALM_TOOL_IDS];

const STOP_LABELS: Readonly<Record<string, string>> = {
  ...ACTIVITY_LABELS,
  ...Object.fromEntries(CALM_TOOL_IDS.map((id) => [id, `רֶגַע שֶׁקֶט · ${CALM_TOOLS[id].name}`])),
};

/**
 * The story editor.
 *
 * This app has no backend and no accounts, so there is no admin role to hang
 * permissions on and nothing public to protect: the editor writes to this
 * browser's `localStorage`, exactly like game progress does. That is stated on
 * the screen rather than left to be discovered — content lives on this device,
 * and export is how it is backed up or carried to another one.
 */
@Component({
  selector: 'pg-story-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, StoryBlocks],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class StoryEditor {
  private readonly stories = inject(Stories);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activityKinds = STOP_KINDS;
  protected readonly activityLabels = STOP_LABELS;

  protected isCalmKind(kind: string): boolean {
    return isCalmToolId(kind);
  }

  /** The tool behind a calm row, for the blurb and the length shown beside it. */
  protected calmTool(kind: string): CalmTool | null {
    return isCalmToolId(kind) ? CALM_TOOLS[kind] : null;
  }

  protected readonly view = signal<View>('list');
  protected readonly draft = signal<StoryDraft | null>(null);
  protected readonly chapterIndex = signal(0);
  protected readonly dirty = signal(false);
  protected readonly showPreview = signal(false);
  protected readonly notice = signal('');

  protected readonly library = this.stories.all;
  protected readonly hiddenSeeds = this.stories.hiddenSeeds;
  protected readonly storageFailed = this.stories.storageFailed;

  /** Ships with the app rather than authored here — deleting one only hides it. */
  protected isSeed(id: string): boolean {
    return this.stories.isSeed(id);
  }

  /* --- import state ----------------------------------------------------- */

  protected readonly importOpen = signal(false);
  protected readonly importErrors = signal<readonly string[]>([]);
  protected readonly pending = signal<readonly Story[]>([]);
  protected readonly conflictModes = signal<Record<string, ImportMode>>({});
  protected readonly exportText = signal('');

  protected readonly conflicts = computed(() =>
    this.pending().filter((story) => this.stories.isIdTaken(story.id)),
  );

  /* --- derived ---------------------------------------------------------- */

  protected readonly chapter = computed(() => this.draft()?.chapters[this.chapterIndex()] ?? null);

  /** Live block list for the preview — the same blocks the reader would get. */
  protected readonly previewBlocks = computed<Block[]>(() => {
    const chapter = this.chapter();
    return chapter ? this.blocksOf(chapter) : [];
  });

  /**
   * Where an activity can go: after each paragraph, or before the first one.
   * Labels are the opening words of the paragraph, so the writer can aim.
   */
  /**
   * Every mark the story currently sets. Shown beside the paste box so the
   * writer can copy one into an `[[אם: …]]` run without remembering it.
   */
  protected readonly marks = computed(() => {
    const draft = this.draft();
    return draft ? marksInStory(fromDraft(draft)) : [];
  });

  protected readonly anchors = computed(() => {
    const chapter = this.chapter();
    const blocks = chapter ? blocksFromText(chapter.text) : [];
    const choices = [{ value: -1, label: 'לִפְנֵי הַפִּסְקָה הָרִאשׁוֹנָה' }];
    blocks.forEach((block, index) => {
      choices.push({ value: index, label: `אַחֲרֵי: ${previewOf(block, index)}` });
    });
    return choices;
  });

  constructor() {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (!this.dirty()) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    this.destroyRef.onDestroy(() => window.removeEventListener('beforeunload', onUnload));
  }

  /** The route guard asks this before letting the editor go. */
  canLeave(): boolean {
    if (!this.dirty()) return true;
    return confirm('יֵשׁ שִׁנּוּיִים שֶׁלֹּא נִשְׁמְרוּ. לָצֵאת בְּלִי לִשְׁמֹר?');
  }

  /* --- navigation inside the editor ------------------------------------- */

  protected backToList(): void {
    if (!this.confirmDiscard()) return;
    this.draft.set(null);
    this.dirty.set(false);
    this.view.set('list');
  }

  protected backToStory(): void {
    this.showPreview.set(false);
    this.view.set('story');
  }

  protected newStory(): void {
    if (!this.confirmDiscard()) return;
    this.draft.set({
      id: makeId('story'),
      originalId: null,
      title: '',
      blurb: '',
      cover: '',
      tagsText: '',
      chapters: [],
    });
    this.dirty.set(true);
    this.notice.set('');
    this.view.set('story');
  }

  protected edit(story: Story): void {
    if (!this.confirmDiscard()) return;
    this.draft.set(toDraft(story));
    this.dirty.set(false);
    this.notice.set('');
    this.view.set('story');
  }

  protected duplicate(story: Story): void {
    if (!this.confirmDiscard()) return;
    const draft = toDraft(story);
    this.draft.set({
      ...draft,
      id: makeId('story'),
      originalId: null,
      title: `${story.title} (עֹתֶק)`,
    });
    this.dirty.set(true);
    this.view.set('story');
  }

  protected remove(story: Story): void {
    const question = this.stories.isSeed(story.id)
      ? `לְהַסְתִּיר אֶת "${story.title}" מֵהַמַּכְשִׁיר הַזֶּה?`
      : `לִמְחֹק אֶת "${story.title}"? אֵין דֶּרֶךְ חֲזָרָה בְּלִי קֹבֶץ יְצוּא.`;
    if (!confirm(question)) return;
    this.stories.remove(story.id);
    this.notice.set(`"${story.title}" הוּסַר.`);
  }

  /** Undoes deleting a story that ships with the app. */
  protected restore(story: Story): void {
    this.stories.restoreSeed(story.id);
    this.notice.set(`"${story.title}" הוּחְזַר.`);
  }

  /* --- story fields ----------------------------------------------------- */

  protected setField(field: 'title' | 'blurb' | 'cover' | 'tagsText' | 'id', value: string): void {
    this.draft.update((draft) => (draft ? { ...draft, [field]: value } : draft));
    this.dirty.set(true);
  }

  /** A story cannot be saved onto a *different* story's id. */
  protected readonly idClash = computed(() => {
    const draft = this.draft();
    if (!draft) return false;
    const id = draft.id.trim();
    return id !== draft.originalId && this.stories.isIdTaken(id);
  });

  protected readonly canSave = computed(() => {
    const draft = this.draft();
    if (!draft) return false;
    return (
      draft.id.trim() !== '' &&
      draft.title.trim() !== '' &&
      draft.chapters.length > 0 &&
      draft.chapters.every((chapter) => chapter.title.trim() !== '') &&
      !this.idClash()
    );
  });

  protected save(): void {
    const draft = this.draft();
    if (!draft || !this.canSave()) return;
    const story = fromDraft(draft);
    // A renamed id would otherwise leave the old story behind as a twin.
    if (draft.originalId && draft.originalId !== story.id) this.stories.remove(draft.originalId);
    this.stories.save(story);
    this.draft.set({ ...draft, originalId: story.id });
    this.dirty.set(false);
    this.notice.set(`"${story.title}" נִשְׁמַר בַּמַּכְשִׁיר הַזֶּה.`);
  }

  /* --- chapters --------------------------------------------------------- */

  protected addChapter(): void {
    this.draft.update((draft) =>
      draft
        ? {
            ...draft,
            chapters: [
              ...draft.chapters,
              { id: makeId('ch'), title: '', text: '', activities: [] },
            ],
          }
        : draft,
    );
    this.dirty.set(true);
    this.chapterIndex.set((this.draft()?.chapters.length ?? 1) - 1);
    this.view.set('chapter');
  }

  protected openChapter(index: number): void {
    this.chapterIndex.set(index);
    this.showPreview.set(false);
    this.view.set('chapter');
  }

  protected moveChapter(index: number, delta: number): void {
    const target = index + delta;
    this.draft.update((draft) => {
      if (!draft || target < 0 || target >= draft.chapters.length) return draft;
      const chapters = [...draft.chapters];
      [chapters[index], chapters[target]] = [chapters[target], chapters[index]];
      return { ...draft, chapters };
    });
    this.dirty.set(true);
  }

  protected removeChapter(index: number): void {
    const chapter = this.draft()?.chapters[index];
    if (!chapter) return;
    if (!confirm(`לִמְחֹק אֶת "${chapter.title || 'הַפֶּרֶק'}"?`)) return;
    this.draft.update((draft) =>
      draft ? { ...draft, chapters: draft.chapters.filter((_, i) => i !== index) } : draft,
    );
    this.dirty.set(true);
  }

  protected setChapterField(field: 'title' | 'text', value: string): void {
    this.patchChapter((chapter) => ({ ...chapter, [field]: value }));
  }

  /* --- activities ------------------------------------------------------- */

  protected addActivity(): void {
    const anchors = this.anchors();
    this.patchChapter((chapter) => ({
      ...chapter,
      activities: [
        ...chapter.activities,
        {
          // Default to the end of what is written, which is where a stop
          // usually belongs while a chapter is still being drafted.
          after: anchors[anchors.length - 1]?.value ?? -1,
          kind: 'game',
          title: '',
          instructions: '',
          optionsText: '',
        },
      ],
    }));
  }

  protected setActivityText(
    index: number,
    field: 'title' | 'instructions' | 'optionsText',
    value: string,
  ): void {
    this.patchActivity(index, (activity) => ({ ...activity, [field]: value }));
  }

  protected setActivityKind(index: number, value: string): void {
    this.patchActivity(index, (activity) => ({
      ...activity,
      kind: value as ActivityKind | CalmToolId,
    }));
  }

  protected setActivityAnchor(index: number, value: string): void {
    this.patchActivity(index, (activity) => ({ ...activity, after: Number(value) }));
  }

  private patchActivity(index: number, change: (activity: ActivityDraft) => ActivityDraft): void {
    this.patchChapter((chapter) => ({
      ...chapter,
      activities: chapter.activities.map((activity, i) =>
        i === index ? change(activity) : activity,
      ),
    }));
  }

  protected removeActivity(index: number): void {
    this.patchChapter((chapter) => ({
      ...chapter,
      activities: chapter.activities.filter((_, i) => i !== index),
    }));
  }

  protected togglePreview(): void {
    this.showPreview.update((open) => !open);
  }

  /* --- import / export -------------------------------------------------- */

  protected toggleImport(): void {
    this.importOpen.update((open) => !open);
    this.importErrors.set([]);
    this.pending.set([]);
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.check(await file.text());
    // Let the same file be picked twice in a row after a fix.
    input.value = '';
  }

  protected check(raw: string): void {
    const { stories, errors } = parseImport(raw);
    this.importErrors.set(errors);
    this.pending.set(stories);
    // Nothing is written yet. Every clashing id defaults to the safe choice.
    this.conflictModes.set(
      Object.fromEntries(stories.map((story) => [story.id, 'copy' as ImportMode])),
    );
  }

  protected setMode(id: string, mode: ImportMode): void {
    this.conflictModes.update((modes) => ({ ...modes, [id]: mode }));
  }

  protected modeFor(id: string): ImportMode {
    return this.conflictModes()[id] ?? 'copy';
  }

  protected applyImport(): void {
    const outcome = this.stories.importStories(this.pending(), this.conflictModes());
    this.pending.set([]);
    this.importErrors.set([]);
    this.importOpen.set(false);
    this.notice.set(
      `יְבוּא הִסְתַּיֵּם: ${outcome.added} חֲדָשִׁים, ${outcome.replaced} הֻחְלְפוּ, ${outcome.copied} נִשְׁמְרוּ כְּעֹתֶק.`,
    );
  }

  protected exportAll(): void {
    const json = this.stories.exportJson();
    this.exportText.set(json);
    download('pelegames-stories.json', json);
  }

  protected async copyExport(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.exportText());
      this.notice.set('הַ־JSON הֹעְתַּק.');
    } catch {
      this.notice.set(
        'הַדַּפְדְּפָן חָסַם אֶת הַהַעְתָּקָה — אֶפְשָׁר לְסַמֵּן וּלְהַעְתִּיק יָדָנִית.',
      );
    }
  }

  /* --- helpers ---------------------------------------------------------- */

  private confirmDiscard(): boolean {
    if (!this.dirty()) return true;
    return confirm('יֵשׁ שִׁנּוּיִים שֶׁלֹּא נִשְׁמְרוּ. לְהַמְשִׁיךְ בְּלִי לִשְׁמֹר?');
  }

  private patchChapter(change: (chapter: ChapterDraft) => ChapterDraft): void {
    const index = this.chapterIndex();
    this.draft.update((draft) =>
      draft
        ? { ...draft, chapters: draft.chapters.map((c, i) => (i === index ? change(c) : c)) }
        : draft,
    );
    this.dirty.set(true);
  }

  private blocksOf(chapter: ChapterDraft): Block[] {
    return mergeActivities(
      blocksFromText(chapter.text, `${chapter.id}-`),
      chapter.activities.map((activity, index) => ({
        after: activity.after,
        block: stopFromDraft(activity, `${chapter.id}-a${index}`),
      })),
    );
  }
}

/* ==========================================================================
   Draft <-> stored story
   ========================================================================== */

function toDraft(story: Story): StoryDraft {
  return {
    id: story.id,
    originalId: story.id,
    title: story.title,
    blurb: story.blurb,
    cover: story.cover ?? '',
    tagsText: story.tags.join(', '),
    chapters: [...story.chapters]
      .sort((a, b) => a.order - b.order)
      .map((chapter) => {
        const { text, activities } = splitActivities(chapter.blocks);
        return {
          id: chapter.id,
          title: chapter.title,
          text: textFromBlocks(text),
          activities: activities.map(({ after, block }) => draftOfStop(after, block)),
        };
      }),
  };
}

function fromDraft(draft: StoryDraft): Story {
  const chapters: Chapter[] = draft.chapters.map((chapter, index) => ({
    id: chapter.id,
    title: chapter.title.trim(),
    order: index,
    blocks: mergeActivities(
      blocksFromText(chapter.text, `${chapter.id}-`),
      chapter.activities.map((activity, i) => ({
        after: activity.after,
        block: stopFromDraft(activity, `${chapter.id}-a${i}`),
      })),
    ),
  }));

  return {
    id: draft.id.trim(),
    title: draft.title.trim(),
    blurb: draft.blurb.trim(),
    cover: draft.cover.trim() || undefined,
    tags: draft.tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag !== ''),
    chapters,
  };
}

/** A stored stop, back into the one row the editor shows for it. */
function draftOfStop(after: number, block: StopBlock): ActivityDraft {
  if (block.kind === 'calm') {
    return {
      after,
      kind: block.tool,
      title: block.title ?? '',
      instructions: block.intro ?? '',
      optionsText: (block.steps ?? []).join('\n'),
    };
  }
  return {
    after,
    kind: block.activity,
    title: block.title,
    instructions: block.instructions,
    // A forking option comes back as `text = mark`, the way it was typed.
    optionsText: (block.options ?? [])
      .map((option) => (option.sets ? `${option.text} = ${option.sets}` : option.text))
      .join('\n'),
  };
}

/** One editor row becomes either an activity block or a calm block. */
function stopFromDraft(activity: ActivityDraft, id: string): StopBlock {
  if (isCalm(activity.kind)) {
    const steps = linesOf(activity.optionsText);
    return {
      id,
      kind: 'calm',
      tool: activity.kind,
      ...(activity.title.trim() ? { title: activity.title.trim() } : {}),
      ...(activity.instructions.trim() ? { intro: activity.instructions.trim() } : {}),
      ...(steps ? { steps } : {}),
    };
  }
  const options = optionsOf(activity.optionsText);
  return {
    id,
    kind: 'activity',
    activity: activity.kind,
    title: activity.title.trim(),
    instructions: activity.instructions.trim(),
    ...(options ? { options } : {}),
  };
}

function linesOf(text: string): string[] | undefined {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  return lines.length > 0 ? lines : undefined;
}

/**
 * `אפשרות = סימן` turns an option into a fork; a line with no equals sign is
 * only something to say out loud. The mark is what `[[אם: סימן]]` tests for.
 */
function optionsOf(text: string): ChoiceOption[] | undefined {
  const options = (linesOf(text) ?? []).map((line) => {
    const at = line.lastIndexOf('=');
    if (at === -1) return { text: line };
    const label = line.slice(0, at).trim();
    const sets = line.slice(at + 1).trim();
    return label && sets ? { text: label, sets } : { text: line };
  });
  return options.length > 0 ? options : undefined;
}

/** First few words of a block, for the "goes after…" menu. */
function previewOf(block: Block, index: number): string {
  const label = block.kind === 'scene' ? 'מַעֲבַר סְצֵנָה' : (block as { text: string }).text;
  const short = label.split(/\s+/).slice(0, 6).join(' ');
  return `${index + 1}. ${short}${label.length > short.length ? '…' : ''}`;
}

function download(filename: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
