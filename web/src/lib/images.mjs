// Responsive images for the build: photos from the mirror (site/static.tildacdn.com/<tild-id>/<file>)
// are resized to a few widths. Engine: `sharp` when installed (npm install; used on Vercel), else
// macOS `sips`, else the originals are copied as is (the build still works, pages are just heavier).
import fs from 'node:fs';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { attrs } from './html.mjs';

const WIDTHS = [480, 960, 1600];
const QUALITY = { sharp: 74, sips: 45 }; // sips' scale is not libjpeg's: 45 there looks like ~75 here

/** Pixel size and real format from the file header (JPEG / PNG / GIF / WebP), no dependencies. */
export function readSize(file) {
  const b = fs.readFileSync(file);
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), f: 'png' };
  if (b.toString('ascii', 0, 3) === 'GIF') return { w: b.readUInt16LE(6), h: b.readUInt16LE(8), f: 'gif' };
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    // a few uploads are WebP files with a .JPG name
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, f: 'webp' };
    if (chunk === 'VP8L') {
      const [b0, b1, b2, b3] = [b[21], b[22], b[23], b[24]];
      return { w: 1 + (((b1 & 0x3f) << 8) | b0), h: 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)), f: 'webp' };
    }
    if (chunk === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), f: 'webp' };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), f: 'jpeg' };
      }
      i += 2 + len;
    }
  }
  throw new Error(`cannot read image size: ${file}`);
}

async function pickEngine() {
  try { return { name: 'sharp', sharp: (await import('sharp')).default }; } catch { /* not installed */ }
  try { execFileSync('sips', ['--help'], { stdio: 'ignore' }); return { name: 'sips' }; } catch { /* not macOS */ }
  return { name: 'copy' };
}

export async function createImages({ srcRoot, outDir, urlPrefix = '/img' }) {
  fs.mkdirSync(outDir, { recursive: true });
  const engine = await pickEngine();
  const manifestFile = path.join(outDir, 'manifest.json');
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch { /* first build */ }
  // variants made by another engine are not reused
  if (manifest.__engine !== engine.name) {
    for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));
    manifest = { __engine: engine.name };
  }
  const jobs = new Map();
  const used = new Set();

  function dims(rel) {
    if (manifest[rel]) return manifest[rel];
    const file = path.join(srcRoot, rel);
    if (!fs.existsSync(file)) throw new Error(`image not in mirror: ${rel}`);
    return (manifest[rel] = readSize(file));
  }

  const keyOf = (rel) => {
    const [dir, file] = rel.split('/');
    const base = file.replace(/\.[a-z]+$/i, '').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    return `${dir.replace(/^tild/, '').replace(/-/g, '').slice(0, 10)}-${base || 'img'}`;
  };

  /** Registers an image and returns {src, srcset, width, height}. rel = "tildXXXX-.../file.jpg" */
  function use(rel, { max = 1600 } = {}) {
    const { w, h, f } = dims(rel);
    const key = keyOf(rel);
    used.add(rel);
    if (engine.name === 'copy') {
      const ext = f === 'jpeg' ? '.jpg' : `.${f}`;
      jobs.set(`${key}${ext}`, { rel, width: null });
      return { src: `${urlPrefix}/${key}${ext}`, srcset: null, width: w, height: h };
    }
    const widths = WIDTHS.filter((x) => x < w && x <= max);
    if (w <= max) widths.push(w); else if (!widths.includes(max)) widths.push(max);
    const list = [...new Set(widths)].sort((a, b) => a - b);
    for (const x of list) jobs.set(`${key}-${x}.jpg`, { rel, width: x, native: x === w && f === 'jpeg' });
    const top = list[list.length - 1];
    return {
      src: `${urlPrefix}/${key}-${top}.jpg`,
      srcset: list.map((x) => `${urlPrefix}/${key}-${x}.jpg ${x}w`).join(', '),
      width: top, height: Math.round((h * top) / w),
    };
  }

  /** <img> tag. sizes: CSS sizes attribute. */
  function tag(rel, { alt = '', sizes = '100vw', cls, eager = false, max, extra = {} } = {}) {
    const im = use(rel, { max });
    return `<img${attrs({ class: cls, src: im.src, srcset: im.srcset, sizes: im.srcset ? sizes : null, width: im.width, height: im.height, alt, loading: eager ? 'eager' : 'lazy', decoding: 'async', fetchpriority: eager ? 'high' : null, ...extra })}>`;
  }

  /** URL of the largest variant (lightbox, og:image) */
  const large = (rel) => use(rel).src;

  async function convert(from, to, width, native) {
    if (engine.name === 'sharp') {
      const buf = await engine.sharp(from).rotate().resize({ width, withoutEnlargement: true })
        .jpeg({ quality: QUALITY.sharp, mozjpeg: true, progressive: true }).toBuffer();
      // the CDN already compressed the uploads: keep the original when re-encoding does not help
      if (native && buf.length >= fs.statSync(from).size) fs.copyFileSync(from, to);
      else fs.writeFileSync(to, buf);
      return;
    }
    if (native) { fs.copyFileSync(from, to); return; }
    await new Promise((resolve, reject) => execFile('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALITY.sips),
      '--resampleWidth', String(width), from, '--out', to], (err) => (err ? reject(err) : resolve())));
  }

  async function flush({ concurrency = 8, log = console.log } = {}) {
    const todo = [...jobs].filter(([name]) => !fs.existsSync(path.join(outDir, name)));
    let done = 0;
    const run = async ([name, { rel, width, native }]) => {
      const from = path.join(srcRoot, rel);
      const to = path.join(outDir, name);
      if (width == null) fs.copyFileSync(from, to);
      else await convert(from, to, width, native);
      if (++done % 200 === 0) log(`  images: ${done}/${todo.length}`);
    };
    const queue = [...todo];
    await Promise.all(Array.from({ length: concurrency }, async () => { while (queue.length) await run(queue.shift()); }));
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    // drop variants that are no longer referenced
    const wanted = new Set([...jobs.keys(), 'manifest.json']);
    for (const f of fs.readdirSync(outDir)) if (!wanted.has(f)) fs.unlinkSync(path.join(outDir, f));
    return { engine: engine.name, total: jobs.size, created: todo.length, sources: used.size };
  }

  return { use, tag, large, flush, dims };
}
