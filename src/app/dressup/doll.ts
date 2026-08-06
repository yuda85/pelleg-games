import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LOOK } from './wardrobe';

/**
 * The doll, drawn as layered SVG.
 *
 * Layer order is body → outfit → shoes → head → hair → extra, which is what
 * makes swapping a garment a one-line change instead of a redraw. Every colour
 * that belongs to the child rather than the clothes comes from `LOOK`, so
 * matching a real girl means editing five hex values.
 */
@Component({
  selector: 'pg-doll',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 200 400" [attr.width]="width()" role="img" [attr.aria-label]="label()">
      <!-- legs and arms sit under everything -->
      <g [attr.fill]="look.skin">
        <rect x="84" y="248" width="14" height="86" rx="7" />
        <rect x="102" y="248" width="14" height="86" rx="7" />
        <rect x="58" y="168" width="13" height="74" rx="6.5" transform="rotate(9 64 168)" />
        <rect x="129" y="168" width="13" height="74" rx="6.5" transform="rotate(-9 136 168)" />
      </g>

      <!-- torso, mostly covered by whatever she is wearing -->
      <path d="M74 156h52v96a26 26 0 0 1-52 0z" [attr.fill]="look.skin" />

      @switch (outfit()) {
        @case ('dress-aqua') {
          <path d="M72 158h56l22 104H50z" fill="#67e8f9" />
          <path d="M72 158h56l6 26H66z" fill="#22d3ee" />
        }
        @case ('dress-rose') {
          <path d="M72 158h56l26 108H46z" fill="#fb7185" />
          <circle cx="80" cy="222" r="5" fill="#fff" opacity=".75" />
          <circle cx="118" cy="240" r="5" fill="#fff" opacity=".75" />
          <circle cx="100" cy="200" r="5" fill="#fff" opacity=".75" />
        }
        @case ('overalls') {
          <path d="M74 168h52v92H74z" fill="#3b82f6" />
          <path d="M80 150h12v26H80zM108 150h12v26h-12z" fill="#3b82f6" />
          <rect x="86" y="196" width="28" height="22" rx="4" fill="#1d4ed8" />
          <path d="M74 260h24v72H74zM102 260h24v72h-24z" fill="#3b82f6" />
        }
        @case ('tutu') {
          <path d="M74 158h52v58H74z" fill="#f472b6" />
          <path d="M50 214h100l-14 40H64z" fill="#f9a8d4" />
          <path d="M44 218h112l-10 18H54z" fill="#fbcfe8" />
        }
        @case ('space') {
          <path d="M70 156h60v108H70z" rx="10" fill="#a5b4fc" />
          <rect x="70" y="156" width="60" height="108" rx="12" fill="#a5b4fc" />
          <circle cx="100" cy="196" r="13" fill="#e0e7ff" stroke="#4338ca" stroke-width="4" />
          <rect x="70" y="232" width="60" height="10" fill="#4338ca" />
          <rect x="70" y="264" width="26" height="70" rx="8" fill="#a5b4fc" />
          <rect x="104" y="264" width="26" height="70" rx="8" fill="#a5b4fc" />
        }
        @case ('raincoat') {
          <path d="M68 156h64v106H68z" fill="#fbbf24" />
          <rect x="68" y="156" width="64" height="106" rx="14" fill="#fbbf24" />
          <path d="M100 160v100" stroke="#b45309" stroke-width="3" />
          <path d="M66 152q34-16 68 0l-6 18q-28-12-56 0z" fill="#f59e0b" />
        }
      }

      @switch (shoes()) {
        @case ('shoes-sneakers') {
          <rect x="76" y="326" width="26" height="22" rx="9" fill="#e11d48" />
          <rect x="98" y="326" width="26" height="22" rx="9" fill="#e11d48" />
          <rect x="76" y="341" width="26" height="7" rx="3.5" fill="#ffffff" />
          <rect x="98" y="341" width="26" height="7" rx="3.5" fill="#ffffff" />
        }
        @case ('shoes-boots') {
          <rect x="78" y="306" width="22" height="42" rx="8" fill="#7c2d12" />
          <rect x="100" y="306" width="22" height="42" rx="8" fill="#7c2d12" />
          <rect x="78" y="338" width="22" height="10" rx="4" fill="#451a03" />
          <rect x="100" y="338" width="22" height="10" rx="4" fill="#451a03" />
        }
        @case ('shoes-ballet') {
          <ellipse cx="89" cy="338" rx="14" ry="10" fill="#f9a8d4" />
          <ellipse cx="111" cy="338" rx="14" ry="10" fill="#f9a8d4" />
          <path
            d="M82 326q7 7 14 0M104 326q7 7 14 0"
            stroke="#ec4899"
            stroke-width="3"
            fill="none"
          />
        }
      }

      <!-- hair behind the head, so the face always sits on top of it -->
      @if (hair() === 'hair-long' || hair() === 'hair-curly') {
        <path d="M56 108q0-56 44-56t44 56v72q-14-18-44-18t-44 18z" [attr.fill]="look.hairDark" />
      }
      @if (hair() === 'hair-braids') {
        <path d="M58 104q0-52 42-52t42 52v34q-12-14-42-14t-42 14z" [attr.fill]="look.hairDark" />
        <path
          d="M58 132q-12 44 2 74M142 132q12 44-2 74"
          [attr.stroke]="look.hair"
          stroke-width="15"
          stroke-linecap="round"
          fill="none"
        />
      }

      <!-- head -->
      <circle cx="100" cy="104" r="44" [attr.fill]="look.skin" />
      <path d="M92 146h16v16H92z" [attr.fill]="look.skinShade" />

      <!-- face -->
      <ellipse cx="86" cy="102" rx="5" ry="6" [attr.fill]="look.eyes" />
      <ellipse cx="114" cy="102" rx="5" ry="6" [attr.fill]="look.eyes" />
      <circle cx="87.5" cy="100" r="1.8" fill="#fff" />
      <circle cx="115.5" cy="100" r="1.8" fill="#fff" />
      <path
        d="M88 124q12 10 24 0"
        stroke="#b45309"
        stroke-width="3.4"
        stroke-linecap="round"
        fill="none"
      />
      <circle cx="72" cy="118" r="6" fill="#fca5a5" opacity=".55" />
      <circle cx="128" cy="118" r="6" fill="#fca5a5" opacity=".55" />

      <!-- hair in front, framing the face -->
      @switch (hair()) {
        @case ('hair-long') {
          <path d="M56 100q0-50 44-50t44 50q-12-22-44-22T56 100z" [attr.fill]="look.hair" />
        }
        @case ('hair-braids') {
          <path d="M58 98q0-46 42-46t42 46q-12-20-42-20T58 98z" [attr.fill]="look.hair" />
        }
        @case ('hair-bun') {
          <circle cx="100" cy="48" r="20" [attr.fill]="look.hair" />
          <path d="M58 100q0-48 42-48t42 48q-12-22-42-22T58 100z" [attr.fill]="look.hair" />
        }
        @case ('hair-curly') {
          <g [attr.fill]="look.hair">
            <circle cx="66" cy="88" r="17" />
            <circle cx="88" cy="66" r="19" />
            <circle cx="114" cy="66" r="19" />
            <circle cx="134" cy="88" r="17" />
            <circle cx="100" cy="58" r="18" />
          </g>
        }
      }

      @switch (extra()) {
        @case ('extra-bow') {
          <path d="M126 62 148 52v20zM126 62 104 52v20z" fill="#f43f5e" />
          <circle cx="126" cy="62" r="7" fill="#e11d48" />
        }
        @case ('extra-glasses') {
          <circle cx="86" cy="102" r="14" fill="none" stroke="#334155" stroke-width="4" />
          <circle cx="114" cy="102" r="14" fill="none" stroke="#334155" stroke-width="4" />
          <path d="M100 102h-0.5M58 100l14 2M142 100l-14 2" stroke="#334155" stroke-width="4" />
        }
        @case ('extra-crown') {
          <path
            d="M68 56l6-26 12 14 14-20 14 20 12-14 6 26z"
            fill="#fbbf24"
            stroke="#b45309"
            stroke-width="3"
            stroke-linejoin="round"
          />
        }
        @case ('extra-wings') {
          <path d="M70 176q-46-26-52 10 26 4 34 30 12-22 18-40z" fill="#c4b5fd" opacity=".9" />
          <path d="M130 176q46-26 52 10-26 4-34 30-12-22-18-40z" fill="#c4b5fd" opacity=".9" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
    svg {
      block-size: auto;
      max-inline-size: 100%;
    }
  `,
})
export class Doll {
  readonly outfit = input('');
  readonly hair = input('');
  readonly shoes = input('');
  readonly extra = input('');
  readonly width = input(220);
  readonly label = input('הַבֻּבָּה');

  protected readonly look = LOOK;
}
