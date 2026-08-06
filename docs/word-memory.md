# זִכָּרוֹן מִלִּים — Word Memory

The third game. A grid of closed shells; open two, and if they belong together
they stay open.

Target player: 8–10, grades 2–4.

## The pairs are not identical

This is the decision the whole game rests on. Matching a card to its identical
twin teaches nothing — it is pure visual recall, and a child exhausts it in a
week. Here a pair is two **related** faces:

| Mode    | Face A                   | Face B                     | What it drills         |
| ------- | ------------------------ | -------------------------- | ---------------------- |
| `nikud` | bare word (`שמש`)        | vocalized word (`שֶׁמֶשׁ`) | reinforces Nikud Brook |
| `clue`  | vocalized word (`אֹזֶן`) | its Hebrew clue            | reading comprehension  |

Both read the **already-verified 60-word bank** in
[words.ts](../src/app/core/words.ts), so this game adds no new content and
carries no new risk of teaching something wrong. The `meaning` field that was
written as a riddle for game one turns out to be exactly the second face here.

The mode cycles by set: `nikud → clue → mixed → nikud → clue → mixed`. A mixed
board splits its pairs between both.

## Round shape

| Position | Form                            |
| -------- | ------------------------------- |
| 1–3      | grids of growing size           |
| bonus    | **מַה נֶעֱלַם?** — three rounds |

Pairs per board, from `MEMORY_TIERS`:

| Set | Boards    |
| --- | --------- |
| 1   | 4, 5, 6   |
| 2   | 5, 6, 7   |
| 3   | 6, 7, 8   |
| 4   | 7, 8, 9   |
| 5   | 8, 9, 10  |
| 6   | 8, 10, 10 |

Ten pairs — twenty cards — is the ceiling. Past that the grid stops fitting a
phone and starts being a chore rather than a challenge.

## One defensible answer, always

Two words that render the same face would make a board with two arguable
matches, which reads to a child as the game being broken. `pickWords` tracks
every face it has already dealt and skips any word that would repeat one — and
on mixed boards that tracking is **shared across both halves**, since a
collision between the nikud half and the clue half is just as ambiguous as one
inside a half. The same word never appears twice on a board either.

The spec deals every board a hundred times over and asserts uniqueness on all
1,800 of them, because holding for the one seed a test happened to pick is not
the same as holding.

## No clock

There is deliberately no timer anywhere in the main boards. Memory plus a
countdown is just stress, and the app already promises the child that nothing
here is racing her. The bonus round has a study pause, not a countdown.

## Never stuck

- A mismatched pair stays face-up for 900 ms — long enough to actually read and
  remember — then closes. Counted as a mistake; nothing else happens.
- Hint opens one true pair for 1.4 s. Costs stars, never blocks.
- Matched pairs stay open and go green, so the board visibly empties.

## Scoring

Star thresholds **scale with the board**:

| Outcome                | Stars       |
| ---------------------- | ----------- |
| mistakes ≤ ⌈pairs / 2⌉ | 3           |
| mistakes ≤ pairs + 1   | 2           |
| more                   | 1           |
| any hint used          | capped at 2 |

A fixed threshold would be wrong here in a way it isn't in the other two games: a
ten-pair grid costs more wrong flips than a four-pair one no matter how sharp the
child is, so a flat cutoff would hand out one star for a genuinely good game on a
big board.

The streak threshold is **2**, not 3 as in the other games — a set is only three
boards, so at 3 the streak bonus could only ever fire on the last one.

Coins are `stars × 5`, plus 10 per board once the streak hits 2. The bonus pays
`15 + correct × 10` — a flat per-answer rate, since there is no clock here to
convert into coins.

## Bonus: מַה נֶעֱלַם?

Five vocalized words appear for 3.2 s. One vanishes, leaving a marked gap, and
she picks which from the five originals. Three rounds.

A different memory muscle from the grid: the grid asks _where_ a thing was, this
asks _what was there at all_. The right answer lights up after she commits,
however she answered.

## Changing the game

Board sizes live in `MEMORY_TIERS` and the mode cycle in `SET_MODES`, both in
[memory-engine.ts](../src/app/games/memory/memory-engine.ts). Adding a set means
adding a row to `MEMORY_TIERS` and a sticker in
[cosmetics.ts](../src/app/core/cosmetics.ts); the map grows on its own. Run
`npm test` after — the uniqueness invariants are asserted per board.
