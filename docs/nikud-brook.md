# נַחַל הַנִּקּוּד — Nikud Brook

The first game. A word appears with its vowel marks stripped out; the player
drags the marks back onto the right letters.

Target player: 8–10, grades 2–4.

## Round shape

One **set** is seven words, then a bonus round:

| Position | Level  | Letters                                    | Vowel slots |
| -------- | ------ | ------------------------------------------ | ----------- |
| 1–3      | easy   | 2–3                                        | 1–2         |
| 4–6      | medium | 3–4                                        | 2–3         |
| 7        | hard   | 3–5                                        | 3–4         |
| bonus    | —      | longest word in the set, letters scrambled | —           |

`SET_COUNT` in [progress.ts](../src/app/core/progress.ts) is derived from the
word bank, so adding words adds sets with no other change. With 60 words that
is 6 sets; at 300 words it becomes 30.

Which words a set contains is derived from the set index, never stored — the
map stays stable across sessions and new words never reshuffle old sets.

## The word bank is the single source of truth

Each entry in [words.ts](../src/app/core/words.ts) is authored **once, fully
vocalized**:

```ts
{ id: 'e11', word: 'שֶׁמֶשׁ', meaning: 'מְאִירָה בַּיּוֹם', level: 'easy', slots: 2 }
```

Everything the game needs is derived from that string by
[hebrew.ts](../src/app/core/hebrew.ts): the bare letters, which letters carry a
vowel, which vowel, and the distractor pool. The data cannot disagree with
itself.

`slots` is a declared cross-check, not data. [words.spec.ts](../src/app/core/words.spec.ts)
re-derives the vowel count from the string and fails if it differs — so a
mistyped or missing mark breaks the build rather than teaching a child the wrong
spelling. It also asserts, per word, that every `ש` carries a shin or sin dot,
that no letter holds two vowels, that only vowels introduced at or below the
word's level appear, and that the generated board is solvable.

### Mark classes

- **Vowels** — the thing being taught. Stripped out and replaced by the player.
- **Structural** — dagesh, shin/sin dot, meteg. Pre-placed, _except_ on `hard`,
  where the shin/sin dot becomes a playable slot above the letter. `שׁ` vs `שׂ`
  is exactly what this age group gets wrong.

Mark order inside a letter is not trusted. NFC canonical ordering puts the vowel
before the dagesh before the shin dot, but hand-typed Hebrew arrives in the order
the keys were pressed. `parseWord` groups by base letter and classifies each
mark, so both spellings parse identically.

### Vowels by level

| Level  | Vowels available (also used for distractors) |
| ------ | -------------------------------------------- |
| easy   | קמץ פתח סגול חיריק צירה חולם                 |
| medium | + שווא                                       |
| hard   | + קֻבוץ, חטף פתח, חטף סגול, חטף קמץ          |

A distractor the child has never met is noise, not a challenge, so the pool
grows with the level. Distractor counts: easy 2, medium 3, hard 3. Easy words
often have a single slot, so one distractor would make it a coin flip.

The tray always contains every correct answer, so the board is always solvable.
When a dot slot exists, **both** dots are offered — otherwise the tray's shape
would give the answer away.

## Where the marks are drawn

During play, letters render **bare** and every mark lives in a socket below (or,
for a dot slot, above) its letter. Nothing is drawn twice, and the socket is an
unambiguous drop target.

Marks in the tray and in sockets are drawn as SVG by
[nikud-glyph.ts](../src/app/shared/nikud-glyph.ts), not set as type. Three
reasons:

1. As type, a lone mark is a two-pixel speck on a faint `◌` — the most important
   thing on screen and the least legible.
2. An isolated dot cannot distinguish חִירִיק (below the letter) from חוֹלָם
   (above it), or `שׁ` from `שׂ`. Drawing them puts **position** under our
   control, and position is half of what the game teaches.
3. It removes any dependency on a font shipping `U+25CC`.

On solve, the reveal renders the word as **real combining marks** in Noto Sans
Hebrew, whose GPOS tables put every mark in its true typographic position. That
is the one place the child sees correct Hebrew typography, and it is the payoff.

## Interaction

Two input paths, because one is not enough:

- **Drag** — pointer events with an 8px slop threshold, so a shaky tap still
  reads as a tap. A floating ghost follows the finger with `pointer-events: none`
  so it never swallows the `elementFromPoint` hit-test underneath.
- **Tap-tap** — tap a droplet to arm it, tap a socket to place it. This is the
  path that still works on a small phone.

Tapping a filled socket takes the droplet back. Free, and not counted as a
mistake.

## Failure is soft, on purpose

A wrong drop bounces back, the socket shakes, a low quiet tone plays, and a
mistake is counted. There are no lives, no red X, and nothing that reads as
failure — this age group quits on punishment.

After 2 mistakes the hint button starts pulsing. After 4 it fires automatically.
The hint highlights the correct droplet and the socket it belongs in.

## Scoring

| Outcome               | Stars       |
| --------------------- | ----------- |
| no mistakes, no hints | 3           |
| 1–2 mistakes          | 2           |
| 3+ mistakes           | 1           |
| any hint used         | capped at 2 |

The floor is 1 star — never zero. Stars are stored as a **best ever per word**,
so replaying can only help and a bad run costs nothing.

Coins: `stars × 5`, plus 10 per word once the streak reaches 3. A streak is
consecutive words solved with no mistakes and no hints. Bonus round pays
`15 + secondsLeft × 0.8`, so speed pays without the clock ever punishing —
running out of time simply ends the round with no bonus.

Finishing a set unlocks the next one and awards a sticker.

## Bonus round

Different skill and a different skin — deep water instead of the bright brook —
so it reads as a reward rather than another turn of the main game. The letters of
the set's longest word, no nikud, out of order. Tap two tiles to swap, or drag
one onto another. 45-second clock, generous; **chill mode** (hub settings)
removes every clock in the game.

## Adding words

Append to [words.ts](../src/app/core/words.ts) with a fully vocalized `word` and
a `slots` count, then run `npm test`. The spec will tell you if the nikud is
wrong. Keep 20 per level in step so sets stay balanced.
