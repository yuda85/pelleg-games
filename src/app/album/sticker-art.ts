import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One drawing per sticker id in `cosmetics.ts`. Locked ones render greyed. */
@Component({
  selector: 'pg-sticker-art',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 100 100" [attr.width]="size()" [attr.height]="size()" aria-hidden="true">
      @switch (name()) {
        @case ('nikud-drop') {
          <path d="M50 10C50 10 80 48 80 66a30 30 0 1 1-60 0C20 48 50 10 50 10z" fill="#22d3ee" />
          <ellipse cx="38" cy="58" rx="8" ry="11" fill="rgba(255,255,255,.55)" />
        }
        @case ('nikud-fish') {
          <path d="M20 50c14-18 40-18 52 0-12 18-38 18-52 0z" fill="#f97316" />
          <path d="M72 50l16-13v26z" fill="#ea580c" />
          <circle cx="36" cy="47" r="4" fill="#1e1b4b" />
        }
        @case ('nikud-boat') {
          <path d="M18 62h64l-11 20H29z" fill="#dc2626" />
          <path d="M50 12v46M50 18l26 34H50z" fill="#fbbf24" stroke="#78350f" stroke-width="3" />
        }
        @case ('nikud-star') {
          <path
            d="M50 12l11 23 25 4-18 18 4 25-22-12-22 12 4-25-18-18 25-4z"
            fill="#fbbf24"
            stroke="#b45309"
            stroke-width="3"
            stroke-linejoin="round"
          />
        }
        @case ('nikud-rainbow') {
          <g fill="none" stroke-width="9" stroke-linecap="round">
            <path d="M14 76a36 36 0 0 1 72 0" stroke="#ef4444" />
            <path d="M25 76a25 25 0 0 1 50 0" stroke="#f59e0b" />
            <path d="M36 76a14 14 0 0 1 28 0" stroke="#22c55e" />
          </g>
        }
        @case ('nikud-crown') {
          <path
            d="M16 66l6-34 16 16 12-24 12 24 16-16 6 34z"
            fill="#fbbf24"
            stroke="#b45309"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <rect x="18" y="68" width="64" height="14" rx="6" fill="#d97706" />
        }
        @case ('math-anchor') {
          <circle cx="50" cy="20" r="8" fill="none" stroke="#475569" stroke-width="6" />
          <path
            d="M50 28v54"
            stroke="#475569"
            stroke-width="7"
            stroke-linecap="round"
            fill="none"
          />
          <path d="M30 42h40" stroke="#475569" stroke-width="6" stroke-linecap="round" />
          <path
            d="M22 62a28 28 0 0 0 56 0"
            fill="none"
            stroke="#475569"
            stroke-width="7"
            stroke-linecap="round"
          />
        }
        @case ('math-shell') {
          <path
            d="M50 82C26 82 14 60 14 44l36-26 36 26c0 16-12 38-36 38z"
            fill="#fbcfe8"
            stroke="#be185d"
            stroke-width="3"
          />
          <path
            d="M50 82V18M32 76 44 20M68 76 56 20"
            stroke="#be185d"
            stroke-width="3"
            fill="none"
          />
        }
        @case ('math-compass') {
          <circle cx="50" cy="50" r="34" fill="#e0f2fe" stroke="#0e7490" stroke-width="5" />
          <path d="M62 38 44 46l-6 18 18-8z" fill="#e11d48" />
          <circle cx="50" cy="50" r="4" fill="#0e7490" />
        }
        @case ('math-lighthouse') {
          <path d="M38 40h24l6 46H32z" fill="#f8fafc" stroke="#334155" stroke-width="3" />
          <rect
            x="34"
            y="26"
            width="32"
            height="14"
            rx="3"
            fill="#fbbf24"
            stroke="#b45309"
            stroke-width="3"
          />
          <path d="M34 56h32M33 70h34" stroke="#e11d48" stroke-width="5" />
        }
        @case ('math-whale') {
          <path d="M16 58c0-14 16-24 34-24s34 10 34 24-16 20-34 20-34-6-34-20z" fill="#38bdf8" />
          <path d="M84 58l14-12v26z" fill="#0284c7" />
          <circle cx="34" cy="52" r="4" fill="#0f172a" />
          <path
            d="M46 34c0-8 8-14 8-14"
            stroke="#7dd3fc"
            stroke-width="5"
            stroke-linecap="round"
            fill="none"
          />
        }
        @case ('math-treasure') {
          <path d="M20 46a30 18 0 0 1 60 0z" fill="#b45309" />
          <rect x="20" y="46" width="60" height="30" rx="4" fill="#d97706" />
          <path d="M20 58h60" stroke="#78350f" stroke-width="4" />
          <rect x="44" y="42" width="12" height="18" rx="3" fill="#fbbf24" />
        }
        @case ('memory-shell') {
          <path
            d="M50 84C26 84 14 60 14 44l36-26 36 26c0 16-12 40-36 40z"
            fill="#f9a8d4"
            stroke="#be185d"
            stroke-width="3"
          />
          <path
            d="M50 84V18M31 78 44 20M69 78 56 20"
            stroke="#be185d"
            stroke-width="3"
            fill="none"
          />
        }
        @case ('memory-crab') {
          <ellipse cx="50" cy="56" rx="26" ry="19" fill="#f97316" />
          <path
            d="M26 46 12 34M74 46 88 34M28 66 14 74M72 66 86 74"
            stroke="#ea580c"
            stroke-width="6"
            stroke-linecap="round"
          />
          <circle cx="41" cy="50" r="4" fill="#1e1b4b" />
          <circle cx="59" cy="50" r="4" fill="#1e1b4b" />
          <path d="M40 64q10 8 20 0" stroke="#7c2d12" stroke-width="3" fill="none" />
        }
        @case ('memory-seahorse') {
          <path
            d="M56 16c-12 0-18 10-16 20 2 9 10 12 10 20s-8 12-8 20 8 10 8 10"
            fill="none"
            stroke="#eab308"
            stroke-width="11"
            stroke-linecap="round"
          />
          <path d="M60 20 74 14" stroke="#eab308" stroke-width="7" stroke-linecap="round" />
          <circle cx="54" cy="24" r="3.4" fill="#1e1b4b" />
        }
        @case ('memory-coral') {
          <path
            d="M50 86V44M50 56 32 38M50 62 70 42M32 38V24M70 42V28"
            fill="none"
            stroke="#fb7185"
            stroke-width="9"
            stroke-linecap="round"
          />
          <circle cx="50" cy="40" r="6" fill="#f43f5e" />
        }
        @case ('memory-pearl') {
          <path d="M14 62a36 22 0 0 1 72 0z" fill="#e5e7eb" stroke="#9ca3af" stroke-width="3" />
          <path d="M14 62a36 20 0 0 0 72 0z" fill="#f3f4f6" stroke="#9ca3af" stroke-width="3" />
          <circle cx="50" cy="54" r="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
          <circle cx="45" cy="49" r="4" fill="rgba(255,255,255,.9)" />
        }
        @case ('memory-octopus') {
          <path d="M24 52a26 26 0 0 1 52 0v10H24z" fill="#a855f7" />
          <path
            d="M26 62q-4 16 4 20M40 64q-2 18 6 20M60 64q2 18-6 20M74 62q4 16-4 20"
            fill="none"
            stroke="#9333ea"
            stroke-width="7"
            stroke-linecap="round"
          />
          <circle cx="41" cy="48" r="4.5" fill="#1e1b4b" />
          <circle cx="59" cy="48" r="4.5" fill="#1e1b4b" />
        }
        @case ('shapes-cube') {
          <path d="M22 38 50 24l28 14v28L50 80 22 66z" fill="#6ee7b7" />
          <path d="M22 38 50 52l28-14M50 52v28" fill="none" stroke="#047857" stroke-width="4" />
        }
        @case ('shapes-ball') {
          <circle cx="50" cy="52" r="30" fill="#67e8f9" />
          <ellipse
            cx="50"
            cy="52"
            rx="30"
            ry="11"
            fill="none"
            stroke="#0e7490"
            stroke-width="3.5"
          />
          <ellipse cx="41" cy="41" rx="8" ry="6" fill="rgba(255,255,255,.6)" />
        }
        @case ('shapes-cone') {
          <path d="M50 16 76 68H24z" fill="#fca5a5" />
          <ellipse
            cx="50"
            cy="68"
            rx="26"
            ry="9"
            fill="#f87171"
            stroke="#b91c1c"
            stroke-width="3"
          />
        }
        @case ('shapes-pyramid') {
          <path d="M50 16 84 70 50 84 16 70z" fill="#fcd34d" />
          <path d="M50 16 50 84M16 70 50 60l34 10" fill="none" stroke="#b45309" stroke-width="4" />
        }
        @case ('shapes-prism') {
          <path d="M34 26 66 34v40l-32-8z" fill="#c4b5fd" />
          <path
            d="M34 26 18 50l16 16M66 34 50 56l16 18M34 66 50 56l16 18"
            fill="none"
            stroke="#6d28d9"
            stroke-width="3.5"
          />
        }
        @case ('shapes-star') {
          <path
            d="M50 12 62 40l30 4-22 20 6 30-26-15-26 15 6-30-22-20 30-4z"
            fill="#a5b4fc"
            stroke="#4338ca"
            stroke-width="3.5"
            stroke-linejoin="round"
          />
          <path
            d="M50 12v76M20 44l60 0"
            fill="none"
            stroke="#4338ca"
            stroke-width="2.5"
            opacity=".5"
          />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
  `,
})
export class StickerArt {
  readonly name = input.required<string>();
  readonly size = input(76);
}
