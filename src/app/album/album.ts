import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { STICKERS } from '../core/cosmetics';
import { Progress, type GameId } from '../core/progress';
import { Icon } from '../shared/icon';
import { StickerArt } from './sticker-art';

/**
 * One sticker per finished set. Locked slots show the shape as a silhouette —
 * seeing what is still missing is most of what makes a collection worth filling.
 */
@Component({
  selector: 'pg-album',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, StickerArt],
  templateUrl: './album.html',
  styleUrl: './album.scss',
})
export class Album {
  private readonly progress = inject(Progress);

  protected readonly owned = this.progress.stickers;

  /** One sheet per game, so a set's reward is filed where she earned it. */
  private readonly games: readonly { game: GameId; title: string }[] = [
    { game: 'nikud', title: 'נַחַל הַנִּקּוּד' },
    { game: 'math', title: 'קְפִיצַת הַמִּסְפָּרִים' },
    { game: 'memory', title: 'זִכָּרוֹן מִלִּים' },
    { game: 'shapes', title: 'עוֹלַם הַצּוּרוֹת' },
  ];

  protected readonly groups = computed(() => {
    const owned = this.owned();
    return this.games.map(({ game, title }) => ({
      title,
      slots: STICKERS.filter((s) => s.game === game).map((s) => ({
        ...s,
        unlocked: owned.includes(s.id),
      })),
    }));
  });

  protected readonly count = computed(() => this.owned().length);
  protected readonly total = STICKERS.length;
}
