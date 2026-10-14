// Responsive images for the build: photos from the mirror (site/static.tildacdn.com/<tild-id>/<file>)
// are resized to a few widths with macOS `sips` (no npm dependencies). Without sips the originals
// are copied as is, so the build still works elsewhere, just heavier.
import fs from 'node:fs';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { attrs } from './html.mjs';

const WIDTHS = [480, 960, 1600];
// sips' JPEG scale is not libjpeg's: 45 here is visually lossless for photos and ~2x smaller than 74
const QUALITY = 45;

export function createImages({ srcRoot, outDir, urlPrefix = '/img' }) {
  fs.mkdirSync(outDir, { recursive: true });
  const manifestFile = path.join(outDir, 'manifest.json');
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch { /* first build */ }
  const hasSips = (() => { try { execFileSync('sips', ['--help'], { stdio: 'ignore' }); return true; } catch { return false; } })();
  const jobs = new Map();
  const used = new Set();

  function dims(rel) {
    if (manifest[rel]) return manifest[rel];
    const file = path.join(srcRoot, rel);
    if (!fs.existsSync(file)) throw new Error(`image not in mirror: ${rel}`);
    let w = 1600, h = 1067;
    if (hasSips) {
      const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
      w = +/pixelWidth: (\d+)/.exec(out)[1]; h = +/pixelHeight: (\d+)/.exec(out)[1];
    }
    return (manifest[rel] = { w, h });
  }

  const keyOf = (rel) => {
    const [dir, file] = rel.split('/');
    const base = file.replace(/\.[a-z]+$/i, '').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    return `${dir.replace(/^tild/, '').replace(/-/g, '').slice(0, 10)}-${base || 'img'}`;
  };

  /** Registers an image and returns {src, srcset, width, height}. rel = "tildXXXX-.../file.jpg" */
  function use(rel, { max = 1600 } = {}) {
    const { w, h } = dims(rel);
    const key = keyOf(rel);
    used.add(rel);
    if (!hasSips) {
      const ext = path.extname(rel).toLowerCase();
      jobs.set(`${key}${ext}`, { rel, width: null });
      return { src: `${urlPrefix}/${key}${ext}`, srcset: null, width: w, height: h };
    }
    const widths = WIDTHS.filter((x) => x < w && x <= max);
    if (w <= max) widths.push(w); else if (!widths.includes(max)) widths.push(max);
    const list = [...new Set(widths)].sort((a, b) => a - b);
    for (const x of list) jobs.set(`${key}-${x}.jpg`, { rel, width: x, native: x === w && /\.jpe?g$/i.test(rel) });
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

  async function flush({ concurrency = 8, log = console.log } = {}) {
    const todo = [...jobs].filter(([name]) => !fs.existsSync(path.join(outDir, name)));
    let done = 0;
    const run = async ([name, { rel, width, native }]) => {
      const from = path.join(srcRoot, rel);
      const to = path.join(outDir, name);
      // the CDN already compressed the uploads: re-encoding at the same size would only make them bigger
      if (width == null || native) { fs.copyFileSync(from, to); return; }
      await new Promise((resolve, reject) => execFile('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALITY),
        '--resampleWidth', String(width), from, '--out', to], (err) => (err ? reject(err) : resolve())));
      if (++done % 100 === 0) log(`  images: ${done}/${todo.length}`);
    };
    const queue = [...todo];
    await Promise.all(Array.from({ length: concurrency }, async () => { while (queue.length) await run(queue.shift()); }));
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    // drop variants that are no longer referenced
    const wanted = new Set([...jobs.keys(), 'manifest.json']);
    for (const f of fs.readdirSync(outDir)) if (!wanted.has(f)) fs.unlinkSync(path.join(outDir, f));
    return { total: jobs.size, created: todo.length, sources: used.size };
  }

  return { use, tag, large, flush, dims };
}
