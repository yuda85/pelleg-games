# סִפּוּרִים בְּהֶמְשֵׁכִים — the story library

A reading corner rather than a fifth game. A parent and a child open a chapter
before bed, read it together, stop at an optional game or two, and mark the
chapter finished when they are done.

**Nothing here scores anything.** No stars, no coins, no streaks, no timers, no
daily counters. The reader deliberately holds none of the reward machinery the
games share — the only thing it remembers is where they got to.

Enter it from the hub card **סִפּוּרִים בְּהֶמְשֵׁכִים**, or at `/stories`.

## The four screens

| Route                          | Screen         | What it is                         |
| ------------------------------ | -------------- | ---------------------------------- |
| `/stories`                     | library        | the shelf, "ממשיכים לקרוא", search |
| `/stories/:storyId`            | story page     | cover, blurb, chapters in order    |
| `/stories/:storyId/:chapterId` | reading screen | the chapter                        |
| `/stories/editor`              | editor         | add and edit stories and chapters  |

`/stories/editor` is declared **before** `/stories/:storyId`, or "editor" would
be read as a story id.

### Library

One card per story: generated cover, title, blurb, chapter count, an estimated
read-aloud time, and a progress bar. "ממשיכים לקרוא" sits on top and appears
only once a story has been opened; a finished story drops out of it, because a
row offering "continue" with no next chapter is a lie.

Search covers title, blurb and tags, and **strips nikud from both sides** before
comparing — the titles are vocalized and nobody types nikud into a search box.
Empty shelf and no-results both have their own state.

### Story page

Chapters are listed in order and **none of them is locked**. Skipping ahead is
allowed: a bedtime story is not a level ladder. What the page will not do is
spoil — a row shows a chapter's title and its length, never a line of its text.

### Reading screen

Mobile first, one column, natural scrolling. No pagination: a page-turn
mechanism fights a font-size change, and there is nothing here it would buy.

- **Text size** — four steps, in the toolbar. The choice is saved and applies to
  every story. One `--read-size` variable drives the prose, the sub-headings,
  the note cards and the activity cards together.
- **Position** — a hairline under the toolbar, and "פרק 2 מתוך 3". Not a
  dashboard.
- **Where they stopped** — the chapter and the scroll position are saved and
  restored. The position is stored as a **ratio**, not a pixel offset: the same
  chapter is a different height at a different text size or on a different
  screen.
- **Finishing a chapter** is an explicit button. Reaching the bottom does _not_
  mark it read — a child may have scrolled ahead to see how long it is. There is
  an undo, for a button pressed by mistake.
- **The end of a chapter** shows the next one by name. The end of the **story**
  gets the one night-coloured card in the reader, and then stops.

### Calm tools

A chapter can also carry a **calm tool** — a small, repeatable thing to do in
the middle of the story: 30–60 seconds, spoken out loud, doable with the screen
face-down. They are components rather than content: a story picks one by name
and may override its words, so a new story never needs new code.

| Tool       | Name in the story     | What it is                                       |
| ---------- | --------------------- | ------------------------------------------------ |
| `flower`   | פֶּרַח הַלַּיְלָה     | a flower opening and closing over eleven seconds |
| `lantern`  | פָּנָס הַכִּיס        | a small light passing over shoulders, hands, jaw |
| `thousand` | אֶלֶף הַקּוֹלוֹת      | find three sounds in the room                    |
| `curtain`  | מֵאֲחוֹרֵי הַוִּילוֹן | a short piece of invented quiet                  |
| `toolbox`  | אַרְגַּז הָאַבְזָרִים | "what could help right now", nothing recorded    |
| `duck`     | הַבַּרְוָז הָאִטִּי   | saying "גע" slowly, once a roll stops            |

Each is named from **inside the story world** rather than after what it does, so
the name carries away from the app: "בוא נעשה פנס כיס" works at bedtime; "let's
do a body scan" does not.

What they never do: score, time anyone out, compete, play a sound, require
typing, or claim at the end that she is now calm. The closing line says the tool
is still there, not that it worked. Every one can be skipped or closed at any
moment, and the card carries its own **בְּלִי תְּנוּעָה** switch beside the animation
(on top of `prefers-reduced-motion`, which already stops it).

There is exactly one breathing tool, it is slow, and it has **no hold** — the
brief ruled out breath-holds and anything fast, and the other five tools exist
so no story has to lean on breathing at all.

### Optional stops

A chapter can carry stops between paragraphs: a short game, a choice, or a small
physical exercise. They render as a distinct collapsed card that can be opened
or skipped, and they are meant to be done out loud — nothing is typed.

There is no right answer, no score, and no requirement to complete one. The card
says so in as many words.

**A stop can also fork the story.** When an option carries a mark, picking it is
a real decision: later blocks — in that chapter or a later one — can be written
to appear only for that branch. The card says _מְשַׁנָּה אֶת הַהֶמְשֵׁךְ_ so the choice
is not a surprise, the chosen option stays highlighted, and pressing it again
takes the fork back so the other branch can be read.

What is stored is the **mark, never the words**: "she went with the duck" is
plot, and the next chapter needs it to make sense. A stop with no marks still
records nothing at all.

The story that ships forks twice, once across chapters: what נחל does with the
sentence she finds in chapter 2 is mentioned again in chapter 3.

## Adding a story — no code, no JSON

The editor is at `/stories/editor`, reachable from the pencil button in the
library header.

1. **סיפור חדש** — title, blurb, tags, an optional cover URL, and an id.
2. **פרק חדש** — a title and one big box. **Paste the whole chapter into it.**
   Blank lines separate paragraphs; that is the only rule you need.
3. **עצירה** — add a stop, pick its kind, and choose where it goes from a list
   of the chapter's paragraphs by their opening words. You never count
   paragraphs and never touch the prose box to place one.
4. **תצוגה מקדימה** — renders through the same component the reading screen
   uses, so the preview cannot drift from the real thing.
5. **שמירת הסיפור** — saves the whole story.

### The three marks inside the paste box

Structure without JSON, and all three survive a round trip back into the box:

| Typed      | Becomes                                          |
| ---------- | ------------------------------------------------ |
| blank line | a new paragraph                                  |
| `## כותרת` | a sub-heading                                    |
| `---`      | a scene break (three droplets)                   |
| `> שורה`   | a note card — a ticket, a sign, a strip of paper |

A run of `> ` lines is **one** card and keeps its line breaks.

### Import and export

**יצוא הכל** downloads `pelegames-stories.json` and also shows the JSON for
copying. The shape is:

```json
{
  "version": 1,
  "stories": [
    {
      "id": "nachal-teatron",
      "title": "...",
      "blurb": "...",
      "tags": ["..."],
      "cover": "optional URL or data: URI",
      "chapters": [
        {
          "id": "c1",
          "title": "...",
          "order": 0,
          "blocks": [
            { "id": "b1", "kind": "paragraph", "text": "..." },
            { "id": "b2", "kind": "heading", "text": "..." },
            { "id": "b3", "kind": "note", "text": "line\nline" },
            { "id": "b4", "kind": "scene" },
            {
              "id": "b5",
              "kind": "activity",
              "activity": "game | choice | move",
              "title": "...",
              "instructions": "...",
              "options": ["optional", "things to say out loud"]
            }
          ]
        }
      ]
    }
  ]
}
```

**יבוא** takes a file or pasted JSON and validates before writing anything:

- Broken JSON, a missing id, a missing title, or a story with no valid chapter
  are reported in Hebrew, naming the story.
- A half-valid file still yields its good stories; the bad ones are listed.
- Blocks of an unknown `kind` are dropped rather than imported, and an unknown
  `activity` falls back to `game`.
- **A duplicate id is never overwritten silently.** Each clash is shown with a
  choice of _עותק חדש_ (the default) or _החלפה_, and nothing is written until
  the import is confirmed.

## Illustrations

A chapter can carry pictures between its paragraphs, so the art changes as the
page does. Files live in `public/stories/` and ship **with the app** — the
service worker caches them, and a story that needed the network would be blank
squares on a plane. See [public/stories/README.md](../public/stories/README.md)
for sizes and naming.

In the editor's paste box:

```
![נחל מול הווילון](stories/nachal-teatron-c1-curtain.webp)
הווילון זז. לא נפתח — זז.
```

The first line is the alt text a screen reader reads instead of the picture;
leave it empty (`![]`) for an illustration the prose already describes. The
line under it, if there is one, becomes the caption.

The reader reserves a 4:3 box before the file arrives, so text never jumps, and
loads pictures lazily. **No filter is applied in dark mode** — art is content,
and dimming or inverting illustrations is how they go muddy.

## Where things live

| What                       | Key                    | Notes                               |
| -------------------------- | ---------------------- | ----------------------------------- |
| The story that ships       | `core/story-bank.ts`   | source, not storage                 |
| Authored / edited stories  | `pelegames.stories.v1` | `localStorage`                      |
| Reading progress and prefs | `pelegames.reading.v1` | `localStorage`, separate on purpose |

The store is an **overlay**. The seeded story is not copied into
`localStorage`; editing it saves a copy under the same id that shadows it, and
deleting that copy brings the original text back (_restoreSeed_). Deleting a
seeded story records the id as hidden so it does not reappear.

Content and reading state are split deliberately: content is authored, exported
and carried between devices; reading state is private and stays put. The
reading state holds **no answers** — only which chapters were finished, the
bookmark, the scroll ratio, the text size, the motion preference, and the marks
set by plot forks.

### Limits of local storage

This app has no backend and no accounts, so there is no admin role to hang
permissions on and nothing public to protect. The editor writes to this
browser's `localStorage`, exactly like game progress does.

That means:

- Content added here lives **on this device and in this browser**. It does not
  sync, and clearing site data removes it. **Export is the backup**, and the way
  to move a story to another device. The editor says this on screen rather than
  leaving it to be discovered.
- A blocked write (private browsing, full quota) is surfaced as an error on the
  editor screen instead of failing silently.
- There are no child profiles in this app, so one device is one reader. Two
  children sharing a tablet share a bookmark.

To ship a story **with the app** rather than on one device, add it to
`core/story-bank.ts` and commit it.

## Safety of imported text

Content is data, never markup. Every string reaches the screen through Angular
interpolation, and there is no `innerHTML` anywhere in the feature: an imported
`<img src=x onerror=...>` arrives as visible characters. This is verified both
in `story-types.spec.ts` and against the running app.

## Design

Light clay, like the rest of the app — see
[design-system.md](design-system.md). The stories lean on the existing indigo
rather than introducing a theme: deep night-coloured covers, drawn per story
from its id when it has no picture, and one night card at the end of a story.
The page around them is the same light surface every other screen uses, and the
only text on a deep fill is white.

Three primitives were promoted into `styles.scss` while building this —
`.clay-panel`, `.clay-round` and `.clay-tag`, plus `.clay-field` for form
controls, which the games never needed.

## Known rough edges

`reader.scss`, `editor.scss`, `library.scss` and `hub.scss` each land 0.2–0.8 kB
over the project's 4 kB **warning** budget for a component stylesheet (the 8 kB
error budget is untouched). Everything genuinely shared was lifted into
`styles.scss` first; what is left is doing distinct work on content-heavy
screens, and squeezing it further would cost more in readability than it saves.

## What is not built yet

- A fork is a flag, not a graph: a branch re-joins the main line rather than
  running to a different ending. That is enough for "the story remembers what
  she chose" and not enough for a choose-your-own-adventure tree.
- Covers are a URL or a generated night scene; there is no image upload.
- No read-aloud in the reader. `speech.ts` exists and could be wired to a
  paragraph, but an automatic voice competes with a parent reading.
