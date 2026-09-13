# Story illustrations

Drop illustration files here and reference them from a chapter with

```
![תיאור קצר לקורא מסך](stories/nachal-teatron-c1-curtain.webp)
כתובת אופציונלית מתחת לתמונה
```

Everything in `public/` is copied into the build as-is, so a picture placed
here ships **with the app**: it is cached by the service worker and shows up on
a plane. An illustration fetched from somewhere else at read time would not.

Practical limits, because this is an offline PWA that a phone keeps installed:

- **WebP**, quality ~80. A 4:3 illustration at **1024×768** is plenty — the
  reading column is at most ~700px wide.
- Aim for **under 120 KB** each. The reader reserves a 4:3 box, so a slow
  picture never makes the text jump.
- Name files `<story-id>-<chapter-id>-<what>.webp` so they sort next to each
  other and it is obvious what an orphan belongs to.

## Converting what you dropped here

A render out of an image model is a 1-3 MB PNG. Twelve of those is 25 MB inside
an installed PWA whose service worker caches every one, so they get resized and
re-encoded first:

```bash
npm run images              # convert, keep the originals
npm run images -- --replace # convert and delete the originals
```

It resizes to 1200px wide (the reading column is ~700 CSS px) and writes WebP at
quality 80 — about a tenth of the size. `sharp` is pulled in through `npx` for
the run and is not a project dependency.

## Generating them

`tools/illustrate.mjs` calls Google's image model and writes straight into this
folder. Prompts live in `tools/illustrations.json` — that file is the writing,
and it is meant to be edited.

```bash
node tools/illustrate.mjs --dry-run          # print every prompt, call nothing
node tools/illustrate.mjs --story _cast      # the character sheets, first
node tools/illustrate.mjs --story nachal-doar
node tools/illustrate.mjs --id doar-c1-box --force
```

It needs `GEMINI_API_KEY` in the environment — a key from
<https://aistudio.google.com/apikey>, which is **not** the same thing as a
Gemini or Google One subscription. The key is read from the environment and is
never written to any file here.

Character sheets come first and are reused: an entry with `"ref": "cast-nachal"`
is generated with that picture attached, so the model is _shown_ נחל rather than
told about her. Without it, twelve chapters produce twelve different girls.

The model returns PNG. Anything over 200 KB gets a warning with the one-line
command to convert it to WebP — do that before committing.

Nothing here is generated at build time; these are committed files, and the app
never calls the image service at run time.
