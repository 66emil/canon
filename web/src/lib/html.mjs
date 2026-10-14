// Small HTML helpers for the templates: escaping, Russian typography, text splitting, icons.

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const attrs = (o) => Object.entries(o)
  .filter(([, v]) => v !== undefined && v !== null && v !== false)
  .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join('');

export const join = (list, fn) => (list || []).map(fn).join('');

const NBSP = ' ';
// short words that should not hang at the end of a line
const SHORT = /(^|[\s(«„])((?:[вксоуяиаВКСОУЯИА]|на|по|за|не|из|от|до|об|во|ко|со|но|же|ни|для|при|без|над|под|про|как|что|это|или|все|его|их|мы|вы|он|она|они|На|По|За|Не|Из|От|До|Об|Во|Ко|Со|Но|Для|При|Без|Над|Под|Про|Как|Что|Это|Мы|Вы))\s+/g;

/** Russian typography for content strings: dashes, quotes, non-breaking spaces. Returns plain text. */
export function typo(s) {
  if (s == null) return '';
  let t = String(s).replace(/\s+/g, ' ').trim();
  t = t.replace(/\s+-\s+/g, `${NBSP}— `).replace(/\s+–\s+/g, `${NBSP}— `);
  t = t.replace(/"([^"]+)"/g, '«$1»');
  t = t.replace(/(\d)\s+(₽|руб|дн|час|мин|км|м\b|метр|чел|%)/g, `$1${NBSP}$2`);
  t = t.replace(/(\d)\s(\d{3})(?!\d)/g, `$1${NBSP}$2`);
  t = t.replace(/\s+([.,!?:;)»])/g, '$1');
  for (let i = 0; i < 2; i++) t = t.replace(SHORT, `$1$2${NBSP}`);
  return t;
}

/** typo + escape */
export const tx = (s) => esc(typo(s));

/** "89900" -> "89 900" */
export const rub = (n) => (n == null ? '' : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP));

export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const PUNCT = /^[.,!?:;»…)]+/;

/**
 * Splits "*accent*" markup into chunks and renders each word with wordFn. Punctuation that follows an
 * accent chunk ("*поход*?") is glued to its last word, and a short word before an accent chunk
 * ("в *поход*") is kept on the same line with it.
 */
function words(text, wordFn) {
  let html = '';
  let carry = null; // html of a short word that must not end a line
  for (const chunk of typo(text).split(/(\*[^*]+\*)/).filter(Boolean)) {
    const isAccent = chunk.startsWith('*');
    let body = isAccent ? chunk.slice(1, -1) : chunk;
    const lead = !isAccent && PUNCT.exec(body);
    if (lead && /<\/em>(<\/span>)?$/.test(html)) {
      html = html.replace(/(<\/span>(?:<\/span>)?)<\/em>(<\/span>)?$/, `<span class="punct">${esc(lead[0])}</span>$1</em>$2`);
      body = body.slice(lead[0].length);
    }
    const list = body.split(' ').filter(Boolean);
    if (!list.length) continue;
    const rendered = list.map((w) => wordFn(w.replace(/\u00a0$/, '')));
    let out = '';
    if (carry) {
      const first = rendered.shift();
      out = `<span class="nb">${carry} ${isAccent ? `<em class="accent">${first}</em>` : first}</span>`;
      carry = null;
      if (rendered.length) out += ` ${isAccent ? `<em class="accent">${rendered.join(' ')}</em>` : rendered.join(' ')}`;
    } else {
      if (!isAccent && /\u00a0$/.test(list[list.length - 1]) && rendered.length) carry = rendered.pop();
      out = isAccent ? `<em class="accent">${rendered.join(' ')}</em>` : rendered.join(' ');
    }
    if (out) html += (html ? ' ' : '') + out;
  }
  if (carry) html += (html ? ' ' : '') + carry;
  return html;
}

/** Words wrapped for the masked "rise" animation. Supports *accent* markup: 'Почему выбирают *нас*?' */
export function rise(text, { start = 0 } = {}) {
  let i = start;
  return words(text, (w) => `<span class="w"><span style="--wi:${i++}">${esc(w)}</span></span>`);
}

/** Words wrapped for the scroll-driven word highlight (statement blocks). */
export function scrollWords(text) {
  return words(text, (w) => `<span class="sw">${esc(w)}</span>`);
}

/** Inline accent markup without animation: 'Наши *путешествия*' */
export function accent(text) {
  return typo(text).split(/(\*[^*]+\*)/).filter(Boolean)
    .map((c) => (c.startsWith('*') ? `<em class="accent">${esc(c.slice(1, -1))}</em>` : esc(c))).join('');
}

export const icon = (name, cls = '') => `<svg class="i i-${name}${cls ? ` ${cls}` : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
