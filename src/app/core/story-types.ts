import { CALM_TOOLS, isCalmToolId, type CalmToolId } from './calm-tools';

/**
 * The serialized-story content model.
 *
 * Content is data, never markup. A block carries plain text and the renderer
 * puts it on screen through Angular interpolation — an imported story can say
 * `<script>` all it likes and it arrives as six visible characters. Nothing in
 * this file ever produces HTML.
 *
 * Reading state (where she got to, how big she likes the text) lives in
 * `reading.ts`, deliberately apart from the stories themselves: content is
 * authored and exported, progress is private and stays on the device.
 */

/** What kind of pause an activity block asks for. */
export type ActivityKind = 'game' | 'choice' | 'move';

/**
 * What a block needs to be true before it is shown.
 *
 * This is what makes a choice change the story rather than decorate it: an
 * option sets a mark, and any later block — in this chapter or a later one —
 * can ask for it. A block with no `showIf` is always shown, which is every
 * block in a story that does not branch.
 */
export interface Conditional {
  /** Shown only when this mark is set. */
  showIf?: string;
  /** Hidden once this mark is set. */
  hideIf?: string;
}

export interface ParagraphBlock extends Conditional {
  id: string;
  kind: 'paragraph';
  text: string;
}

export interface HeadingBlock extends Conditional {
  id: string;
  kind: 'heading';
  text: string;
}

/**
 * Something written down inside the story — a ticket, a sign on a door, a
 * strip of paper. It is the story's own handwriting rather than its narration,
 * so it gets a card, and its line breaks are kept exactly as typed.
 */
export interface NoteBlock extends Conditional {
  id: string;
  kind: 'note';
  text: string;
}

/** A breath between scenes. Carries no text — it is punctuation. */
export interface SceneBlock extends Conditional {
  id: string;
  kind: 'scene';
}

/**
 * An illustration between paragraphs.
 *
 * `src` is a path under `public/` (so it ships with the app and works offline)
 * or a data URI. It is never fetched from a third party at read time: this app
 * makes no network requests, and a picture that needs the internet would be a
 * blank square on a plane.
 *
 * `alt` is what a screen reader says instead of the picture. An illustration
 * that only decorates prose that already describes it should carry `alt: ''`.
 */
export interface ImageBlock extends Conditional {
  id: string;
  kind: 'image';
  src: string;
  alt?: string;
  caption?: string;
}

/**
 * One thing that can be picked at a stop.
 *
 * `sets` is what turns a stop into a fork: the mark it writes is what later
 * blocks test with `showIf`. An option without one is a thing to say out loud
 * and nothing more — which is still most of them.
 */
export interface ChoiceOption {
  text: string;
  sets?: string;
}

/**
 * An optional stop between paragraphs. It has no right answer, no score and no
 * completion — `options` are things to say out loud, or, when they carry a
 * mark, the fork the story takes next.
 *
 * What is stored is the mark, never the words: "she chose the duck" is plot,
 * and plot is what the next chapter needs in order to make sense.
 */
export interface ActivityBlock extends Conditional {
  id: string;
  kind: 'activity';
  activity: ActivityKind;
  title: string;
  instructions: string;
  options?: ChoiceOption[];
}

/**
 * A calm tool, dropped into the chapter. The tool itself is a component named
 * in `calm-tools.ts`; a story picks one and may override its words, so adding
 * a story never means writing one.
 */
export interface CalmBlock extends Conditional {
  id: string;
  kind: 'calm';
  tool: CalmToolId;
  /** Overrides for this appearance. Anything absent falls back to the tool. */
  title?: string;
  intro?: string;
  steps?: string[];
  options?: string[];
}

export type Block =
  ParagraphBlock | HeadingBlock | SceneBlock | NoteBlock | ImageBlock | ActivityBlock | CalmBlock;

/** A block that pauses the reading — a stop or a calm tool. */
export type StopBlock = ActivityBlock | CalmBlock;

export function isStop(block: Block): block is StopBlock {
  return block.kind === 'activity' || block.kind === 'calm';
}

/**
 * Which blocks are on screen, given the marks set so far. Everything that
 * branches goes through here — the reader, the chapter list and the word
 * count all ask the same question.
 */
export function visibleBlocks(blocks: readonly Block[], marks: ReadonlySet<string>): Block[] {
  return blocks.filter(
    (block) =>
      (block.showIf === undefined || marks.has(block.showIf)) &&
      (block.hideIf === undefined || !marks.has(block.hideIf)),
  );
}

/** Every mark a story can set — what the editor offers when writing a condition. */
export function marksInStory(story: Story): string[] {
  const marks = new Set<string>();
  for (const chapter of story.chapters) {
    for (const block of chapter.blocks) {
      if (block.kind !== 'activity') continue;
      for (const option of block.options ?? []) {
        if (option.sets) marks.add(option.sets);
      }
    }
  }
  return [...marks].sort();
}

export interface Chapter {
  id: string;
  title: string;
  /** Position in the story, 0-based. The list is sorted by it, not by array order. */
  order: number;
  blocks: Block[];
}

/**
 * A cover is optional and there is no image pipeline in this app, so a story
 * without one is not broken — `story-cover.ts` draws a clay night scene from
 * the id instead. `cover` holds a URL or a data URI when one is supplied.
 */
export interface Story {
  id: string;
  title: string;
  blurb: string;
  cover?: string;
  tags: string[];
  chapters: Chapter[];
}

export const ACTIVITY_LABELS: Readonly<Record<ActivityKind, string>> = {
  game: 'מִשְׂחָק קָצָר',
  choice: 'בְּחִירָה',
  move: 'תַּרְגִּיל מְשֻׁתָּף',
};

/** A story that never sets a mark is linear, and the reader says nothing about forks. */
export function storyBranches(story: Story): boolean {
  return marksInStory(story).length > 0;
}

export const ACTIVITY_ICONS: Readonly<Record<ActivityKind, string>> = {
  game: 'sparkle',
  choice: 'compass',
  move: 'heart',
};

/* ==========================================================================
   Reading time
   ========================================================================== */

/**
 * Read *aloud*, not skimmed. 120 words a minute is an unhurried bedtime pace;
 * silent reading rates would promise a chapter is shorter than the evening is.
 */
const WORDS_PER_MINUTE = 120;

export function wordCount(chapter: Chapter): number {
  return chapter.blocks.reduce((sum, block) => sum + blockWords(block), 0);
}

/**
 * What this reading of the chapter costs, given the forks already taken. A
 * branching chapter is shorter than the sum of all its branches.
 */
export function wordCountFor(chapter: Chapter, marks: ReadonlySet<string>): number {
  return visibleBlocks(chapter.blocks, marks).reduce((sum, block) => sum + blockWords(block), 0);
}

function blockWords(block: Block): number {
  switch (block.kind) {
    case 'paragraph':
    case 'heading':
    case 'note':
      return countWords(block.text);
    case 'activity':
      // An activity is read out too, so its instructions count toward the clock.
      return countWords(block.title) + countWords(block.instructions);
    case 'calm':
      // A calm tool is a known length rather than a length of text.
      return Math.round((CALM_TOOLS[block.tool].seconds / 60) * WORDS_PER_MINUTE);
    case 'image':
      // Looking at a picture together is not free, but it is not reading either.
      return countWords(block.caption ?? '') + 10;
    case 'scene':
      return 0;
  }
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

/** Never 0 — a one-line chapter still takes a minute to read to someone. */
export function readingMinutes(chapters: readonly Chapter[]): number {
  const words = chapters.reduce((sum, chapter) => sum + wordCount(chapter), 0);
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function chaptersInOrder(story: Story): Chapter[] {
  return [...story.chapters].sort((a, b) => a.order - b.order);
}

/* ==========================================================================
   Plain text <-> blocks
   ========================================================================== */

/**
 * The editor's big paste box. Blank lines separate paragraphs — that is the
 * whole rule, so pasting a chapter out of a document keeps its shape.
 *
 * Four escape hatches exist so structure does not require hand-written JSON:
 * a line starting `## ` is a sub-heading, a line of three or more dashes is a
 * scene break, a run of lines starting `> ` is a note card with its line
 * breaks intact, and everything between `[[אם: סימן]]` and `[[סוף]]` is shown
 * only once a choice has set that mark. `[[אם: !סימן]]` is the opposite.
 */
export function blocksFromText(text: string, seed = 'b'): Block[] {
  const blocks: Block[] = [];
  let n = 0;
  const nextId = () => `${seed}${++n}`;

  /** The condition currently in force, from an open `[[אם: …]]` run. */
  let showIf: string | undefined;
  let hideIf: string | undefined;
  const when = (): Conditional => ({
    ...(showIf ? { showIf } : {}),
    ...(hideIf ? { hideIf } : {}),
  });

  for (const chunk of text.split(/\n\s*\n+/)) {
    const piece = chunk.trim();
    if (piece === '') continue;

    const open = piece.match(/^\[\[(?:אם|if)\s*:?\s*(!?)\s*(.+?)\]\]$/);
    if (open) {
      const mark = open[2].trim();
      showIf = open[1] === '!' ? undefined : mark;
      hideIf = open[1] === '!' ? mark : undefined;
      continue;
    }
    if (/^\[\[(?:סוף|end)\]\]$/.test(piece)) {
      showIf = undefined;
      hideIf = undefined;
      continue;
    }

    if (/^-{3,}$/.test(piece)) {
      blocks.push({ id: nextId(), kind: 'scene', ...when() });
      continue;
    }
    if (piece.startsWith('## ')) {
      blocks.push({ id: nextId(), kind: 'heading', text: piece.slice(3).trim(), ...when() });
      continue;
    }
    const picture = piece.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*(.*)$/s);
    if (picture) {
      const alt = picture[1].trim();
      const caption = picture[3].trim();
      blocks.push({
        id: nextId(),
        kind: 'image',
        src: picture[2].trim(),
        ...(alt ? { alt } : {}),
        ...(caption ? { caption } : {}),
        ...when(),
      });
      continue;
    }
    if (piece.startsWith('> ')) {
      const note = piece
        .split('\n')
        .map((line) => line.replace(/^\s*>\s?/, '').trimEnd())
        .join('\n')
        .trim();
      blocks.push({ id: nextId(), kind: 'note', text: note, ...when() });
      continue;
    }
    // Single newlines inside a paragraph are soft wraps from the source, not
    // breaks the reader should see.
    blocks.push({
      id: nextId(),
      kind: 'paragraph',
      text: piece.replace(/\s*\n\s*/g, ' '),
      ...when(),
    });
  }
  return blocks;
}

/** The inverse, so opening a chapter in the editor shows what was pasted in. */
export function textFromBlocks(blocks: readonly Block[]): string {
  const out: string[] = [];
  /** The condition the last line was written under, so runs are not reopened. */
  let open: string | undefined;

  for (const block of blocks) {
    if (block.kind === 'activity' || block.kind === 'calm') continue;

    const wanted = block.showIf ?? (block.hideIf ? `!${block.hideIf}` : undefined);
    if (wanted !== open) {
      if (open !== undefined) out.push('[[סוף]]');
      if (wanted !== undefined) out.push(`[[אם: ${wanted}]]`);
      open = wanted;
    }

    switch (block.kind) {
      case 'heading':
        out.push(`## ${block.text}`);
        break;
      case 'scene':
        out.push('---');
        break;
      case 'image':
        out.push(
          `![${block.alt ?? ''}](${block.src})${
            block.caption
              ? `
${block.caption}`
              : ''
          }`,
        );
        break;
      case 'note':
        out.push(
          block.text
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n'),
        );
        break;
      default:
        out.push(block.text);
    }
  }
  if (open !== undefined) out.push('[[סוף]]');
  return out.join('\n\n');
}

/**
 * Activities are edited as a separate list with a "goes after paragraph N"
 * anchor, so the writer never has to keep them straight inside the prose box.
 * `after` counts text blocks; -1 puts the activity before the first one.
 */
export interface AnchoredActivity {
  after: number;
  block: StopBlock;
}

export function splitActivities(blocks: readonly Block[]): {
  text: Block[];
  activities: AnchoredActivity[];
} {
  const text: Block[] = [];
  const activities: AnchoredActivity[] = [];
  for (const block of blocks) {
    if (isStop(block)) activities.push({ after: text.length - 1, block });
    else text.push(block);
  }
  return { text, activities };
}

export function mergeActivities(
  text: readonly Block[],
  activities: readonly AnchoredActivity[],
): Block[] {
  const merged: Block[] = [];
  const before = (index: number) => activities.filter((a) => a.after === index).map((a) => a.block);

  merged.push(...before(-1));
  text.forEach((block, index) => {
    merged.push(block);
    merged.push(...before(index));
  });
  // An anchor past the end (a paragraph was deleted under it) lands at the end
  // rather than vanishing.
  const maxAnchor = text.length - 1;
  merged.push(...activities.filter((a) => a.after > maxAnchor).map((a) => a.block));
  return merged;
}

/* ==========================================================================
   Ids
   ========================================================================== */

/** Stable, readable, and collision-resistant enough for a single device. */
export function makeId(prefix: string): string {
  const stamp = Date.now().toString(36);
  const noise = Math.floor(Math.random() * 1296)
    .toString(36)
    .padStart(2, '0');
  return `${prefix}-${stamp}${noise}`;
}

/* ==========================================================================
   Import validation
   ========================================================================== */

export interface ImportResult {
  stories: Story[];
  /** Human-readable, Hebrew, and specific about which story was wrong. */
  errors: string[];
}

/**
 * Import is strict on shape and forgiving on extras. Anything malformed is
 * reported by name and dropped; a half-valid file still yields its good
 * stories rather than failing whole. Nothing here overwrites anything — the
 * caller decides what to do about ids that already exist.
 */
export function parseImport(raw: string): ImportResult {
  const errors: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { stories: [], errors: ['הַקֹּבֶץ אֵינוֹ JSON תָּקִין.'] };
  }

  const list = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data['stories'])
      ? (data['stories'] as unknown[])
      : null;

  if (list === null) {
    return { stories: [], errors: ['הַקֹּבֶץ אֵינוֹ רְשִׁימַת סִפּוּרִים.'] };
  }

  const stories: Story[] = [];
  list.forEach((item, index) => {
    const story = validateStory(item, index, errors);
    if (story) stories.push(story);
  });
  if (stories.length === 0 && errors.length === 0)
    errors.push('לֹא נִמְצְאוּ סִפּוּרִים בַּקֹּבֶץ.');
  return { stories, errors };
}

function validateStory(raw: unknown, index: number, errors: string[]): Story | null {
  const where = `סִפּוּר ${index + 1}`;
  if (!isRecord(raw)) {
    errors.push(`${where}: לֹא אוֹבְּיֶקְט.`);
    return null;
  }
  const id = text(raw['id']);
  const title = text(raw['title']);
  if (!id) {
    errors.push(`${where}: חָסֵר מְזַהֶה (id).`);
    return null;
  }
  if (!title) {
    errors.push(`${where} (${id}): חֲסֵרָה כּוֹתֶרֶת.`);
    return null;
  }
  if (!Array.isArray(raw['chapters'])) {
    errors.push(`${title}: חֲסֵרָה רְשִׁימַת פְּרָקִים.`);
    return null;
  }

  const chapters: Chapter[] = [];
  (raw['chapters'] as unknown[]).forEach((rawChapter, ci) => {
    const chapter = validateChapter(rawChapter, ci, title, errors);
    if (chapter) chapters.push(chapter);
  });
  if (chapters.length === 0) {
    errors.push(`${title}: אֵין אַף פֶּרֶק תָּקִין.`);
    return null;
  }

  return {
    id,
    title,
    blurb: text(raw['blurb']) ?? '',
    cover: text(raw['cover']) ?? undefined,
    tags: Array.isArray(raw['tags']) ? (raw['tags'] as unknown[]).map(String) : [],
    chapters,
  };
}

function validateChapter(
  raw: unknown,
  index: number,
  storyTitle: string,
  errors: string[],
): Chapter | null {
  const where = `${storyTitle}, פֶּרֶק ${index + 1}`;
  if (!isRecord(raw)) {
    errors.push(`${where}: לֹא אוֹבְּיֶקְט.`);
    return null;
  }
  const title = text(raw['title']);
  if (!title) {
    errors.push(`${where}: חֲסֵרָה כּוֹתֶרֶת.`);
    return null;
  }
  if (!Array.isArray(raw['blocks'])) {
    errors.push(`${where}: חָסֵר תֹּכֶן (blocks).`);
    return null;
  }

  const blocks: Block[] = [];
  (raw['blocks'] as unknown[]).forEach((rawBlock, bi) => {
    const block = validateBlock(rawBlock, `${index}-${bi}`);
    if (block) blocks.push(block);
  });
  if (blocks.length === 0) {
    errors.push(`${where}: אֵין אַף בְּלוֹק תֹּכֶן תָּקִין.`);
    return null;
  }

  const order = typeof raw['order'] === 'number' ? raw['order'] : index;
  return { id: text(raw['id']) ?? `c${index + 1}`, title, order, blocks };
}

function validateBlock(raw: unknown, fallbackId: string): Block | null {
  if (!isRecord(raw)) return null;
  const id = text(raw['id']) ?? `b${fallbackId}`;
  const kind = text(raw['kind']);
  // A condition on an unknown mark is harmless: the block simply never shows,
  // which is safer than dropping it and silently changing the story.
  const when: Conditional = {
    ...(text(raw['showIf']) ? { showIf: text(raw['showIf']) as string } : {}),
    ...(text(raw['hideIf']) ? { hideIf: text(raw['hideIf']) as string } : {}),
  };

  if (kind === 'scene') return { id, kind: 'scene', ...when };

  if (kind === 'image') {
    const src = text(raw['src']);
    if (!src) return null;
    // No `javascript:` or other scheme games: an illustration is a file that
    // ships with the story, and Angular sanitises the binding on top of this.
    if (!/^(?:[\w./-]|%[0-9a-fA-F]{2})+$/.test(src) && !src.startsWith('data:image/')) return null;
    return {
      id,
      kind: 'image',
      src,
      ...(text(raw['alt']) ? { alt: text(raw['alt']) as string } : {}),
      ...(text(raw['caption']) ? { caption: text(raw['caption']) as string } : {}),
      ...when,
    };
  }
  if (kind === 'paragraph' || kind === 'heading' || kind === 'note') {
    const body = text(raw['text']);
    return body ? { id, kind, text: body, ...when } : null;
  }

  if (kind === 'activity') {
    const activity = text(raw['activity']);
    const title = text(raw['title']);
    const instructions = text(raw['instructions']);
    if (!title || !instructions) return null;
    const options = validateOptions(raw['options']);
    return {
      id,
      kind: 'activity',
      activity: isActivityKind(activity) ? activity : 'game',
      title,
      instructions,
      ...(options ? { options } : {}),
      ...when,
    };
  }

  if (kind === 'calm') {
    // An unknown tool is not guessed at: a made-up name would render as
    // whatever happened to be first in the registry.
    if (!isCalmToolId(raw['tool'])) return null;
    const steps = Array.isArray(raw['steps'])
      ? (raw['steps'] as unknown[]).map(String).filter((line) => line.trim() !== '')
      : undefined;
    const options = Array.isArray(raw['options'])
      ? (raw['options'] as unknown[])
          .map((option) => (isRecord(option) ? String(option['text'] ?? '') : String(option ?? '')))
          .filter((line) => line.trim() !== '')
      : undefined;
    return {
      id,
      kind: 'calm',
      tool: raw['tool'],
      ...(text(raw['title']) ? { title: text(raw['title']) as string } : {}),
      ...(text(raw['intro']) ? { intro: text(raw['intro']) as string } : {}),
      ...(steps && steps.length > 0 ? { steps } : {}),
      ...(options && options.length > 0 ? { options } : {}),
      ...when,
    };
  }

  return null;
}

/**
 * Options arrive either as plain strings (a stop that only asks) or as
 * `{ text, sets }` (a stop that forks). Both shapes stay readable in a file
 * someone edited by hand, so both are accepted.
 */
function validateOptions(raw: unknown): ChoiceOption[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const options: ChoiceOption[] = [];
  for (const item of raw as unknown[]) {
    if (typeof item === 'string') {
      if (item.trim() !== '') options.push({ text: item.trim() });
      continue;
    }
    if (!isRecord(item)) continue;
    const label = text(item['text']);
    if (!label) continue;
    const sets = text(item['sets']);
    options.push({ text: label, ...(sets ? { sets } : {}) });
  }
  return options.length > 0 ? options : undefined;
}

function isActivityKind(value: string | null): value is ActivityKind {
  return value === 'game' || value === 'choice' || value === 'move';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Trims, and treats an empty string as absent — an import full of `""` is not valid content. */
function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
