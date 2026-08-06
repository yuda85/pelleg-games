import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * One stroked icon set (Lucide geometry, 24x24 viewBox) so nothing in the UI
 * has to fall back to an emoji.
 */
const PATHS: Readonly<Record<string, string>> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-6h5v6',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z',
  coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5v9M14.8 9.6a3 3 0 0 0-2.8-1.6c-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2 2.8.8 2.8 2.1-1.2 2-2.8 2a3 3 0 0 1-2.8-1.6',
  volume: 'M4 9.5h3.5L12 5.5v13L7.5 14.5H4zM16 9a4 4 0 0 1 0 6M18.8 6.4a8 8 0 0 1 0 11.2',
  'volume-off': 'M4 9.5h3.5L12 5.5v13L7.5 14.5H4zM16.5 10l5 4M21.5 10l-5 4',
  ear: 'M7 9a5 5 0 0 1 10 0c0 3-2.5 4-3.5 5.5S12.5 19 10.5 19a2.5 2.5 0 0 1-2.5-2.5M10.5 9.2a1.7 1.7 0 0 1 3.2.8',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 1.9V16h5.2v-.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3z',
  check: 'M4.5 12.5 9.5 17.5 19.5 6.5',
  x: 'M6 6l12 12M18 6L6 18',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9.5h-13z',
  bag: 'M4.5 8h15l-1.2 12h-12.6zM8.5 8V6a3.5 3.5 0 1 1 7 0v2',
  album: 'M4.5 5.5h15v15h-15zM4.5 9.5h15M9 5.5v15',
  // The app is RTL end to end: going back points right, going on points left.
  back: 'M19 12H5M12 19l7-7-7-7',
  forward: 'M5 12h14M12 5l-7 7 7 7',
  refresh: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v4.5h-4.5',
  sparkle: 'M12 3v6M12 15v6M3 12h6M15 12h6M6.5 6.5l3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3',
  play: 'M8 5.5 19 12 8 18.5z',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.9 15H3.7a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.2-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3.7a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.3 1.3z',
  heart: 'M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
};

@Component({
  selector: 'pg-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      [attr.fill]="filled() ? 'currentColor' : 'none'"
      stroke="currentColor"
      [attr.stroke-width]="weight()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
  `,
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input(24);
  readonly weight = input(2.2);
  /** Solid rather than outlined — an earned star, not an empty slot. */
  readonly filled = input(false);
  protected readonly path = computed(() => PATHS[this.name()] ?? '');
}
