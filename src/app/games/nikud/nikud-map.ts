import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Progress } from '../../core/progress';
import { NIKUD_SET_COUNT, NIKUD_SET_SIZE } from './nikud-sets';
import { Icon } from '../../shared/icon';
import { Mascot } from '../../shared/mascot';
import { StreamMap, type MapNode } from '../../shared/stream-map/stream-map';

/** The nikud game's brook: page chrome around the shared stream map. */
@Component({
  selector: 'pg-nikud-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Mascot, StreamMap],
  templateUrl: './nikud-map.html',
  styleUrl: './nikud-map.scss',
})
export class NikudMap {
  private readonly progress = inject(Progress);

  protected readonly color = this.progress.color;
  protected readonly hat = this.progress.hat;
  protected readonly coins = this.progress.coins;
  protected readonly maxStars = NIKUD_SET_COUNT * NIKUD_SET_SIZE * 3;

  protected readonly nodes = computed<MapNode[]>(() =>
    Array.from({ length: NIKUD_SET_COUNT }, (_, index) => ({
      index,
      unlocked: this.progress.isSetUnlocked('nikud', index),
      stars: this.progress.starsForSet('nikud', index),
      maxStars: NIKUD_SET_SIZE * 3,
      isNext: index === this.nextSet(),
    })),
  );

  private readonly nextSet = computed(() => {
    for (let i = 0; i < NIKUD_SET_COUNT; i++) {
      if (this.progress.starsForSet('nikud', i) < NIKUD_SET_SIZE * 3) return i;
    }
    return 0;
  });

  /** This game's own tally, not the cross-game total the hub shows. */
  protected readonly totalStars = computed(() =>
    this.nodes().reduce((sum, node) => sum + node.stars, 0),
  );
}
