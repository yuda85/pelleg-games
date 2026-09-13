/**
 * Turns illustrations dropped into `public/stories/` into WebP the app can ship.
 *
 *     node tools/optimize-images.mjs            # convert, keep the originals
 *     node tools/optimize-images.mjs --replace  # convert and delete the originals
 *
 * A render straight out of an image model is a 1-3 MB PNG. Twelve of those is
 * 25 MB inside an installed PWA whose service worker caches every one of them —
 * so they get resized to the width the reading column actually uses and
 * re-encoded as WebP, which is where the ten-to-one saving comes from.
 *
 * `sharp` is fetched on demand through `npx` rather than added to the project:
 * this runs a handful of times a year, and the app has no image toolchain by
 * design (see tools/make-icons.mjs, which hand-writes PNG rather than pull one
 * in). Nothing here runs at build time or in the browser.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'stories');

/** The reader's column is at most ~700 CSS px, so 1200 covers a 2x screen. */
const WIDTH = 1200;
const QUALITY = 80;
const SOURCES = new Set(['.png', '.jpg', '.jpeg']);

const replace = process.argv.includes('--replace');

const originals = readdirSync(DIR).filter((name) => SOURCES.has(extname(name).toLowerCase()));
if (originals.length === 0) {
  console.log(`Nothing to convert in ${DIR} — drop the .png files in there first.`);
  process.exit(0);
}

console.log(
  `Converting ${originals.length} file(s) to WebP at ${WIDTH}px wide, quality ${QUALITY}.`,
);
console.log('The first run fetches sharp-cli through npx and takes a minute.\n');

let done = 0;
let failed = 0;

for (const name of originals) {
  const from = join(DIR, name);
  const to = join(DIR, `${name.slice(0, -extname(name).length)}.webp`);
  const before = statSync(from).size;

  // sharp-cli takes an output *directory*, the format as a flag, and the
  // resize as a trailing command — not a file path and a format argument.
  const result = spawnSync(
    'npx',
    [
      '--yes',
      'sharp-cli',
      '-i',
      from,
      '-o',
      DIR,
      '-f',
      'webp',
      '-q',
      String(QUALITY),
      'resize',
      String(WIDTH),
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' },
  );

  if (result.status !== 0 || !safeSize(to)) {
    failed++;
    console.log(`✗ ${name}`);
    const why = (result.stderr?.toString() || result.error?.message || '').trim();
    if (why) console.log(`  ${why.split('\n').slice(0, 3).join('\n  ')}`);
    continue;
  }

  const after = statSync(to).size;
  done++;
  console.log(
    `✓ ${name} → ${kb(before)} KB → ${kb(after)} KB` +
      (after > 200 * 1024 ? '   ⚠ still over 200 KB' : ''),
  );
  if (replace) unlinkSync(from);
}

console.log(`\n${done} converted, ${failed} failed.`);
if (done > 0 && !replace) {
  console.log('Originals kept. Re-run with --replace once the WebP files look right.');
}
if (failed > 0) {
  console.log(
    '\nIf sharp-cli will not install, convert the files any other way — the only\n' +
      'thing that matters is that public/stories/ ends up holding .webp files\n' +
      'under about 200 KB each, named exactly as the chapters reference them.',
  );
  process.exit(1);
}

function kb(bytes) {
  return Math.round(bytes / 1024);
}

function safeSize(path) {
  try {
    return statSync(path).size > 0;
  } catch {
    return false;
  }
}
