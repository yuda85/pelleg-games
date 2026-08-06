import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  HATAF_PATAH,
  HATAF_QAMATS,
  HATAF_SEGOL,
  HIRIQ,
  HOLAM,
  PATAH,
  QAMATS,
  QUBUTS,
  SEGOL,
  SHEVA,
  SHIN_DOT,
  SIN_DOT,
  TSERE,
} from '../core/hebrew';

/**
 * Draws a nikud mark on its own, large and at full contrast.
 *
 * Set as type, a lone mark is a two-pixel speck rendered on a faint ◌ — the
 * single most important thing on screen, and the least legible. Worse, an
 * isolated dot can't distinguish חיריק (below the letter) from חוֹלָם (above it),
 * or שׁ from שׂ. Drawing the marks means the size, the weight and above all the
 * *position* relative to the letter are all under our control, and position is
 * half of what the game is teaching.
 *
 * The dashed ring stands in for the letter, matching the ◌ convention children
 * already meet in a nikud workbook.
 */
const R = 6.4;
const CX = 20;
const CY = 16;
const BELOW = 27.5;
const ABOVE = 6;

type Shape =
  | { kind: 'bar'; x: number; y: number; w: number }
  | { kind: 'stem'; x: number; y: number; h: number }
  | { kind: 'dot'; x: number; y: number; r?: number };

const SHAPES: Readonly<Record<string, readonly Shape[]>> = {
  [PATAH]: [{ kind: 'bar', x: CX, y: BELOW, w: 13 }],
  [QAMATS]: [
    { kind: 'bar', x: CX, y: BELOW - 1, w: 13 },
    { kind: 'stem', x: CX, y: BELOW + 0.5, h: 5.5 },
  ],
  [HIRIQ]: [{ kind: 'dot', x: CX, y: BELOW }],
  [TSERE]: [
    { kind: 'dot', x: CX - 4.6, y: BELOW },
    { kind: 'dot', x: CX + 4.6, y: BELOW },
  ],
  [SEGOL]: [
    { kind: 'dot', x: CX - 4.6, y: BELOW - 2.4 },
    { kind: 'dot', x: CX + 4.6, y: BELOW - 2.4 },
    { kind: 'dot', x: CX, y: BELOW + 3.2 },
  ],
  [SHEVA]: [
    { kind: 'dot', x: CX, y: BELOW - 2.8 },
    { kind: 'dot', x: CX, y: BELOW + 3.2 },
  ],
  [QUBUTS]: [
    { kind: 'dot', x: CX + 5, y: BELOW - 2.6, r: 1.8 },
    { kind: 'dot', x: CX, y: BELOW, r: 1.8 },
    { kind: 'dot', x: CX - 5, y: BELOW + 2.6, r: 1.8 },
  ],
  // Above the letter, and left of centre — where a חולם actually sits.
  [HOLAM]: [{ kind: 'dot', x: CX - 5, y: ABOVE, r: 2.2 }],
  // Hataf marks are a שווא on the right plus the vowel on its left.
  [HATAF_PATAH]: [
    { kind: 'dot', x: CX + 6, y: BELOW - 2.6, r: 1.6 },
    { kind: 'dot', x: CX + 6, y: BELOW + 2.6, r: 1.6 },
    { kind: 'bar', x: CX - 4.5, y: BELOW, w: 8 },
  ],
  [HATAF_SEGOL]: [
    { kind: 'dot', x: CX + 6, y: BELOW - 2.6, r: 1.6 },
    { kind: 'dot', x: CX + 6, y: BELOW + 2.6, r: 1.6 },
    { kind: 'dot', x: CX - 7.5, y: BELOW - 2.2, r: 1.6 },
    { kind: 'dot', x: CX - 1.5, y: BELOW - 2.2, r: 1.6 },
    { kind: 'dot', x: CX - 4.5, y: BELOW + 2.8, r: 1.6 },
  ],
  [HATAF_QAMATS]: [
    { kind: 'dot', x: CX + 6, y: BELOW - 2.6, r: 1.6 },
    { kind: 'dot', x: CX + 6, y: BELOW + 2.6, r: 1.6 },
    { kind: 'bar', x: CX - 4.5, y: BELOW - 1, w: 8 },
    { kind: 'stem', x: CX - 4.5, y: BELOW + 0.4, h: 4.4 },
  ],
  // Right shoulder for שׁ, left shoulder for שׂ — the distinction hard mode asks for.
  [SHIN_DOT]: [{ kind: 'dot', x: CX + 6, y: ABOVE, r: 2.2 }],
  [SIN_DOT]: [{ kind: 'dot', x: CX - 6, y: ABOVE, r: 2.2 }],
};

@Component({
  selector: 'pg-nikud-glyph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 40 36" aria-hidden="true">
      @if (ring()) {
        <circle
          class="glyph__ring"
          [attr.cx]="cx"
          [attr.cy]="cy"
          [attr.r]="r"
          fill="none"
          stroke-width="1.6"
          stroke-dasharray="2.6 2.4"
          stroke-linecap="round"
        />
      }
      @for (shape of shapes(); track $index) {
        @switch (shape.kind) {
          @case ('bar') {
            <rect
              class="glyph__mark"
              [attr.x]="shape.x - shape.w / 2"
              [attr.y]="shape.y - 1.4"
              [attr.width]="shape.w"
              height="2.8"
              rx="1.4"
            />
          }
          @case ('stem') {
            <rect
              class="glyph__mark"
              [attr.x]="shape.x - 1.4"
              [attr.y]="shape.y"
              width="2.8"
              [attr.height]="shape.h"
              rx="1.4"
            />
          }
          @case ('dot') {
            <circle
              class="glyph__mark"
              [attr.cx]="shape.x"
              [attr.cy]="shape.y"
              [attr.r]="shape.r ?? 2"
            />
          }
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }

    .glyph__ring {
      stroke: currentColor;
      opacity: 0.34;
    }

    .glyph__mark {
      fill: currentColor;
    }
  `,
})
export class NikudGlyph {
  readonly mark = input.required<string>();
  readonly size = input(46);
  /** The dashed letter placeholder; off when the mark sits on a real letter. */
  readonly ring = input(true);

  protected readonly cx = CX;
  protected readonly cy = CY;
  protected readonly r = R;
  protected readonly shapes = computed<readonly Shape[]>(() => SHAPES[this.mark()] ?? []);
}
