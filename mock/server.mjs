#!/usr/bin/env node
// Mock backend + static server for the canyontour.ru prototype. Node >= 18, no dependencies.
//
//   node mock/server.mjs            -> http://localhost:8080
//   PORT=3000 node mock/server.mjs
//
// Serves the wget mirror from ./site (pretty URLs like the real site), injects mock/shim.js
// into pages, strips analytics, answers Tilda form submits and exposes a JSON API (see mock/API.md).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SITE = path.join(ROOT, 'site');
const PAGES = path.join(SITE, 'canyontour.ru');
const DATA = path.join(HERE, 'data');
const DB_FILE = path.join(DATA, 'db.runtime.json');
const WEB_DIST = path.join(ROOT, 'web', 'dist'); // new design, built by `node web/build.mjs`
const PORT = Number(process.env.PORT || 8080);
const TILDA_PROJECT_ID = '4368899';

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const TOURS = readJson('tours.json');
const FAQ = readJson('faq.json');
const SITE_INFO = readJson('site.json');
const DEPARTURES = buildDepartures(TOURS);

// ---------- storage (JSON file, good enough for a prototype) ----------
let db = { leads: [], bookings: [] };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { /* first run */ }
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
const nextId = (prefix, list) => `${prefix}-${String(list.length + 1).padStart(6, '0')}`;
for (const b of db.bookings) {
  const d = DEPARTURES.find((x) => x.id === b.departureId);
  if (d && b.status !== 'cancelled') d.seatsBooked += b.participants;
}

// ---------- synthetic departures (NOT public data, see QUESTIONS.md) ----------
function buildDepartures(tours) {
  // Deterministic test schedule: season May–Sep 2027, a start every ~2 weeks, staggered per tour.
  const out = [];
  tours.forEach((t, i) => {
    if (!t.priceRub || !t.durationDays) return;
    for (let k = 0; k < 6; k++) {
      const start = new Date(Date.UTC(2027, 4, 2 + ((i * 3) % 14) + k * 21));
      if (start.getUTCMonth() > 8) break;
      const end = new Date(start.getTime() + (t.durationDays - 1) * 864e5);
      const seed = crypto.createHash('md5').update(t.slug + k).digest()[0];
      out.push({
        id: `${t.slug}-${start.toISOString().slice(0, 10)}`,
        tourSlug: t.slug,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        priceRub: t.priceRub,
        seatsTotal: SITE_INFO.booking.maxGroupSize,
        seatsBooked: seed % 13,
        _synthetic: true,
      });
    }
  });
  return out;
}

// ---------- helpers ----------
// CDN URL -> path in the local mirror when the file was downloaded (prototype works offline)
const localAsset = (u) => {
  const m = /^https?:\/\/([^/]+)(\/[^?#]+)/.exec(u || '');
  return m && fs.existsSync(path.join(SITE, m[1], decodeURIComponent(m[2]))) ? `/${m[1]}${m[2]}` : u;
};
const tourSummary = (t) => ({
  slug: t.slug, name: t.name, description: t.description, coverImage: localAsset(t.coverImage),
  priceRub: t.priceRub, durationDays: t.durationDays, difficulty: t.difficulty,
  fitnessLevel: t.fitnessLevel, url: `/${t.slug}`,
});
const departureView = (d) => ({ ...d, seatsLeft: Math.max(0, d.seatsTotal - d.seatsBooked) });
const normPhone = (p) => String(p || '').replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function findTourByName(name) {
  if (!name) return null;
  const n = name.toLowerCase().replace(/["«»]/g, '').trim();
  return TOURS.find((t) => t.name.toLowerCase().replace(/["«»]/g, '').includes(n) || n.includes(t.name.toLowerCase())) || null;
}

function validateContact({ name, phone, email }, { emailRequired = false } = {}) {
  const errors = {};
  if (!name || !String(name).trim()) errors.name = 'required';
  const ph = normPhone(phone);
  if (!ph) errors.phone = 'required';
  else if (ph.length < 10 || ph.length > 15) errors.phone = 'invalid';
  if (email && !EMAIL_RE.test(email)) errors.email = 'invalid';
  if (!email && emailRequired) errors.email = 'required';
  return errors;
}

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body) || typeof body === 'string';
  res.writeHead(status, {
    'Content-Type': isBuf ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    ...headers,
  });
  res.end(isBuf ? body : JSON.stringify(body, null, 2));
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  const type = req.headers['content-type'] || '';
  if (type.includes('application/json')) return raw ? JSON.parse(raw) : {};
  if (type.includes('multipart/form-data')) return parseMultipart(raw, type);
  // Tilda sends application/x-www-form-urlencoded; repeated keys (formservices[]) become arrays
  const out = {};
  for (const [k, v] of new URLSearchParams(raw)) {
    if (k in out) out[k] = [].concat(out[k], v); else out[k] = v;
  }
  return out;
}

function parseMultipart(raw, type) {
  const boundary = type.split('boundary=')[1];
  const out = {};
  for (const part of raw.split(`--${boundary}`)) {
    const m = part.match(/name="([^"]+)"(?:; filename="[^"]*")?\r\n(?:[^\r\n]+\r\n)*\r\n([\s\S]*)\r\n$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

// ---------- API ----------
const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern: new RegExp(`^${pattern}$`), handler });

route('GET', '/api/health', () => [200, { ok: true, tours: TOURS.length, leads: db.leads.length, bookings: db.bookings.length }]);

route('GET', '/api/tours', (_req, _m, q) => {
  let list = TOURS.filter((t) => t.priceRub);
  if (q.get('difficulty')) list = list.filter((t) => (t.difficulty || '').startsWith(q.get('difficulty')));
  if (q.get('maxPrice')) list = list.filter((t) => t.priceRub <= Number(q.get('maxPrice')));
  if (q.get('minDays')) list = list.filter((t) => t.durationDays >= Number(q.get('minDays')));
  if (q.get('maxDays')) list = list.filter((t) => t.durationDays <= Number(q.get('maxDays')));
  const sort = q.get('sort');
  if (sort === 'price') list = [...list].sort((a, b) => a.priceRub - b.priceRub);
  if (sort === 'duration') list = [...list].sort((a, b) => a.durationDays - b.durationDays);
  return [200, { items: list.map(tourSummary), total: list.length }];
});

route('GET', '/api/tours/([\\w-]+)', (_req, m) => {
  const t = TOURS.find((x) => x.slug === m[1]);
  if (!t) return [404, { error: 'tour_not_found' }];
  const { _parse, ...tour } = t;
  return [200, { ...tour, coverImage: localAsset(t.coverImage), prepaymentRub: t.priceRub ? Math.round((t.priceRub * (t.prepaymentPercent || SITE_INFO.booking.prepaymentPercent)) / 100) : null, parseWarnings: _parse?.warnings || [] }];
});

route('GET', '/api/tours/([\\w-]+)/departures', (_req, m) => {
  if (!TOURS.some((x) => x.slug === m[1])) return [404, { error: 'tour_not_found' }];
  return [200, { items: DEPARTURES.filter((d) => d.tourSlug === m[1]).map(departureView), _synthetic: true }];
});

route('GET', '/api/departures', (_req, _m, q) => {
  let list = DEPARTURES;
  if (q.get('from')) list = list.filter((d) => d.startDate >= q.get('from'));
  if (q.get('to')) list = list.filter((d) => d.startDate <= q.get('to'));
  if (q.get('available') === '1') list = list.filter((d) => d.seatsBooked < d.seatsTotal);
  return [200, { items: list.map(departureView), _synthetic: true }];
});

route('GET', '/api/faq', () => [200, { items: FAQ }]);
route('GET', '/api/camping', () => [200, SITE_INFO.camping]);
route('GET', '/api/team', () => [200, { items: SITE_INFO.team }]);
route('GET', '/api/contacts', () => [200, { ...SITE_INFO.contacts, company: SITE_INFO.company }]);
route('GET', '/api/booking-rules', () => [200, SITE_INFO.booking]);
route('GET', '/api/forms/lead', () => [200, SITE_INFO.leadForm]);

route('POST', '/api/leads', async (req) => {
  const b = await readBody(req);
  const errors = validateContact(b);
  if (!b.consent) errors.consent = 'required';
  const tour = b.tourSlug ? TOURS.find((t) => t.slug === b.tourSlug) : findTourByName(b.tourName);
  if (b.tourSlug && !tour) errors.tourSlug = 'unknown';
  if (b.departureId && !DEPARTURES.some((d) => d.id === b.departureId)) errors.departureId = 'unknown';
  if (Object.keys(errors).length) return [422, { error: 'validation_failed', fields: errors }];
  const lead = {
    id: nextId('L', db.leads), createdAt: new Date().toISOString(), source: 'api', status: 'new',
    name: String(b.name).trim(), phone: normPhone(b.phone), email: b.email || null,
    tourSlug: tour?.slug || null, tourChoice: b.tourName || null, departureId: b.departureId || null,
    comment: b.comment || null, pageUrl: b.pageUrl || null, utm: b.utm || null,
  };
  db.leads.push(lead); save();
  return [201, lead];
});

route('GET', '/api/leads', () => [200, { items: db.leads, total: db.leads.length }]);
route('PATCH', '/api/leads/(L-\\d+)', async (req, m) => {
  const lead = db.leads.find((l) => l.id === m[1]);
  if (!lead) return [404, { error: 'lead_not_found' }];
  const b = await readBody(req);
  const STATUSES = ['new', 'contacted', 'booked', 'rejected'];
  if (b.status && !STATUSES.includes(b.status)) return [422, { error: 'validation_failed', fields: { status: `one of ${STATUSES}` } }];
  Object.assign(lead, b.status ? { status: b.status } : {}, b.comment ? { comment: b.comment } : {}, { updatedAt: new Date().toISOString() });
  save();
  return [200, lead];
});

// Hypothetical online booking (the live site only collects leads; see QUESTIONS.md)
route('POST', '/api/bookings', async (req) => {
  const b = await readBody(req);
  const dep = DEPARTURES.find((d) => d.id === b.departureId);
  const participants = Number(b.participants || 1);
  const errors = validateContact(b.contact || {}, { emailRequired: true });
  if (!dep) errors.departureId = 'unknown';
  if (!Number.isInteger(participants) || participants < 1) errors.participants = 'invalid';
  if (!b.consent) errors.consent = 'required';
  if (Object.keys(errors).length) return [422, { error: 'validation_failed', fields: errors }];
  if (dep.seatsTotal - dep.seatsBooked < participants) return [409, { error: 'not_enough_seats', seatsLeft: dep.seatsTotal - dep.seatsBooked }];
  const total = dep.priceRub * participants;
  const booking = {
    id: nextId('B', db.bookings), createdAt: new Date().toISOString(), status: 'pending_prepayment',
    departureId: dep.id, tourSlug: dep.tourSlug, participants,
    contact: { name: b.contact.name, phone: normPhone(b.contact.phone), email: b.contact.email },
    totalRub: total, prepaymentRub: Math.round((total * SITE_INFO.booking.prepaymentPercent) / 100),
    freeCancellationUntil: new Date(Date.parse(dep.startDate) - SITE_INFO.booking.freeCancellationDaysBefore * 864e5).toISOString().slice(0, 10),
    _synthetic: true,
  };
  dep.seatsBooked += participants;
  db.bookings.push(booking); save();
  return [201, booking];
});
route('GET', '/api/bookings/(B-\\d+)', (_req, m) => {
  const b = db.bookings.find((x) => x.id === m[1]);
  return b ? [200, b] : [404, { error: 'booking_not_found' }];
});

route('DELETE', '/api/_reset', () => { db = { leads: [], bookings: [] }; save(); DEPARTURES.splice(0, DEPARTURES.length, ...buildDepartures(TOURS)); return [200, { ok: true }]; });

// Tilda-compatible endpoint: what forms.tildaapi.com/procces/ does for the page JS
route('POST', '/__mock/tilda/procces/?', async (req) => {
  const b = await readBody(req);
  const errors = validateContact({ name: b.Name, phone: b.Phone, email: b.Email });
  if (Object.keys(errors).length) {
    const first = Object.entries(errors)[0];
    return [200, { error: `Поле ${first[0]}: ${first[1] === 'required' ? 'обязательно для заполнения' : 'неверный формат'}` }];
  }
  let pageSlug = null;
  try { pageSlug = new URL(b['tildaspec-referer']).pathname.replace(/^\/|\.html$/g, '') || 'index'; } catch { /* no referer */ }
  const choice = b['Какой тур вас заинтересовал'] || null;
  const tour = TOURS.find((t) => t.slug === pageSlug) || findTourByName(choice);
  const lead = {
    id: nextId('L', db.leads), createdAt: new Date().toISOString(), source: 'tilda-form', status: 'new',
    name: b.Name, phone: normPhone(b.Phone), email: b.Email || null,
    tourSlug: tour?.slug || null, tourChoice: choice, departureId: null, comment: null,
    pageUrl: b['tildaspec-referer'] || null, formId: b['tildaspec-formid'] || null,
    raw: Object.fromEntries(Object.entries(b).filter(([k]) => k !== 'tildaspec-cookie')),
  };
  db.leads.push(lead); save();
  console.log(`[lead] ${lead.id} ${lead.name} ${lead.phone} tour=${lead.tourSlug || choice || '-'} form=${lead.formId}`);
  const tranId = crypto.randomBytes(8).toString('hex');
  return [200, { message: 'OK', results: [`${TILDA_PROJECT_ID}:${tranId}`] }];
});

route('GET', '/__mock/shim.js', () => [200, fs.readFileSync(path.join(HERE, 'shim.js')), { 'Content-Type': 'text/javascript; charset=utf-8' }]);

// ---------- static mirror ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.eot': 'application/vnd.ms-fontobject', '.mp4': 'video/mp4', '.txt': 'text/plain',
};
function mimeOf(file) {
  // wget names like "x.min.css?t=123.css" or google "css2?family=...css"
  const base = file.split('?')[0];
  return MIME[path.extname(file).toLowerCase()] || MIME[path.extname(base).toLowerCase()] || 'application/octet-stream';
}

const TRACKER_SCRIPT = /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?(mc\.yandex\.ru|_tmr|fbq\(|fbq=|tildastatscript|vk\.com\/rtrg|VK\.Retargeting)(?:(?!<\/script>)[\s\S])*?<\/script>/gi;
const TRACKER_NOSCRIPT = /<noscript>\s*(?:<div>)?\s*<img[^>]+(mc\.yandex\.ru|mail\.ru|facebook\.com|vk\.com)[^>]*>\s*(?:<\/div>)?\s*<\/noscript>/gi;

function renderHtml(file, base = '/') {
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(TRACKER_SCRIPT, '<!-- [mock] analytics removed -->').replace(TRACKER_NOSCRIPT, '');
  html = html.replace(/https?:\/\/canyontour\.ru\//g, base);
  html = html.replace(/<head>/i, '<head><script src="/__mock/shim.js"></script>');
  return html;
}

function resolveStatic(pathname, search) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '/index') rel = '/canyontour.ru/index.html';
  else if (/^\/[\w-]+(\.html)?$/.test(rel)) rel = `/canyontour.ru${rel.endsWith('.html') ? rel : rel + '.html'}`;
  const candidates = [rel];
  if (search) candidates.push(rel + decodeURIComponent(search), rel + decodeURIComponent(search) + path.extname(rel));
  // Tilda lazyload turns image URLs into optim/thb variants (/-/format/webp/, /-/resize/20x/, ...)
  // which are not in the mirror -> serve the original file instead
  const variant = /^\/(?:optim|thb)\.tildacdn\.[a-z]+\/(tild[\w-]+)\/-\/.*\/([^/]+?)(\.webp)?$/.exec(rel);
  if (variant) candidates.push(`/static.tildacdn.com/${variant[1]}/${variant[2]}`, `/static.tildacdn.com/${variant[1]}/${variant[2]}${variant[3] || ''}`);
  // tilda-fallback requests "tilda-fallback-advanced-1.0.min.js" relative to the page
  if (/^\/[\w.-]+\.js$/.test(rel)) candidates.push(`/neo.tildacdn.com/js${rel}`, `/static.tildacdn.com/js${rel}`);
  for (const c of candidates) {
    const abs = path.normalize(path.join(SITE, c));
    if (!abs.startsWith(SITE + path.sep)) return null;
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  }
  return null;
}

// New design: pretty URLs like on the live site (/elbrus -> web/dist/elbrus.html), assets under /assets, /img
function resolveWeb(pathname) {
  if (!fs.existsSync(path.join(WEB_DIST, 'index.html'))) return null;
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '/index') rel = '/index.html';
  else if (/^\/[\w-]+$/.test(rel)) rel += '.html';
  else if (!/^\/([\w-]+\.html|(assets|img)\/.+)$/.test(rel)) return null;
  const abs = path.normalize(path.join(WEB_DIST, rel));
  if (!abs.startsWith(WEB_DIST + path.sep)) return null;
  return fs.existsSync(abs) && fs.statSync(abs).isFile() ? abs : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') return send(res, 204, '');
  try {
    for (const r of routes) {
      const m = url.pathname.match(r.pattern);
      if (m && r.method === req.method) {
        const [status, body, headers] = await r.handler(req, m, url.searchParams);
        return send(res, status, body, headers);
      }
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not_found' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method_not_allowed' });

    // /old/<slug> -> the original Tilda page from the mirror (for side-by-side comparison)
    const old = /^\/old(\/.*)?$/.exec(url.pathname);
    const webFile = old ? null : resolveWeb(url.pathname);
    const file = webFile || resolveStatic(old ? old[1] || '/' : url.pathname, url.search);
    if (!file) {
      console.warn(`[404] ${url.pathname}${url.search}`);
      const page404 = path.join(WEB_DIST, '404.html');
      if (!old && /^\/[\w-]*$/.test(url.pathname) && fs.existsSync(page404)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(page404));
      }
      return send(res, 404, `Not in mirror: ${url.pathname}\nRun tools/fetch_missing.py to fetch missing assets`);
    }
    const type = mimeOf(file);
    const body = webFile ? fs.readFileSync(file) : type.startsWith('text/html') ? renderHtml(file, old ? '/old/' : '/') : fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (e) {
    console.error(e);
    send(res, e instanceof SyntaxError ? 400 : 500, { error: e instanceof SyntaxError ? 'bad_json' : 'internal_error' });
  }
});

server.listen(PORT, () => {
  console.log(`canyontour mock: http://localhost:${PORT}  (tours=${TOURS.length}, departures=${DEPARTURES.length} synthetic)`);
  console.log(fs.existsSync(path.join(WEB_DIST, 'index.html'))
    ? `  new design: http://localhost:${PORT}/   original Tilda pages: http://localhost:${PORT}/old/`
    : '  web/dist not built yet (node web/build.mjs) -> serving the original Tilda pages');
});
