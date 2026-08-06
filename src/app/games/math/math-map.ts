import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Progress } from '../../core/progress';
import { Icon } from '../../shared/icon';
import { Mascot } from '../../shared/mascot';
import { StreamMap, type MapNode } from '../../shared/stream-map/stream-map';
import { MATH_SET_COUNT, MATH_SET_SIZE } from './math-engine';

/** The maths game's brook: page chrome around the shared stream map. */
@Component({
  selector: 'pg-math-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Mascot, StreamMap],
  templateUrl: './math-map.html',
  styleUrl: './math-map.scss',
})
export class MathMap {
  private readonly progress = inject(Progress);

  protected readonly color = this.progress.color;
  protected readonly hat = this.progress.hat;
  protected readonly coins = this.progress.coins;
  protected readonly maxStars = MATH_SET_COUNT * MATH_SET_SIZE * 3;

  protected readonly nodes = computed<MapNode[]>(() =>
    Array.from({ length: MATH_SET_COUNT }, (_, index) => ({
      index,
      unlocked: this.progress.isSetUnlocked('math', index),
      stars: this.progress.starsForSet('math', index),
      maxStars: MATH_SET_SIZE * 3,
      isNext: index === this.nextSet(),
    })),
  );

  private readonly nextSet = computed(() => {
    for (let i = 0; i < MATH_SET_COUNT; i++) {
      if (this.progress.starsForSet('math', i) < MATH_SET_SIZE * 3) return i;
    }
    return 0;
  });

  protected readonly totalStars = computed(() =>
    this.nodes().reduce((sum, node) => sum + node.stars, 0),
  );
}
