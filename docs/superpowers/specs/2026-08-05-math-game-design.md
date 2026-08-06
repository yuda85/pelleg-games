# קְפִיצַת הַמִּסְפָּרִים — Number Jump (game #2) design

Date: 2026-08-05
Status: approved, ready for implementation planning

## Purpose

The app's second game, and its first non-Hebrew subject. Drills arithmetic —
all four operations mixed — for a player in grades 2–4.

Game #1 (נַחַל הַנִּקּוּד) is built and shipped. This design reuses its engine
wholesale and spends its effort on the game itself.

## Frame

טִפִּי crosses the brook on stepping stones. A question sits above the water;
each stone below carries a candidate answer. Tap a stone, or drag טִפִּי onto
it — the same input vocabulary as the nikud game. Correct: hop, splash, next
stone. The app stays one world rather than a folder of unrelated games.

Hub card name stays **קְפִיצַת הַמִּסְפָּרִים**; it already describes the mechanic.

## Run shape

Mirrors the nikud game exactly, so the seven-pip progress bar and the stream map
carry over with no change to their logic.

| Position | Form                                                     |
| -------- | -------------------------------------------------------- |
| 1–6      | stone questions at the set's tier                        |
| 7        | **keypad boss** — she types the answer, no options given |
| bonus    | missing number (`7 × ▢ = 42`), deep-water skin           |

One set is one tier. Six tiers, six map nodes. Adding tiers adds nodes.

The keypad boss exists because stones alone are recognition, not recall — a
child learns to eliminate wrong options rather than compute. One typed answer
per set keeps the game honest without making it feel like homework.

## Content

### Difficulty tiers

| Tier | +                      | −                       | ×                 | ÷                 |
| ---- | ---------------------- | ----------------------- | ----------------- | ----------------- |
| 1    | within 20              | within 20               | ×2 ×5 ×10         | ÷2 ÷5 ÷10         |
| 2    | within 50              | within 50               | ×2–5, ×10         | ÷2–5, ÷10         |
| 3    | within 100, no carry   | within 100, no borrow   | ×2–10             | ÷2–10             |
| 4    | within 100, with carry | within 100, with borrow | ×2–10             | ÷2–10             |
| 5    | 2-digit + 2-digit      | 3-digit − 2-digit       | ×11 ×12           | 2-digit ÷ 1-digit |
| 6    | within 1000            | within 1000             | 2-digit × 1-digit | 3-digit ÷ 1-digit |

Invariants, enforced by tests rather than by care:

- Subtraction never produces a negative result.
- Division is always exact. Remainders are a different concept and are out of
  scope for v1.
- Every generated question's operands fall inside its tier's declared range.

### Distractors

The single most important part of the design. Randomly chosen wrong answers let
a child eliminate rather than compute, which is how quiz games stop teaching.

Every distractor is generated from a **named error family**:

| Family            | Example                   |
| ----------------- | ------------------------- |
| adjacent multiple | `7 × 6 = 42` → `48`, `36` |
| wrong operation   | `7 × 6` → `13`            |
| carry/borrow slip | `36 + 27` → `53`          |
| digit reversal    | `42` → `24`               |

Each distractor is plausible, so eliminating requires the same work as solving.

Stone count: 3 at tiers 1–2, 4 at tier 3 and above.

Rules: the correct answer is always present; no distractor equals the answer; no
two stones carry the same value; distractors are non-negative.

### Weak-spot bias

`Progress` records right/wrong counts per operation. The generator weights its
choice of operation by error rate:

```
weight(op) = 1 + 2 × wrongRate(op)
```

Invisible to the player — no "you're bad at division" messaging. This is what
stops "all four operations mixed" from meaning "random forever": the mix tilts
toward what she is actually getting wrong.

An operation with no history gets the base weight, so early runs are even.

## Failure is soft

Consistent with the nikud game, which this must not contradict.

- Wrong stone → the stone wobbles and sinks slightly, טִפִּי stays put, a mistake
  is counted. No fall, no life lost, no red X.
- Hint sinks one wrong stone (a 50/50), and caps that question at 2 stars.
- Wrong keypad entry → the field shakes, clears, and counts a mistake.
- **Boss escape hatch:** after 3 wrong attempts the keypad degrades into a stone
  question, carrying its mistake count with it. She can always finish a set.
  The boss has no hint button; the escape hatch is its equivalent, and it does
  not further cap stars beyond what the mistakes already cost.

## Scoring

Reused verbatim from the nikud game:

| Outcome               | Stars       |
| --------------------- | ----------- |
| no mistakes, no hints | 3           |
| 1–2 mistakes          | 2           |
| 3+ mistakes           | 1           |
| any hint used         | capped at 2 |

Floor is 1 star, never 0. Coins are `stars × 5`, plus 10 per question once the
streak reaches 3. A streak is consecutive questions answered with no mistakes
and no hints. Finishing a set unlocks the next and awards a sticker. Chill mode
removes every clock.

### How stars are stored — and a deliberate change to the nikud game

The nikud game keys best-ever stars by word id, and its map sums those to score
a set. Math questions are **generated fresh each run**, so there is no stable id
to key them by and that scheme cannot carry over.

So both games move to **best stars per set**, in a new
`setStars: Record<string, number>` keyed `"<game>:<setIndex>"`, written as a max
at the end of each run. `Progress.starsForSet(game, index)` reads it uniformly,
with no per-game branching.

This changes nikud behaviour: a set's map score becomes _the best single run_
rather than _the sum of the best ever achieved on each word individually_. That
is a small regression in one respect — a player can no longer grind a set up
word by word across several runs — and an improvement in another: the number on
the map now means something a child can reproduce in one sitting. Accepted
deliberately.

The nikud game keeps its per-word `stars` record; it is still the right data for
a future "replay only the words you missed" feature. It simply stops being what
the map displays.

## Architecture

```
src/app/games/math/
  math-engine.ts        pure: tiers, generation, distractor families, weighting
  math-engine.spec.ts
  math-play.ts/.html/.scss     run orchestrator (mirrors nikud-play)
  stones.ts/.html/.scss        stone question board
  keypad.ts/.html/.scss        boss board
  missing-number.ts/.html/.scss  bonus round
```

`math-engine.ts` is pure and dependency-free, like `hebrew.ts`. Everything
random takes an injectable `Rng` so generation is deterministic under test.

### Question model

```ts
type Op = 'add' | 'sub' | 'mul' | 'div';

interface Question {
  op: Op;
  a: number;
  b: number;
  answer: number;
  /** 'result' for a normal question, 'operand' for the bonus round. */
  unknown: 'result' | 'operand';
}
```

The bonus round is the same generator with a different slot hidden — no second
content system, and nothing new to author or verify.

### Bonus round specifics

Three missing-number questions at the set's tier, answered on stones. A 45-second
clock for the round as a whole, matching the scramble round; chill mode removes
it. Payout matches the scramble round — `15 + secondsLeft × 0.8` — so speed pays
without the clock ever punishing. Running out of time ends the round with no
bonus, which is not a failure state.

## Changes this forces to existing code

Two are genuine improvements the second game surfaces; neither is speculative.

### 1. Extract `<pg-stream-map>`

`nikud-map` contains a winding-stream map that both games need identically.
Extract to `src/app/shared/stream-map/`, parameterised by node list and route
base. `nikud-map` and the new `math-map` become thin wrappers that supply data.

### 2. `Progress` → save v2

Today `Progress` is nikud-shaped in three ways:

- `setsDone: number` — a single game's progress. Becomes
  `setsDone: Record<GameId, number>`.
- `isSetUnlocked(index)` / `starsForSet(index)` — implicitly nikud. Take a
  `GameId`.
- `wordsForSet()` and `SET_COUNT` live in `progress.ts` but are nikud content.
  They move to `src/app/games/nikud/`; each game declares its own set count.

Also added: `setStars: Record<string, number>` (see scoring above) and
`opStats: Record<Op, { right: number; wrong: number }>`.

Storage key moves to `pelegames.progress.v2` with a migration that reads a v1
save, lifts its bare `setsDone` into `{ nikud: n }`, and seeds `setStars` from
the per-word `stars` it already holds. Pelleg has real progress saved; losing it
is not acceptable, and the migration is worth its own test.

Stickers gain a `game` field and game-prefixed ids so the album can show both
games' sets. Coins, cosmetics and settings stay global — that is the point of a
hub.

### Not extracting yet

The summary card and reveal card are similar between games but their stats
differ. Duplicate for now and extract when game #3 needs them — rule of three.
The pips bar is genuinely identical and is extracted alongside the stream map.

## Testing

`math-engine.spec.ts`, in the style of `words.spec.ts` — the engine is where a
silent mistake would teach a child something wrong, so it is tested per tier:

- every generated question's operands fall inside the tier's declared range
- division is always exact; subtraction is never negative
- the correct answer is always among the stones
- no distractor equals the answer, and no two stones share a value
- every distractor traces to a declared error family
- the weak-spot weighting measurably shifts the operation distribution
- stone count matches the tier (3 at tiers 1–2, 4 above)

Component tests cover the boss escape hatch (3 misses → stones) and that a hint
caps stars at 2.

`progress.spec.ts` covers the v1 → v2 migration: a v1 save loads without loss,
its `setsDone` lands under `nikud`, its per-word stars seed `setStars`, and a
save from a future version still loads rather than resetting the child's
progress.

## Out of scope for v1

- Division with remainders
- Fractions
- Hebrew word problems (high value; needs an authored, verified bank — a
  separate piece of work with the same correctness burden as the nikud words)
- Shekel/money problems
- Timed or race modes
