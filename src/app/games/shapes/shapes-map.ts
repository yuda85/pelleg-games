import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Progress } from '../../core/progress';
import { Icon } from '../../shared/icon';
import { Mascot } from '../../shared/mascot';
import { StreamMap, type MapNode } from '../../shared/stream-map/stream-map';
import { SHAPES_SET_COUNT, SHAPES_SET_SIZE } from './shapes-engine';

/** The shapes game's brook: page chrome around the shared stream map. */
@Component({
  selector: 'pg-shapes-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Mascot, StreamMap],
  templateUrl: './shapes-map.html',
  styleUrl: './shapes-map.scss',
})
export class ShapesMap {
  private readonly progress = inject(Progress);

  protected readonly color = this.progress.color;
  protected readonly hat = this.progress.hat;
  protected readonly coins = this.progress.coins;
  protected readonly maxStars = SHAPES_SET_COUNT * SHAPES_SET_SIZE * 3;

  protected readonly nodes = computed<MapNode[]>(() =>
    Array.from({ length: SHAPES_SET_COUNT }, (_, index) => ({
      index,
      unlocked: this.progress.isSetUnlocked('shapes', index),
      stars: this.progress.starsForSet('shapes', index),
      maxStars: SHAPES_SET_SIZE * 3,
      isNext: index === this.nextSet(),
    })),
  );

  private readonly nextSet = computed(() => {
    for (let i = 0; i < SHAPES_SET_COUNT; i++) {
      if (this.progress.starsForSet('shapes', i) < SHAPES_SET_SIZE * 3) return i;
    }
    return 0;
  });

  protected readonly totalStars = computed(() =>
    this.nodes().reduce((sum, node) => sum + node.stars, 0),
  );
}
