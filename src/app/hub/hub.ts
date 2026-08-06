import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Progress } from '../core/progress';
import { Speech } from '../core/speech';
import { Icon } from '../shared/icon';
import { Mascot } from '../shared/mascot';

interface GameCard {
  id: string;
  title: string;
  blurb: string;
  route: string | null;
  icon: string;
  tint: string;
}

/**
 * The shelf. One game is built; the rest are named so the room they will live
 * in is obvious — a card that says "בְּקָרוֹב" is honest, a card that lies is not.
 */
const GAMES: readonly GameCard[] = [
  {
    id: 'nikud',
    title: 'נַחַל הַנִּקּוּד',
    blurb: 'גְּרֹרִי אֶת הַטִּפּוֹת לַמָּקוֹם הַנָּכוֹן בַּמִּלָּה',
    route: '/nikud',
    icon: 'sparkle',
    tint: 'aqua',
  },
  {
    id: 'math',
    title: 'קְפִיצַת הַמִּסְפָּרִים',
    blurb: 'קִפְצִי עַל הָאֶבֶן עִם הַתְּשׁוּבָה הַנְּכוֹנָה',
    route: '/math',
    icon: 'star',
    tint: 'grape',
  },
  {
    id: 'memory',
    title: 'זִכָּרוֹן מִלִּים',
    blurb: 'פִּתְחִי צְדָפוֹת וּמָצְאִי אֶת הַזּוּגוֹת',
    route: '/memory',
    icon: 'heart',
    tint: 'mango',
  },
  {
    id: 'shapes',
    title: 'עוֹלַם הַצּוּרוֹת',
    blurb: 'סוֹבְבִי אֶת הַצּוּרָה וְגַלִּי אוֹתָהּ',
    route: '/shapes',
    icon: 'bag',
    tint: 'mint',
  },
  {
    id: 'dressup',
    title: 'חֲדַר הַהַלְבָּשָׁה',
    blurb: 'הַלְבִּישִׁי אֶת הַבֻּבָּה בְּמַטְבְּעוֹת שֶׁהִרְוַחְתְּ',
    route: '/dressup',
    icon: 'heart',
    tint: 'rose',
  },
];

@Component({
  selector: 'pg-hub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Mascot],
  templateUrl: './hub.html',
  styleUrl: './hub.scss',
})
export class Hub {
  private readonly progress = inject(Progress);
  private readonly speech = inject(Speech);

  protected readonly games = GAMES;
  protected readonly settingsOpen = signal(false);

  protected readonly coins = this.progress.coins;
  protected readonly color = this.progress.color;
  protected readonly hat = this.progress.hat;
  protected readonly totalStars = this.progress.totalStars;
  protected readonly stickerCount = computed(() => this.progress.stickers().length);
  protected readonly soundOn = this.progress.soundOn;
  protected readonly speechOn = this.progress.speechOn;
  protected readonly chill = this.progress.chill;
  protected readonly speechAvailable = this.speech.available;

  protected toggle(key: 'soundOn' | 'speechOn' | 'chill'): void {
    this.progress.toggle(key);
  }

  protected toggleSettings(): void {
    this.settingsOpen.update((open) => !open);
  }
}
