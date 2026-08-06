import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon';

/** One pip per question in a run, plus a final pip for the bonus round. */
@Component({
  selector: 'pg-pips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <ol class="pips" aria-label="הַתְקַדְּמוּת בַּסִּבּוּב">
      @for (slot of slots(); track slot) {
        <li
          class="pip"
          [class.pip--done]="slot < done()"
          [class.pip--now]="slot === current() && slot >= done()"
          [attr.aria-current]="slot === current() && slot >= done() ? 'step' : null"
        >
          @if (scores()[slot]; as score) {
            <span class="pip__stars">{{ score }}</span>
          }
        </li>
      }
      <li class="pip pip--bonus" [class.pip--done]="bonusDone()">
        <pg-icon name="sparkle" [size]="14" />
      </li>
    </ol>
  `,
  styleUrl: './pips.scss',
})
export class Pips {
  readonly total = input.required<number>();
  /** How many questions are banked — those pips fill. */
  readonly done = input.required<number>();
  readonly current = input.required<number>();
  readonly scores = input<readonly number[]>([]);
  readonly bonusDone = input(false);

  protected readonly slots = computed(() => Array.from({ length: this.total() }, (_, i) => i));
}
