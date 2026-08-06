# עוֹלַם הַצּוּרוֹת — Shape World, and חֲדַר הַהַלְבָּשָׁה — the dressing room

Two pieces shipped together: the app's first 3D game, and the toy the coins are
finally for.

## עוֹלַם הַצּוּרוֹת (Shape World)

A solid turns slowly on a turntable; she can spin it with a finger. Six
questions per set, then the bonus.

### Question kinds

| Kind       | Asks                              |
| ---------- | --------------------------------- |
| `name`     | which solid is this? (four names) |
| `rolls`    | does it roll? (yes / no)          |
| `faces`    | how many פֵּאוֹת?                 |
| `edges`    | how many מִקְצוֹעוֹת?             |
| `vertices` | how many קָדְקֳדִים?              |

`SET_KINDS` cycles the mix per set. Early sets lean on "name it"; later ones drop
it almost entirely and lean on counting, which is the part that actually needs
the rotating model.

### Counting questions are only ever asked about polyhedra

This is the one real content decision. Face, edge and vertex counts for **curved**
solids are genuinely contested — Israeli textbooks variously teach a sphere as
"no faces" or "one curved face", and a cylinder as two faces or three. Rather
than pick a side and risk contradicting her teacher, the curved solids carry
`null` counts and the generator never asks a counting question about them. They
appear only in "name it" and "does it roll".

`shapes-engine.spec.ts` asserts **Euler's formula** — `F − E + V = 2` — over every
polyhedron, so a mistyped count fails the build instead of being silently taught.

### The 3D view

Babylon, imported dynamically and only the modules used: engine, scene,
ArcRotateCamera, hemispheric light, MeshBuilder, standard material, edge
renderer. Result: the hub still boots at ~68 kB, and a child who never opens this
game never downloads a 3D engine.

Every solid comes from three builders — a pyramid is a four-sided cylinder with
no top, a prism a three-sided one — which keeps the imported surface small.

Edges are drawn as dark lines deliberately: the counting questions are only
answerable if each edge can be seen and followed round the shape. Camera panning
is disabled, because a child who drags the shape off-screen cannot get it back.

If WebGL is unavailable or the chunk fails to load, the canvas is replaced by the
solid's **name** rather than a blank rectangle — the name and rolling questions
stay answerable and nothing looks broken.

### Bonus: מִתְגַּלְגֵּל אוֹ נֶעֱרָם?

Four solids, each sorted into "rolls" or "stacks". No numbers — just the
curved-versus-flat idea that makes the counting questions make sense. The deal is
always two rollers and two stackers, so answering the same way four times scores
50%, not 100%.

## חֲדַר הַהַלְבָּשָׁה (the dressing room)

Not a game. No map, no stars, nothing to win. It is **where the coins go** — three
games pay out and this spends, which is what stops the coin count being a number
that only ever rises.

Four slots — בְּגָדִים, תִּסְפֹּרֶת, נַעֲלַיִם, אַקְּסֶסוֹרִיז — and the first item in
each is free, so the doll can be dressed completely from the first visit and the
wardrobe never reads as a paywall. Buying uses the same `Progress.buy` as the
mascot shop; a bought item is worn immediately, and tapping a worn item takes it
off.

### The doll

Layered SVG in [doll.ts](../src/app/dressup/doll.ts), drawn back to front:
legs and arms → torso → outfit → shoes → hair-behind → head → face →
hair-in-front → accessory. That order is what makes swapping a garment a one-line
change instead of a redraw.

**Matching a real child:** every colour that belongs to the girl rather than her
clothes lives in the `LOOK` object in [wardrobe.ts](../src/app/dressup/wardrobe.ts) —
skin, skin shade, hair, hair shadow, eyes. Matching a photograph means editing
five hex values; no artwork changes are needed.

Note this is deliberately a **stylized character**, not a traced photograph. If
the app is ever published to a public URL, a stylized doll is not a likeness of a
real child — which is the right default for a site anyone can open.
