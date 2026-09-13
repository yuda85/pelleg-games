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
  // --- the story library ---
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H19v14H6.5A2.5 2.5 0 0 0 4 19.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H19v-5',
  bookmark: 'M6.5 3.5h11V21l-5.5-3.8L6.5 21z',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.9-4.9',
  list: 'M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10.5 10.5v6M13.5 10.5v6',
  pencil: 'M4 20l.9-3.8L16 5.1a2.2 2.2 0 0 1 3.1 3.1L8 19.1zM14.3 6.8l2.9 2.9',
  copy: 'M9 9.5A2.5 2.5 0 0 1 11.5 7h6A2.5 2.5 0 0 1 20 9.5v6a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 9 15.5zM15 7V5.5A2.5 2.5 0 0 0 12.5 3h-6A2.5 2.5 0 0 0 4 5.5v6A2.5 2.5 0 0 0 6.5 14H8',
  download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15',
  upload: 'M12 15.5V4.5M7.5 9 12 4.5 16.5 9M4.5 19.5h15',
  'text-size': 'M3 7.5V5.5h8v2M7 5.5V18M13 12.5V11h7v1.5M16.5 11v7',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8',
  flower:
    'M12 10.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM12 10.5V8a2.5 2.5 0 1 0-2.5 2.5H12zM12 15.5V18a2.5 2.5 0 1 0 2.5-2.5H12M9.5 13H7a2.5 2.5 0 1 0 2.5 2.5V13M14.5 13H17a2.5 2.5 0 1 1-2.5 2.5V13',
  device: 'M3.5 5.5h17v10h-17zM8 20h8M12 15.5V20',
  'chevron-up': 'M6 15l6-6 6 6',
  'chevron-down': 'M6 9l6 6 6-6',
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
