/**
 * Generates story illustrations with Google's image model, at authoring time.
 *
 *     node tools/illustrate.mjs                    # everything still missing
 *     node tools/illustrate.mjs --story nachal-doar
 *     node tools/illustrate.mjs --id doar-c1-box --force
 *     node tools/illustrate.mjs --dry-run          # print prompts, call nothing
 *
 * **This never runs in the app.** It is a writing tool, like `make-icons.mjs`:
 * it writes files into `public/stories/`, those files are committed, and the
 * app serves them from its own origin. The reader makes no network request —
 * an illustration that needed the internet would be a blank square on a plane.
 *
 * The key is read from the environment and is never written anywhere:
 *
 *     GEMINI_API_KEY=...   (bash)      $env:GEMINI_API_KEY='...'   (PowerShell)
 *
 * Get one at https://aistudio.google.com/apikey. Note that a Gemini/Google One
 * subscription is a *different* product and does not grant API access.
 *
 * Character consistency is the hard part of illustrating twelve chapters, so
 * the flow is two-stage: an entry marked `"sheet": true` is generated first,
 * and every entry that names it in `"ref"` is generated with that image
 * attached — the model is shown נחל rather than told about her.
 */
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'stories');
const PROMPTS = join(ROOT, 'tools', 'illustrations.json');

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-2.5-flash-image';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  const book = JSON.parse(readFileSync(PROMPTS, 'utf8'));

  const wanted = book.illustrations.filter(
    (entry) => (!args.story || entry.story === args.story) && (!args.id || entry.id === args.id),
  );
  if (wanted.length === 0) {
    fail(`nothing matches. Known ids: ${book.illustrations.map((e) => e.id).join(', ')}`);
  }

  // Sheets first: the others are generated holding one.
  wanted.sort((a, b) => Number(Boolean(b.sheet)) - Number(Boolean(a.sheet)));

  if (args.dryRun) {
    for (const entry of wanted) {
      console.log(`\n--- ${entry.id} -> ${fileFor(entry)}`);
      console.log(promptFor(book, entry));
    }
    console.log(`\n${wanted.length} prompt(s). Nothing was sent.`);
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    fail(
      'GEMINI_API_KEY is not set.\n' +
        '  Get a key at https://aistudio.google.com/apikey, then:\n' +
        "    PowerShell:  $env:GEMINI_API_KEY='...'\n" +
        '    bash:        export GEMINI_API_KEY=...\n' +
        '  Run with --dry-run to see the prompts without a key.',
    );
  }

  mkdirSync(OUT, { recursive: true });
  return run(book, wanted, key, args);
}

async function run(book, wanted, key, args) {
  let made = 0;
  let skipped = 0;

  for (const entry of wanted) {
    const target = join(OUT, fileFor(entry));
    if (existsSync(target) && !args.force) {
      console.log(`· ${entry.id} — already there, skipping (use --force to redo)`);
      skipped++;
      continue;
    }

    const reference = entry.ref ? readReference(entry.ref, book) : null;
    process.stdout.write(`↻ ${entry.id} … `);
    try {
      const png = await generate(promptFor(book, entry), reference, key, entry);
      writeFileSync(target, png);
      made++;
      console.log(`${fileFor(entry)} (${Math.round(png.length / 1024)} KB)`);
      warnIfHeavy(png, entry);
    } catch (error) {
      console.log('failed');
      console.error(`  ${error.message}`);
    }
  }

  console.log(`\n${made} written, ${skipped} already present. Files are in public/stories/.`);
  if (made > 0) {
    console.log(
      'These ship with the app, so keep them small: see public/stories/README.md.\n' +
        'Reference one from a chapter with:  ![תיאור](stories/<file>)',
    );
  }
}

/** The style preamble plus this illustration's own line. */
function promptFor(book, entry) {
  return [book.style, entry.prompt, book.negative].filter(Boolean).join('\n\n');
}

/**
 * Missing a character sheet is a quality problem, not a failure: the picture
 * still comes out, it just will not look like the same girl. Say so and carry
 * on rather than killing a run that is part way through.
 */
function readReference(id, book) {
  const sheet = book.illustrations.find((entry) => entry.id === id);
  if (!sheet) {
    console.log(`\n  ⚠ ref "${id}" is not in illustrations.json — generating without it`);
    return null;
  }
  const path = join(OUT, fileFor(sheet));
  if (!existsSync(path)) {
    console.log(
      `\n  ⚠ ref "${id}" has not been generated yet — generating without it.` +
        `\n    For a consistent character, run:  node tools/illustrate.mjs --id ${id}`,
    );
    return null;
  }
  return readFileSync(path).toString('base64');
}

async function generate(prompt, referenceBase64, key, entry) {
  const parts = [{ text: prompt }];
  if (referenceBase64) {
    parts.push({ inline_data: { mime_type: 'image/png', data: referenceBase64 } });
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        // 4:3 matches the box the reader reserves for an illustration.
        imageConfig: { aspectRatio: entry.aspect ?? '4:3' },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`HTTP ${response.status} — ${detail.slice(0, 300)}`);
  }

  const body = await response.json();
  const image = findImage(body);
  if (!image) {
    // A refusal or a text-only answer comes back as a normal 200.
    const text = findText(body);
    throw new Error(
      text ? `no image returned — model said: ${text.slice(0, 200)}` : 'no image in the response',
    );
  }
  return Buffer.from(image, 'base64');
}

/** The REST API answers in camelCase; some versions use snake_case. */
function findImage(body) {
  for (const part of body?.candidates?.[0]?.content?.parts ?? []) {
    const data = part.inlineData?.data ?? part.inline_data?.data;
    if (data) return data;
  }
  return null;
}

function findText(body) {
  const parts = body?.candidates?.[0]?.content?.parts ?? [];
  return (
    parts
      .map((part) => part.text)
      .filter(Boolean)
      .join(' ') || body?.promptFeedback?.blockReason
  );
}

function fileFor(entry) {
  return entry.file ?? `${entry.id}.png`;
}

/**
 * The app is an installed PWA and the service worker caches every one of these,
 * so an illustration that arrives at a megabyte is a real cost.
 */
function warnIfHeavy(png, entry) {
  const kb = png.length / 1024;
  if (kb <= 200) return;
  console.log(
    `  ⚠ ${entry.id} is ${Math.round(kb)} KB. Convert it to WebP before committing:\n` +
      `      npx --yes sharp-cli -i public/stories/${fileFor(entry)} ` +
      `-o public/stories/${fileFor(entry).replace(/\.png$/, '.webp')} -f webp -q 80\n` +
      '    then delete the PNG and point the chapter at the .webp.',
  );
}

function parseArgs(argv) {
  const args = { force: false, dryRun: false, story: null, id: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--force') args.force = true;
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--story') args.story = argv[++i];
    else if (argv[i] === '--id') args.id = argv[++i];
    else fail(`unknown argument: ${argv[i]}`);
  }
  return args;
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

await main();
