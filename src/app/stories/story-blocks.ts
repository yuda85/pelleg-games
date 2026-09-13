import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Icon } from '../shared/icon';
import {
  ACTIVITY_ICONS,
  ACTIVITY_LABELS,
  visibleBlocks,
  type ActivityBlock,
  type Block,
  type ChoiceOption,
} from '../core/story-types';
import { CalmCard } from './calm-card';

/** What the reader needs to know when an option carrying a mark is picked. */
export interface ChoiceMade {
  blockId: string;
  index: number;
  option: ChoiceOption;
  /** The other marks this stop could set, so the previous one can be dropped. */
  siblings: string[];
}

/**
 * Renders a chapter's blocks.
 *
 * Shared by the reading screen and by the editor's preview, so what a writer
 * sees while editing is the same component the child reads — not a second
 * implementation that drifts.
 *
 * **Every string here goes through interpolation.** There is no `innerHTML`
 * anywhere in the stories feature: imported content is text, and markup in it
 * shows up as characters rather than running.
 */
@Component({
  selector: 'pg-story-blocks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, CalmCard],
  templateUrl: './story-blocks.html',
  styleUrl: './story-blocks.scss',
})
export class StoryBlocks {
  readonly blocks = input.required<readonly Block[]>();
  /** The editor's preview opens every stop, so the writer can see what she wrote. */
  readonly openAll = input(false);
  /** Marks set so far. A block asking for one it does not have stays off screen. */
  readonly marks = input<ReadonlySet<string>>(new Set<string>());
  /** Which option shows as chosen at each forking stop, by block id. */
  readonly picks = input<Readonly<Record<string, number>>>({});

  readonly chosen = output<ChoiceMade>();
  readonly unchosen = output<ChoiceMade>();

  private readonly opened = signal<ReadonlySet<string>>(new Set());

  /** What is actually on the page once the forks are applied. */
  protected readonly shown = computed(() => visibleBlocks(this.blocks(), this.marks()));

  protected isOpen(id: string): boolean {
    return this.openAll() || this.opened().has(id);
  }

  protected toggle(id: string): void {
    this.opened.update((open) => {
      const next = new Set(open);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected labelFor(block: Block): string {
    return block.kind === 'activity' ? ACTIVITY_LABELS[block.activity] : '';
  }

  protected iconFor(block: Block): string {
    return block.kind === 'activity' ? ACTIVITY_ICONS[block.activity] : 'sparkle';
  }

  /** A stop only forks the story when at least one of its options sets a mark. */
  protected forks(block: ActivityBlock): boolean {
    return (block.options ?? []).some((option) => option.sets !== undefined);
  }

  protected pickedIndex(block: ActivityBlock): number {
    return this.picks()[block.id] ?? -1;
  }

  protected choose(block: ActivityBlock, index: number): void {
    const option = block.options?.[index];
    if (!option || !this.forks(block)) return;
    const event: ChoiceMade = { blockId: block.id, index, option, siblings: siblingMarks(block) };
    // Tapping the chosen option again takes the fork back, so the story can be
    // read down the other branch without starting over.
    if (this.pickedIndex(block) === index) this.unchosen.emit(event);
    else this.chosen.emit(event);
  }
}

function siblingMarks(block: ActivityBlock): string[] {
  return (block.options ?? [])
    .map((option) => option.sets)
    .filter((mark): mark is string => mark !== undefined);
}
