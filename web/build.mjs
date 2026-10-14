#!/usr/bin/env node
// Static build of the new canyontour.ru design. Node >= 18, no npm dependencies.
//
//   node web/build.mjs          -> web/dist (HTML, assets, resized photos)
//
// Content comes from mock/data/*.json and web/content/content.json
// (regenerate the latter with: python3 -I tools/extract_content.py site/canyontour.ru web/content/content.json).
// Photos are taken from the mirror in site/static.tildacdn.com and resized with macOS `sips`.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadData } from './src/data.mjs';
import { createImages } from './src/lib/images.mjs';
import { renderHome } from './src/templates/home.mjs';
import { renderTour } from './src/templates/tour.mjs';
import { renderCamping, renderPolicy, renderThanks, renderNotFound } from './src/templates/pages.mjs';

const WEB = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(WEB, '..');
const SRC = path.join(WEB, 'src');
const DIST = path.join(WEB, 'dist');

const t0 = Date.now();
const d = loadData(ROOT);
const img = createImages({ srcRoot: path.join(ROOT, 'site', 'static.tildacdn.com'), outDir: path.join(DIST, 'img') });

// ---------- assets
const assets = path.join(DIST, 'assets');
fs.mkdirSync(path.join(assets, 'fonts'), { recursive: true });
const css = fs.readFileSync(path.join(SRC, 'css', 'main.css'), 'utf8');
const js = fs.readFileSync(path.join(SRC, 'js', 'main.js'), 'utf8');
fs.writeFileSync(path.join(assets, 'main.css'), css);
fs.writeFileSync(path.join(assets, 'main.js'), js);
for (const f of fs.readdirSync(path.join(SRC, 'fonts'))) fs.copyFileSync(path.join(SRC, 'fonts', f), path.join(assets, 'fonts', f));
const logoPaths = fs.readFileSync(path.join(SRC, 'svg', 'logo.svg'), 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
fs.writeFileSync(path.join(assets, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 65"><circle cx="32.35" cy="32.35" r="32.35" fill="#17201a"/><g fill="#f4f0e6">${logoPaths}</g></svg>`);
d.assetVersion = crypto.createHash('md5').update(css + js).digest('hex').slice(0, 8);

// ---------- pages
const pages = { index: renderHome(d, img) };
for (const t of d.tours) pages[t.slug] = renderTour(d, img, t);
pages.campig = renderCamping(d, img);
pages.policy = renderPolicy(d, img);
pages.success = renderThanks(d, img, { path: '/success' });
pages.sps = renderThanks(d, img, { path: '/sps' });
pages['404'] = renderNotFound(d, img);
for (const [name, html] of Object.entries(pages)) fs.writeFileSync(path.join(DIST, `${name}.html`), html);

const stats = await img.flush({ log: (m) => console.log(m) });
console.log(`web/dist: ${Object.keys(pages).length} pages, ${stats.sources} photos -> ${stats.total} files (${stats.created} new) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
