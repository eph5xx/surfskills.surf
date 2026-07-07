// One-off asset prep: turn public/sunny-hero.png into a clean, trimmed cutout for
// the closing CTA (JoinBanner). The source is already transparent, but its
// anti-aliased silhouette carries a thin magenta matte fringe that would read as a
// purple rim against the teal slab. We de-fringe (bleed opaque neighbors into the
// semi-transparent edge) and trim to the content box, writing public/sunny-cta.png.
// Re-run with: node scripts/prep-sunny-cta.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(root, "public/sunny-hero.png");
const OUT = resolve(root, "public/sunny-cta.png");

// Sunny's dark outline navy (--color-base-content) — fallback for edge pixels with
// no opaque neighbor to borrow color from.
const FALLBACK = [42, 44, 65];

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
if (channels !== 4) throw new Error(`expected RGBA, got ${channels} channels`);

const idx = (x, y) => (y * width + x) * 4;
const out = Buffer.from(data); // copy so neighbor reads use original colors

let fringe = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const a = data[idx(x, y) + 3];
    if (a === 0 || a === 255) continue; // only recolor the anti-aliased edge
    fringe++;
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (data[idx(nx, ny) + 3] === 255) {
          r += data[idx(nx, ny)];
          g += data[idx(nx, ny) + 1];
          b += data[idx(nx, ny) + 2];
          n++;
        }
      }
    }
    const i = idx(x, y);
    if (n > 0) {
      out[i] = Math.round(r / n);
      out[i + 1] = Math.round(g / n);
      out[i + 2] = Math.round(b / n);
    } else {
      [out[i], out[i + 1], out[i + 2]] = FALLBACK;
    }
  }
}

await sharp(out, { raw: { width, height, channels: 4 } })
  .trim() // crop the transparent padding to the content box
  .png()
  .toFile(OUT);

const meta = await sharp(OUT).metadata();
console.log(`de-fringed ${fringe} edge pixels`);
console.log(`wrote ${OUT} — ${meta.width}x${meta.height}`);
