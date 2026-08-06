/**
 * Renders the Pelegames app icon — טִפִּי the droplet on a brook-blue field —
 * at every size the PWA manifest asks for.
 *
 * Written as a rasteriser rather than an SVG conversion so it needs no image
 * toolchain at all: `node tools/make-icons.mjs` regenerates the whole set.
 *
 * Every size is drawn maskable-safe (art inside the middle 60%) and declared
 * "any maskable", so one file works cropped or uncropped.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
/** Samples per axis for anti-aliasing. */
const AA = 4;

const BG_TOP = [79, 70, 229]; // indigo — the app's structural colour
const BG_BOTTOM = [8, 145, 178]; // aqua — the brook
const DROP_TOP = [207, 250, 254];
const DROP_BOTTOM = [103, 232, 249];
const INK = [30, 27, 75];

function main() {
  mkdirSync(OUT, { recursive: true });
  for (const size of SIZES) {
    writeFileSync(join(OUT, `icon-${size}x${size}.png`), encodePng(size, size, draw(size)));
  }
  writeFileSync(join(OUT, 'icon.svg'), svgIcon());
  console.log(`wrote ${SIZES.length} PNG icons + icon.svg to ${OUT}`);
}

/** RGBA bytes for one square icon. */
function draw(size) {
  const px = new Uint8Array(size * size * 4);
  const radius = size * 0.22; // rounded-square field
  // Maskable safe zone is the middle 80%; staying inside 62% is comfortable.
  const art = { cx: size / 2, top: size * 0.19, bottom: size * 0.83, halfWidth: size * 0.235 };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgHits = 0;
      let dropHits = 0;
      let eyeHits = 0;
      for (let sy = 0; sy < AA; sy++) {
        for (let sx = 0; sx < AA; sx++) {
          const px1 = x + (sx + 0.5) / AA;
          const py1 = y + (sy + 0.5) / AA;
          if (inRoundedRect(px1, py1, size, radius)) bgHits++;
          if (inDroplet(px1, py1, art)) dropHits++;
          if (inEyes(px1, py1, art)) eyeHits++;
        }
      }
      const total = AA * AA;
      const bgA = bgHits / total;
      const dropA = dropHits / total;
      const eyeA = eyeHits / total;

      const bg = lerp3(BG_TOP, BG_BOTTOM, y / size);
      const drop = lerp3(DROP_TOP, DROP_BOTTOM, (y - art.top) / (art.bottom - art.top));

      let rgb = bg;
      rgb = mix(rgb, drop, dropA);
      rgb = mix(rgb, INK, eyeA);

      const i = (y * size + x) * 4;
      px[i] = rgb[0];
      px[i + 1] = rgb[1];
      px[i + 2] = rgb[2];
      px[i + 3] = Math.round(bgA * 255);
    }
  }
  return px;
}

function inRoundedRect(x, y, size, r) {
  const dx = Math.max(r - x, 0, x - (size - r));
  const dy = Math.max(r - y, 0, y - (size - r));
  return dx * dx + dy * dy <= r * r;
}

/**
 * A droplet is a circle plus the triangle formed by its two tangents from the
 * apex — which is exactly the shape of the mascot and of a nikud mark.
 */
function inDroplet(x, y, art) {
  const r = art.halfWidth;
  const cy = art.bottom - r;
  const inCircle = (x - art.cx) ** 2 + (y - cy) ** 2 <= r * r;
  if (inCircle) return true;

  const apex = { x: art.cx, y: art.top };
  const d = cy - apex.y;
  if (d <= r) return false;
  const tangentLen = Math.sqrt(d * d - r * r);
  const alpha = Math.asin(r / d);
  const t1 = tangentPoint(apex, alpha, tangentLen);
  const t2 = tangentPoint(apex, -alpha, tangentLen);
  return inTriangle(x, y, apex, t1, t2);
}

function tangentPoint(apex, angle, length) {
  // Base direction is straight down, from the apex toward the circle centre.
  return {
    x: apex.x + Math.sin(angle) * length,
    y: apex.y + Math.cos(angle) * length,
  };
}

function inTriangle(x, y, a, b, c) {
  const s1 = cross(a, b, x, y);
  const s2 = cross(b, c, x, y);
  const s3 = cross(c, a, x, y);
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
}

function cross(p, q, x, y) {
  return (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x);
}

function inEyes(x, y, art) {
  const r = art.halfWidth;
  const cy = art.bottom - r;
  const eyeR = r * 0.16;
  const dx = r * 0.36;
  const eyeY = cy - r * 0.12;
  return (
    (x - (art.cx - dx)) ** 2 + (y - eyeY) ** 2 <= eyeR * eyeR ||
    (x - (art.cx + dx)) ** 2 + (y - eyeY) ** 2 <= eyeR * eyeR
  );
}

function lerp3(a, b, t) {
  const k = Math.min(Math.max(t, 0), 1);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function mix(base, over, alpha) {
  return [
    base[0] + (over[0] - base[0]) * alpha,
    base[1] + (over[1] - base[1]) * alpha,
    base[2] + (over[2] - base[2]) * alpha,
  ];
}

// --- minimal PNG encoder ----------------------------------------------------

function encodePng(width, height, rgba) {
  const stride = width * 4;
  // One filter byte (0 = none) per scanline, as the PNG spec requires.
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function svgIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#0891b2"/>
    </linearGradient>
    <linearGradient id="drop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cffafe"/><stop offset="100%" stop-color="#67e8f9"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#bg)"/>
  <path d="M50 19C50 19 73.5 51 73.5 64.5a23.5 23.5 0 1 1-47 0C26.5 51 50 19 50 19z" fill="url(#drop)"/>
  <circle cx="41.5" cy="65" r="3.8" fill="#1e1b4b"/>
  <circle cx="58.5" cy="65" r="3.8" fill="#1e1b4b"/>
</svg>
`;
}

// Last, so the CRC table above is past its temporal dead zone.
main();
