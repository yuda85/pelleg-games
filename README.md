# פֶּלֶגֵ'ימְס — Pelegames

Hebrew educational games for Pelleg. Angular 22, RTL throughout, installable as
an offline PWA, deployed to GitHub Pages.

> פֶּלֶג means _brook_. A nikud mark is a dot, so the mascot (**טִפִּי**) is a
> droplet, the game pieces are droplets, and the level map is a stream. One
> metaphor, whole app.

## Quick start

```bash
npm install
npm start          # http://localhost:4200
npm test           # 896 tests
```

## What's here

Four games, a story library and a dressing room, all playable:

**נַחַל הַנִּקּוּד (Nikud Brook)** — a word appears with its vowel marks stripped
out; drag the droplets back onto the right letters. 60 verified words across
three levels, seven-word sets, a scrambled-word bonus round, and Hebrew
read-aloud. See [docs/nikud-brook.md](docs/nikud-brook.md).

**קְפִיצַת הַמִּסְפָּרִים (Number Jump)** — arithmetic across all four operations.
טִפִּי hops onto the stone with the right answer; every seventh question is a
keypad boss she has to type. Six difficulty tiers, distractors drawn from named
error families, and a quiet bias toward whatever she's getting wrong. See
[docs/number-jump.md](docs/number-jump.md).

**זִכָּרוֹן מִלִּים (Word Memory)** — a grid of shells, but the pairs aren't
identical: a bare word matches its vocalized form, or a word matches its Hebrew
clue. Both faces come from the same verified word bank, so it reinforces the
other games instead of adding new content. No clock anywhere. See
[docs/word-memory.md](docs/word-memory.md).

**עוֹלַם הַצּוּרוֹת (Shape World)** — the first 3D game. A solid turns on a
turntable she can spin with a finger; name it, say whether it rolls, or count its
faces, edges and vertices. Babylon is lazy-loaded, so the hub still boots at
68 kB. Counting is only ever asked about polyhedra — the counts for curved solids
are contested between textbooks, so the game refuses to take a side.

**סִפּוּרִים בְּהֶמְשֵׁכִים (serialized stories)** — not a game either: a reading
corner for a parent and a child at bedtime. A library of stories, a quiet
reading screen with adjustable text size and a saved bookmark, and optional
stops between paragraphs for a short game, a choice or something to act out.
No stars, no coins, no timers. Stories are added through an in-app editor —
paste a chapter, place a stop, preview, save — with JSON import and export.
Ships with _נחל ותיאטרון אלף הקולות_. See [docs/stories.md](docs/stories.md).

**חֲדַר הַהַלְבָּשָׁה (the dressing room)** — not a game: the place the coins go.
A layered-SVG doll with four wardrobe slots, bought with coins earned in the
games. See [docs/shapes-and-dressup.md](docs/shapes-and-dressup.md).

All four games share stars, streaks, coins, the cosmetics shop, the sticker album
and the progress map. The story library deliberately shares none of it.

## Docs

- [docs/nikud-brook.md](docs/nikud-brook.md) — round shape, word-bank rules,
  scoring, and why marks are drawn rather than typeset
- [docs/number-jump.md](docs/number-jump.md) — tiers, distractor families,
  weak-spot bias, the boss escape hatch
- [docs/word-memory.md](docs/word-memory.md) — why pairs aren't identical, board
  sizes, why the star thresholds scale
- [docs/shapes-and-dressup.md](docs/shapes-and-dressup.md) — the 3D game, why
  curved solids get no counting questions, and how to match the doll to a photo
- [docs/stories.md](docs/stories.md) — the story library, the content model, how
  to add a story without touching code, and what local-only storage means
- [docs/design-system.md](docs/design-system.md) — claymorphism tokens, RTL
  rules, typography, motion, sound, shared game chrome
- [docs/deploy.md](docs/deploy.md) — PWA setup, GitHub Pages, scripts

## Layout

```
src/app/
  core/          hebrew.ts (nikud engine), words.ts (word bank),
                 progress.ts (localStorage) + migrate.ts, scoring.ts,
                 sfx.ts, speech.ts, cosmetics.ts,
                 story-types.ts + story-bank.ts (story content),
                 stories.ts (library store), reading.ts (bookmarks, text size)
  shared/        mascot.ts, icon.ts, nikud-glyph.ts,
                 stream-map/ (level map), pips/ (run progress bar)
  games/nikud/   nikud-sets, nikud-map, nikud-play, nikud-board, scramble
  games/math/    math-engine, math-map, math-play, stones, keypad, missing-number
  games/memory/  memory-engine, memory-map, memory-play, memory-board, vanished
  games/shapes/  shapes-engine, shapes-map, shapes-play, solid-view (Babylon),
                 shape-question, roll-sort
  stories/       library, story-page, reader, editor, story-blocks, story-cover
  dressup/       wardrobe, doll (layered SVG), dressup
  hub/  shop/  album/
src/fonts/       self-hosted woff2 subsets
tools/           make-icons.mjs, pages-postbuild.mjs
```

`<pg-stream-map>` and `<pg-pips>` are shared between games — a new game consumes
them rather than copying them.

## Adding a game

1. Build it under `src/app/games/<name>/`.
2. Add a lazy route in [app.routes.ts](src/app/app.routes.ts).
3. Give its card a `route` in the `GAMES` list in [hub.ts](src/app/hub/hub.ts).

## No external services

No API keys, no accounts, no third-party requests. Fonts are self-hosted, sound
effects are synthesised with the Web Audio API, and read-aloud uses the browser's
built-in speech synthesis — which needs a Hebrew system voice, and hides its own
buttons when there isn't one. Progress lives in `localStorage`.

There is no CMS either: story content is authored in the app's own editor and
kept in `localStorage`, with JSON export as the backup and the way to carry a
story to another device. A story that should ship with the app goes in
`core/story-bank.ts`.

## Deploy

Push to `main`. Set **Settings → Pages → Source: GitHub Actions** once; the
workflow runs the tests, builds with the right `--base-href`, and publishes.
