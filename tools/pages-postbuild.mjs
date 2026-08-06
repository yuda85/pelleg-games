/**
 * Makes the production build servable by GitHub Pages.
 *
 * Pages is a static file host with no rewrite rules, so a deep link like
 * /nikud/2 would 404 — but Pages serves 404.html for any miss, and a copy of
 * index.html there boots the Angular router on the requested URL instead.
 *
 * .nojekyll stops Pages running the output through Jekyll, which would drop
 * any file or folder whose name starts with an underscore.
 */
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'pelegames', 'browser');
const index = join(dist, 'index.html');

if (!existsSync(index)) {
  console.error(`pages-postbuild: no build found at ${index} — run the build first.`);
  process.exit(1);
}

copyFileSync(index, join(dist, '404.html'));
writeFileSync(join(dist, '.nojekyll'), '');
console.log('pages-postbuild: wrote 404.html and .nojekyll');
