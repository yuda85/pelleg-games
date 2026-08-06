# קְפִיצַת הַמִּסְפָּרִים — Number Jump

The second game. טִפִּי crosses the brook on stepping stones; each stone carries a
candidate answer and she hops onto the right one.

Target player: 8–10, grades 2–4. All four operations, mixed.

## Round shape

| Position | Form                                                     |
| -------- | -------------------------------------------------------- |
| 1–6      | stone questions at the set's tier                        |
| 7        | **keypad boss** — she types the answer, no options given |
| bonus    | three missing-number questions (`7 × ▢ = 42`)            |

One set is one tier, so `MATH_SET_COUNT` is simply how many tiers exist. Six
today; adding a tier adds a map node with no other change.

The keypad boss exists because stones alone are recognition, not recall — a
child learns to eliminate wrong options rather than compute. One typed answer per
set keeps the game honest without making it feel like homework.

## Difficulty tiers

Defined in `TIERS` in [math-engine.ts](../src/app/games/math/math-engine.ts).

| Tier | +                      | −                       | ×                 | ÷                 |
| ---- | ---------------------- | ----------------------- | ----------------- | ----------------- |
| 1    | within 20              | within 20               | ×2 ×5 ×10         | ÷2 ÷5 ÷10         |
| 2    | within 50              | within 50               | ×2–5, ×10         | ÷2–5, ÷10         |
| 3    | within 100, no carry   | within 100, no borrow   | ×2–10             | ÷2–10             |
| 4    | within 100, with carry | within 100, with borrow | ×2–10             | ÷2–10             |
| 5    | 2-digit + 2-digit      | 3-digit − 2-digit       | ×11 ×12           | 2-digit ÷ 1-digit |
| 6    | within 1000            | within 1000             | 2-digit × 1-digit | 3-digit ÷ 1-digit |

Three invariants are enforced by tests rather than by care:

- Subtraction never produces a negative result.
- Division is always exact — the dividend is built as divisor × quotient.
  Remainders are a different concept and are out of scope.
- Every generated operand falls inside its tier's declared range.

Carrying and borrowing are checked column by column, so a tier can demand
regrouping (`always`), forbid it (`never`), or not care (`any`).

## Distractors are the whole game

Randomly chosen wrong answers let a child eliminate rather than compute, which is
how quiz games stop teaching. Every distractor comes from a **named error
family**, so eliminating it takes the same work as solving:

| Family            | Example                   |
| ----------------- | ------------------------- |
| adjacent multiple | `7 × 6 = 42` → `48`, `36` |
| wrong operation   | `7 × 6` → `13`            |
| carry/borrow slip | `36 + 27` → `53`          |
| digit reversal    | `42` → `24`               |
| near-miss         | `± 1, 2, 3, 20` (filler)  |

Three stones at tiers 1–2, four from tier 3 up. The answer is always present, no
two stones share a value, and nothing negative is ever offered.

## Weak-spot bias

`Progress` tallies right and wrong per operation. The generator weights its
choice:

```
weight(op) = 1 + 2 × wrongRate(op)
```

A mastered operation keeps the base weight of 1, so it still appears regularly —
this tilts the mix, it does not replace it. Invisible to the player: there is no
"you're bad at division" message anywhere.

**The stats are snapshotted when a run is dealt**, not read live. Reading them
live would mean answering one question regenerates every question after it —
`recordOp` writes the same signal the generator reads. `math-play.spec.ts` guards
this, and the snapshot is taken with `untracked` because `reset()` runs inside an
effect.

## Never stuck

- Wrong stone → it sinks, טִפִּי stays put, a mistake is counted. No fall, no
  life lost, no red X.
- Hint sinks one wrong stone and caps that question at 2 stars.
- Wrong keypad entry → the field shakes and clears.
- **Boss escape hatch:** after three wrong attempts the keypad hands the same
  question to the stone board, carrying its mistake count across so the question
  keeps its cost. The boss has no hint button; this is its equivalent.

## Scoring

| Outcome               | Stars       |
| --------------------- | ----------- |
| no mistakes, no hints | 3           |
| 1–2 mistakes          | 2           |
| 3+ mistakes           | 1           |
| any hint used         | capped at 2 |

Floor is 1 star, never 0. Coins are `stars × 5`, plus 10 per question once the
streak reaches 3 (consecutive questions with no mistakes and no hints). The bonus
round pays `15 + secondsLeft × 0.8`, so speed pays without the clock ever
punishing — running out simply ends the round with no bonus.

Set scores are stored as a best-ever per set, keyed `math:<index>`, so a bad
replay costs nothing. Finishing a set unlocks the next and awards a sticker.

## Changing the tiers

Edit `TIERS` in [math-engine.ts](../src/app/games/math/math-engine.ts), then run
`npm test`. The tier invariants are asserted over 200 generated samples per
operation per tier, so a range that cannot satisfy its own regrouping rule fails
the build rather than quietly falling back.
