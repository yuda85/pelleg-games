import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Progress } from '../core/progress';
import { Audio } from '../core/sfx';
import { Icon } from '../shared/icon';
import { Doll } from './doll';
import { SLOTS, garmentsFor, type Garment, type Slot } from './wardrobe';

/**
 * The dressing room. Not a game — no map, no stars, nothing to win.
 *
 * It is where the coins go. The three games pay out and this spends, which is
 * what stops the coins from being a number that only ever goes up.
 */
@Component({
  selector: 'pg-dressup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Doll],
  templateUrl: './dressup.html',
  styleUrl: './dressup.scss',
})
export class Dressup {
  private readonly progress = inject(Progress);
  private readonly audio = inject(Audio);

  protected readonly slots = SLOTS;
  protected readonly coins = this.progress.coins;
  protected readonly openSlot = signal<Slot>('outfit');
  /** Set briefly when she taps something she cannot afford yet. */
  protected readonly denied = signal<string | null>(null);

  protected readonly worn = computed(() => ({
    outfit: this.progress.wearing('outfit'),
    hair: this.progress.wearing('hair'),
    shoes: this.progress.wearing('shoes'),
    extra: this.progress.wearing('extra'),
  }));

  protected readonly rack = computed(() => garmentsFor(this.openSlot()));

  protected owns(item: Garment): boolean {
    return item.price === 0 || this.progress.owned().includes(item.id);
  }

  protected isWorn(item: Garment): boolean {
    return this.progress.wearing(item.slot) === item.id;
  }

  protected pick(item: Garment): void {
    if (this.owns(item)) {
      this.progress.wear(item.slot, item.id);
      this.audio.play('place');
      return;
    }

    if (this.progress.buy(item.id, item.price)) {
      this.audio.play('coin');
      this.progress.wear(item.slot, item.id);
      return;
    }

    // Not enough coins: say so on the card and move on. No modal, no scolding.
    this.audio.play('wrong');
    this.denied.set(item.id);
    setTimeout(() => this.denied.set(null), 1200);
  }

  protected strip(): void {
    for (const slot of SLOTS) {
      if (this.progress.wearing(slot.id))
        this.progress.wear(slot.id, this.progress.wearing(slot.id));
    }
    this.audio.play('pick');
  }
}
