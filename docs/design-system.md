# Design system

Style: **claymorphism** — soft 3D, chunky, toy-like, thick rounded corners, paired
inner+outer shadows. Chosen for the audience: it is the style that reads as
"friendly toy" to an 8-year-old without reading as babyish.

Theme: **פֶּלֶג means brook.** Water, droplets, aqua. A nikud mark is a dot, the
mascot is a droplet, the game pieces are droplets, and the level map is a stream.
The whole app is one metaphor.

Everything lives in [styles.scss](../src/styles.scss) as custom properties.
Components consume the tokens; they never hardcode a colour or a shadow.

## Colour

| Token               | Value     | Role                       |
| ------------------- | --------- | -------------------------- |
| `--pg-bg`           | `#eef6ff` | page                       |
| `--pg-surface`      | `#ffffff` | cards                      |
| `--pg-surface-sunk` | `#e8effb` | inset wells, ghost buttons |
| `--pg-primary`      | `#4f46e5` | structure, headings        |
| `--pg-aqua`         | `#0e7490` | the brook — app signature  |
| `--pg-success`      | `#15803d` | go buttons, praise         |
| `--pg-warn`         | `#b45309` | hints, shin/sin dots       |
| `--pg-gold`         | `#d97706` | coins, stars               |
| `--pg-ink`          | `#1e1b4b` | body text                  |
| `--pg-ink-soft`     | `#475569` | secondary text             |

Every text colour clears 4.5:1 on both `--pg-bg` and `--pg-surface`. The darker
aqua/success/gold values exist for exactly that reason — the brighter versions of
each are used only as gradient stops or on dark fills, never as text on white.

**Light mode only, deliberately.** Dark mode is a claymorphism anti-pattern: the
style is built on a light source and paired highlight/shadow, and it collapses on
a dark field.

## Clay recipes

`--clay-raised`, `--clay-raised-lg`, `--clay-pressed`, `--clay-sunk`. Each is a
four-part shadow: outer dark, outer light, inner light, inner dark. Use them
rather than writing new shadows, or surfaces stop looking like one material.

## Typography

| Token               | Family           | Use                        |
| ------------------- | ---------------- | -------------------------- |
| `--pg-font-display` | Fredoka          | headings, buttons, numbers |
| `--pg-font-body`    | Rubik            | body                       |
| `--pg-font-nikud`   | Noto Sans Hebrew | any vocalized word         |

All three are **self-hosted** (see [fonts.scss](../src/fonts.scss)) — the app
makes no third-party request and the installed PWA works with no network at all.
136 KB for six subset files.

Each family ships two subsets: `hebrew` (letters, the full nikud set, and the
`◌` carrier) and `latin` (the digits scores and timers need — they are not in the
Hebrew subset). All three faces were checked to carry every mark from `U+05B0` to
`U+05C2` plus GPOS mark positioning; Noto is used for vocalized words because its
nikud positioning is the most reliable.

## RTL

`<html lang="he" dir="rtl">`. Use logical properties (`inset-inline-start`,
`margin-inline`, `padding-inline`) everywhere — with two deliberate exceptions:

1. **The level map** uses physical `left`/`top`, because the SVG stream beneath
   the nodes is in physical coordinates and `inset-inline-start` would flip in
   RTL while the path would not.
2. **Bare numerals and fractions** carry `dir="ltr"`. In an RTL run, `14 / 21`
   reorders to `21 / 14` and `+121` to `121+`.

Arrow icons follow RTL reading direction: `back` points **right**, `forward`
points **left**.

## Touch and interaction

- Minimum touch target 52px (`.clay-btn`, sockets, chips) — above the 44px floor.
- Minimum 8px between adjacent targets.
- Hover changes **light only** (`filter`, `box-shadow`), never size. A `scale()`
  on hover shifts every sibling in a grid.
- `cursor: pointer` on everything clickable; `cursor: grab` on draggables.
- `:focus-visible` gets a 4px aqua ring, offset 3px.
- Icons are SVG ([icon.ts](../src/app/shared/icon.ts)), never emoji.

## Motion

Shared keyframes: `pg-pop`, `pg-wiggle`, `pg-bob`. Micro-interactions run
150–300ms with `--pg-ease-out`; rewards use `--pg-ease-bounce`.

Only one element loops at a time per screen (the idle mascot). Reaction moods
play once and settle — a looping cheer is noise.

`prefers-reduced-motion: reduce` collapses every animation and transition to
0.01ms globally.

## Z-index scale

`--z-sticky: 10`, `--z-overlay: 20`, `--z-modal: 30`, `--z-drag: 50`,
`--z-toast: 60`. Nothing else invents a value.

## Shared game chrome

Two pieces are shared between games. A new game should consume them, not copy
them.

**`<pg-stream-map>`** ([stream-map.ts](../src/app/shared/stream-map/stream-map.ts))
— the winding level map. Takes `nodes: MapNode[]` (`index`, `unlocked`, `stars`,
`maxStars`, `isNext`) and a `routeBase`; a node links to `${routeBase}/${index}`.
Positions are derived, not supplied: nodes alternate 72% / 28% and the SVG stream
is drawn through them in the same 0-100 space, so they stay aligned at every
width and the map grows with the set count. The host page keeps its own header
and mascot.

**`<pg-pips>`** ([pips.ts](../src/app/shared/pips/pips.ts)) — the run progress
bar. Takes `total`, `done`, `current`, `scores` and `bonusDone`, and renders one
pip per question plus a final bonus pip.

The summary and reveal cards are deliberately _not_ shared yet — they are similar
between the two games but their stats differ. Rule of three: extract when a third
game needs them.

## Sound

Synthesised with the Web Audio API in [sfx.ts](../src/app/core/sfx.ts) — no audio
files, no network, nothing to load. Cues: `pick`, `place`, `wrong`, `star`,
`coin`, `win`, `whoosh`, plus a rising streak run whose pitch climbs with the
combo. Every tone ramps in and out; a raw start/stop clicks.

`wrong` is deliberately low and quiet. It is information, not a punishment.
