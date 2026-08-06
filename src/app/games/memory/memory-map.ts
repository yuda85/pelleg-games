import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Progress } from '../../core/progress';
import { Icon } from '../../shared/icon';
import { Mascot } from '../../shared/mascot';
import { StreamMap, type MapNode } from '../../shared/stream-map/stream-map';
import { MEMORY_SET_COUNT, MEMORY_SET_SIZE } from './memory-engine';

/** The memory game's brook: page chrome around the shared stream map. */
@Component({
  selector: 'pg-memory-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Mascot, StreamMap],
  templateUrl: './memory-map.html',
  styleUrl: './memory-map.scss',
})
export class MemoryMap {
  private readonly progress = inject(Progress);

  protected readonly color = this.progress.color;
  protected readonly hat = this.progress.hat;
  protected readonly coins = this.progress.coins;
  protected readonly maxStars = MEMORY_SET_COUNT * MEMORY_SET_SIZE * 3;

  protected readonly nodes = computed<MapNode[]>(() =>
    Array.from({ length: MEMORY_SET_COUNT }, (_, index) => ({
      index,
      unlocked: this.progress.isSetUnlocked('memory', index),
      stars: this.progress.starsForSet('memory', index),
      maxStars: MEMORY_SET_SIZE * 3,
      isNext: index === this.nextSet(),
    })),
  );

  private readonly nextSet = computed(() => {
    for (let i = 0; i < MEMORY_SET_COUNT; i++) {
      if (this.progress.starsForSet('memory', i) < MEMORY_SET_SIZE * 3) return i;
    }
    return 0;
  });

  protected readonly totalStars = computed(() =>
    this.nodes().reduce((sum, node) => sum + node.stars, 0),
  );
}
