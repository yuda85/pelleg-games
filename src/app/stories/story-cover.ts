import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * A cover for a story that has no picture.
 *
 * The app has no image pipeline and no network, so "no cover" has to be a
 * designed state rather than a grey box. Every story gets a night stage —
 * curtain, moon, stars — in one of four deep palettes picked from its id, so
 * the same story always looks the same and two stories side by side rarely do.
 *
 * These are the only deep fills in the app. They are covers, not a theme: the
 * page around them stays the light clay surface every other screen uses, and
 * the only text placed on them is white, which clears 4.5:1 on all four.
 */
const PALETTES: readonly (readonly [string, string])[] = [
  ['#312e81', '#4f46e5'], // indigo
  ['#134e4a', '#0e7490'], // brook
  ['#4a044e', '#7e22ce'], // plum
  ['#172554', '#0369a1'], // deep sea
];

@Component({
  selector: 'pg-story-cover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cover(); as src) {
      <img [src]="src" [alt]="''" loading="lazy" />
    } @else {
      <svg viewBox="0 0 160 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient [attr.id]="gradientId()" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" [attr.stop-color]="palette()[0]" />
            <stop offset="1" [attr.stop-color]="palette()[1]" />
          </linearGradient>
        </defs>
        <rect width="160" height="200" [attr.fill]="'url(#' + gradientId() + ')'" />

        @for (star of stars(); track star.x) {
          <circle
            [attr.cx]="star.x"
            [attr.cy]="star.y"
            [attr.r]="star.r"
            fill="#ffffff"
            [attr.opacity]="star.o"
          />
        }

        <!-- Moon: a disc with a disc bitten out of it, so it needs no mask. -->
        <circle cx="118" cy="44" r="18" fill="#fde68a" opacity="0.95" />
        <circle cx="108" cy="38" r="16" [attr.fill]="palette()[0]" />

        <!-- The stage: two curtain sweeps and a boards line. -->
        <path d="M0 200V118c26 6 40 26 44 82z" fill="#ffffff" opacity="0.14" />
        <path d="M160 200v-96c-30 10-46 34-52 96z" fill="#ffffff" opacity="0.1" />
        <path d="M0 178c30-14 62-18 80-18s50 4 80 18v42H0z" fill="#000000" opacity="0.22" />
      </svg>
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      border-radius: var(--pg-r-lg);
      background: var(--pg-surface-sunk);
    }

    svg,
    img {
      display: block;
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
    }
  `,
})
export class StoryCover {
  readonly storyId = input.required<string>();
  readonly cover = input<string | undefined>(undefined);

  private readonly hash = computed(() => hashOf(this.storyId()));

  protected readonly palette = computed(() => PALETTES[this.hash() % PALETTES.length]);

  /** One gradient per instance — two covers on a page must not share an id. */
  protected readonly gradientId = computed(() => `cover-${slug(this.storyId())}-${this.hash()}`);

  /**
   * Star field, derived from the id rather than random, so the cover does not
   * twinkle differently on every change detection.
   */
  protected readonly stars = computed(() => {
    let seed = this.hash();
    const next = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    return Array.from({ length: 14 }, () => ({
      x: Math.round(next() * 160),
      y: Math.round(next() * 150),
      r: Number((0.8 + next() * 1.4).toFixed(2)),
      o: Number((0.35 + next() * 0.5).toFixed(2)),
    }));
  });
}

function hashOf(value: string): number {
  let hash = 2166136261;
  for (const ch of value) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Ids come from an editor field, so they are scrubbed before entering markup. */
function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '') || 'x';
}
