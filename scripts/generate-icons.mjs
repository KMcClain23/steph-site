/**
 * Generates favicons and the social share card from the brand assets.
 *
 *   node scripts/generate-icons.mjs
 *
 * Re-run after changing public/logo.png or public/hero.webp.
 */
import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

// The site's darkest ground. Icons sit on it so the gold emblem reads in both
// light and dark browser chrome instead of vanishing into a white tab bar.
const INK = { r: 10, g: 5, b: 16, alpha: 1 };

/**
 * logo.png is 456x587 and includes the "DEPTH & DAWN AUDIO, LLC" wordmark
 * below the emblem. That type is unreadable below ~128px and just turns into
 * grey mush in a tab, so the icon uses the emblem alone.
 */
const EMBLEM_HEIGHT = 500;

/**
 * A square crop of the emblem, edge to edge.
 *
 * Letterboxing the 456x500 emblem onto a square canvas leaves bands of my
 * background colour above and below, and logo.png's own near-black texture
 * isn't quite the same black — so the padding showed up as a visible seam.
 * Cropping to 456x456 instead means the artwork's own background fills the
 * icon and there's no edge at all. Offset down slightly to keep the roots.
 */
async function emblemSquare(size) {
  const side = 456;
  return sharp("public/logo.png")
    .extract({ left: 0, top: EMBLEM_HEIGHT - side, width: side, height: side })
    .resize(size, size)
    .flatten({ background: INK })
    // flatten() drops the alpha channel, and Next's .ico decoder rejects any
    // embedded PNG that isn't RGBA. Put an opaque alpha channel back.
    .ensureAlpha()
    .png()
    .toBuffer();
}

/** Minimal ICO container wrapping a single PNG. */
function pngToIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, png]);
}

const written = [];

// App Router picks these up by filename and emits the <link> tags itself.
await writeFile("app/icon.png", await emblemSquare(512));
written.push("app/icon.png (512)");

// Apple wants no transparency and no rounding — iOS masks it for you.
await writeFile("app/apple-icon.png", await emblemSquare(180));
written.push("app/apple-icon.png (180)");

await writeFile("app/favicon.ico", pngToIco(await emblemSquare(48), 48));
written.push("app/favicon.ico (48)");

/**
 * Social card. hero.webp is 1600x730 (2.19:1) with a transparent background —
 * dropped straight into og:image, Twitter and iMessage crop the sides and the
 * transparency renders black-on-black. This composes it onto the brand ink at
 * the 1.91:1 ratio every platform actually expects.
 */
const OG_W = 1200;
const OG_H = 630;
const hero = await sharp("public/hero.webp")
  .resize(OG_W - 80, null, { fit: "inside" })
  .toBuffer();
const heroMeta = await sharp(hero).metadata();

await sharp({ create: { width: OG_W, height: OG_H, channels: 4, background: INK } })
  .composite([{ input: hero, top: Math.round((OG_H - heroMeta.height) / 2), left: 40 }])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile("public/og.jpg");
written.push("public/og.jpg (1200x630)");

for (const w of written) console.log("  wrote", w);
