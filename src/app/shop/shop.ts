import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { COLORS, HATS } from '../core/cosmetics';
import { Progress } from '../core/progress';
import { Audio } from '../core/sfx';
import { Icon } from '../shared/icon';
import { Mascot } from '../shared/mascot';

/**
 * Coins buy looks for טִפִּי and nothing else — no lives, no hints, no shortcuts.
 * Spending can never make the game easier, so it can never make it emptier.
 */
@Component({
  selector: 'pg-shop',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Mascot],
  templateUrl: './shop.html',
  styleUrl: './shop.scss',
})
export class Shop {
  private readonly progress = inject(Progress);
  private readonly audio = inject(Audio);

  protected readonly colors = COLORS;
  protected readonly hats = HATS;

  protected readonly coins = this.progress.coins;
  protected readonly color = this.progress.color;
  protected readonly hat = this.progress.hat;

  /** Shows the item under the cursor on the mascot before any coins are spent. */
  protected readonly previewColor = signal<string | null>(null);
  protected readonly previewHat = signal<string | null>(null);
  protected readonly denied = signal<string | null>(null);

  protected readonly shownColor = computed(() => this.previewColor() ?? this.color());
  protected readonly shownHat = computed(() =>
    this.previewHat() === null ? this.hat() : this.previewHat(),
  );

  protected owns(id: string): boolean {
    // A free item is owned from the first launch, so the shop is never a wall.
    return this.isFree(id) || this.progress.owned().includes(id);
  }

  private isFree(id: string): boolean {
    return [...COLORS, ...HATS].some((item) => item.id === id && item.price === 0);
  }

  protected pickColor(id: string, price: number): void {
    if (this.owns(id)) {
      this.progress.equipColor(id);
      this.audio.play('place');
      return;
    }
    this.attemptBuy(id, price, () => this.progress.equipColor(id));
  }

  protected pickHat(id: string, price: number): void {
    if (this.owns(id)) {
      // Tapping the worn hat takes it off — the bare droplet is a valid look.
      this.progress.equipHat(this.hat() === id ? null : id);
      this.audio.play('place');
      return;
    }
    this.attemptBuy(id, price, () => this.progress.equipHat(id));
  }

  protected removeHat(): void {
    this.progress.equipHat(null);
    this.audio.play('pick');
  }

  private attemptBuy(id: string, price: number, onBought: () => void): void {
    if (this.progress.buy(id, price)) {
      this.audio.play('coin');
      onBought();
      return;
    }
    // Not enough coins: say so on the card and move on. No modal, no scolding.
    this.audio.play('wrong');
    this.denied.set(id);
    setTimeout(() => this.denied.set(null), 1200);
  }
}
