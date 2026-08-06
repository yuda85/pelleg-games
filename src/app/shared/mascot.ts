import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { colorById } from '../core/cosmetics';

export type Mood = 'idle' | 'happy' | 'think' | 'oops' | 'cheer';

/**
 * טִפִּי — the droplet. פֶּלֶג means brook, and a nikud mark is a dot, so the
 * mascot and the game pieces are the same shape. It reacts to play rather than
 * decorating the corner: mood is driven by what the child just did.
 */
@Component({
  selector: 'pg-mascot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size() * 1.2"
      viewBox="0 0 100 120"
      [attr.aria-label]="label()"
      role="img"
      [class]="'mascot mascot--' + mood()"
    >
      <defs>
        <linearGradient [attr.id]="gradientId()" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" [attr.stop-color]="skin().from" />
          <stop offset="100%" [attr.stop-color]="skin().to" />
        </linearGradient>
      </defs>

      <ellipse cx="50" cy="112" rx="30" ry="6" fill="rgba(30,27,75,.12)" />

      <g class="mascot__body">
        <path
          d="M50 6C50 6 88 54 88 76a38 38 0 1 1-76 0C12 54 50 6 50 6z"
          [attr.fill]="'url(#' + gradientId() + ')'"
        />
        <!-- Highlight: sells the soft-3D clay read. -->
        <ellipse cx="34" cy="60" rx="11" ry="15" fill="rgba(255,255,255,.42)" />

        @switch (mood()) {
          @case ('happy') {
            <path
              d="M32 74q6-8 12 0M56 74q6-8 12 0"
              stroke="#1e1b4b"
              stroke-width="4"
              stroke-linecap="round"
              fill="none"
            />
            <path
              d="M38 88q12 12 24 0"
              stroke="#1e1b4b"
              stroke-width="4"
              stroke-linecap="round"
              fill="none"
            />
          }
          @case ('cheer') {
            <path
              d="M32 72q6-9 12 0M56 72q6-9 12 0"
              stroke="#1e1b4b"
              stroke-width="4"
              stroke-linecap="round"
              fill="none"
            />
            <ellipse cx="50" cy="90" rx="11" ry="9" fill="#1e1b4b" />
            <ellipse cx="50" cy="95" rx="6" ry="4" fill="#fb7185" />
            <g class="mascot__sparks" fill="#fbbf24">
              <circle cx="16" cy="52" r="4" />
              <circle cx="84" cy="58" r="4" />
              <circle cx="24" cy="30" r="3" />
            </g>
          }
          @case ('think') {
            <circle cx="38" cy="74" r="5" fill="#1e1b4b" />
            <path
              d="M56 74h12"
              stroke="#1e1b4b"
              stroke-width="4"
              stroke-linecap="round"
              fill="none"
            />
            <circle cx="50" cy="90" r="4.5" fill="#1e1b4b" />
          }
          @case ('oops') {
            <circle cx="38" cy="73" r="6" fill="#1e1b4b" />
            <circle cx="62" cy="73" r="6" fill="#1e1b4b" />
            <path
              d="M40 92q5-5 10 0t10 0"
              stroke="#1e1b4b"
              stroke-width="4"
              stroke-linecap="round"
              fill="none"
            />
          }
          @default {
            <circle cx="38" cy="73" r="5.5" fill="#1e1b4b" />
            <circle cx="62" cy="73" r="5.5" fill="#1e1b4b" />
            <circle cx="39.5" cy="71" r="1.8" fill="#fff" />
            <circle cx="63.5" cy="71" r="1.8" fill="#fff" />
            <path
              d="M41 89q9 7 18 0"
              stroke="#1e1b4b"
              stroke-width="4"
              stroke-linecap="round"
              fill="none"
            />
          }
        }

        @switch (hat()) {
          @case ('crown') {
            <path d="M26 34l7 12h34l7-12-11 7-13-11-13 11z" fill="#f59e0b" />
            <rect x="31" y="45" width="38" height="7" rx="3" fill="#d97706" />
          }
          @case ('cap') {
            <path d="M22 42a28 28 0 0 1 56 0z" fill="#4f46e5" />
            <path d="M74 42h16a5 5 0 0 1 0 8H74z" fill="#6366f1" />
          }
          @case ('bow') {
            <path d="M50 40l-18-9v18zM50 40l18-9v18z" fill="#fb7185" />
            <circle cx="50" cy="40" r="6" fill="#e11d48" />
          }
          @case ('wizard') {
            <path d="M50 2l16 42H34z" fill="#312e81" />
            <path d="M32 44h36v7H32z" fill="#4f46e5" />
            <circle cx="50" cy="26" r="3.5" fill="#fbbf24" />
          }
          @case ('flower') {
            <g fill="#fb7185">
              <circle cx="50" cy="26" r="7" />
              <circle cx="38" cy="34" r="7" />
              <circle cx="62" cy="34" r="7" />
              <circle cx="44" cy="45" r="7" />
              <circle cx="56" cy="45" r="7" />
            </g>
            <circle cx="50" cy="36" r="6" fill="#fbbf24" />
          }
        }
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }

    .mascot__body {
      transform-origin: 50% 100%;
    }

    .mascot--idle .mascot__body {
      animation: pg-bob 3.4s ease-in-out infinite;
    }

    /* Reaction moods play once, then settle — a looping cheer is noise. */
    .mascot--happy .mascot__body,
    .mascot--cheer .mascot__body {
      animation: mascot-jump 620ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .mascot--oops .mascot__body {
      animation: pg-wiggle 480ms ease-out;
    }

    .mascot__sparks {
      animation: mascot-sparks 720ms ease-out;
      transform-origin: 50% 60%;
    }

    @keyframes mascot-jump {
      0% {
        transform: translateY(0) scaleY(1);
      }
      30% {
        transform: translateY(-16px) scaleY(1.08);
      }
      60% {
        transform: translateY(0) scaleY(0.92);
      }
      100% {
        transform: translateY(0) scaleY(1);
      }
    }

    @keyframes mascot-sparks {
      0% {
        opacity: 0;
        transform: scale(0.4);
      }
      45% {
        opacity: 1;
        transform: scale(1.15);
      }
      100% {
        opacity: 0;
        transform: scale(1.35);
      }
    }
  `,
})
export class Mascot {
  readonly mood = input<Mood>('idle');
  readonly color = input('aqua');
  readonly hat = input<string | null>(null);
  readonly size = input(120);

  protected readonly skin = computed(() => colorById(this.color()));
  /** Unique per colour so two mascots on one page can't share a gradient. */
  protected readonly gradientId = computed(() => `drop-${this.color()}`);

  protected readonly label = computed(() => {
    const moods: Record<Mood, string> = {
      idle: 'טִפִּי מְחַכֶּה',
      happy: 'טִפִּי שָׂמֵחַ',
      think: 'טִפִּי חוֹשֵׁב',
      oops: 'טִפִּי מוּפְתָּע',
      cheer: 'טִפִּי מְרִיעַ',
    };
    return moods[this.mood()];
  });
}
