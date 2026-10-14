// Sections reused by several pages.
import { esc, tx, icon, join, rub, rise, plural } from '../lib/html.mjs';
import { btn, leadForm } from './layout.mjs';

export const days = (n) => `${n} ${plural(n, 'день', 'дня', 'дней')}`;

/** 3-step difficulty meter */
export const meter = (lvl, label) => lvl
  ? `<span class="meter" data-level="${lvl}" title="${esc(label)}"><i></i><i></i><i></i></span>`
  : '';

export function sectionHead({ kicker, title, lead, cls = '', level = 2, id }) {
  return `<div class="shead ${cls}">
    ${kicker ? `<span class="kicker" data-reveal>${esc(kicker)}</span>` : ''}
    <h${level} class="h2 shead__t"${id ? ` id="${id}"` : ''} data-rise>${rise(title)}</h${level}>
    ${lead ? `<p class="lead shead__lead" data-reveal>${tx(lead)}</p>` : ''}
  </div>`;
}

/** Big photo card used in horizontal rails */
export function tourCard(img, t, { title, text, sizes = '(min-width: 1024px) 34vw, 82vw' } = {}) {
  return `<a class="tcard" href="${t.url}" data-cursor="Смотреть">
    <span class="tcard__media">${img.tag(t.cover, { alt: t.name, sizes, cls: 'tcard__img' })}</span>
    <span class="tcard__top">
      <span class="tag tag--glass">${icon('clock')}${days(t.days)}</span>
      ${t.priceRub ? `<span class="tag tag--glass">${rub(t.priceRub)}&nbsp;₽</span>` : ''}
    </span>
    <span class="tcard__float">
      <span class="tcard__kind">${esc(t.kind)}${t.altitude ? ` · ${esc(t.altitude.replace(' метров над уровнем моря', ' м'))}` : ''}</span>
      <span class="tcard__title">${tx(title || t.name)}</span>
      ${text ? `<span class="tcard__text">${tx(text)}</span>` : ''}
      <span class="tcard__tags">
        <span class="tag">Сложность ${meter(t.difficulty, t.difficultyText)} ${esc(t.difficultyText)}</span>
        ${t.ridingNote && /сильных|опытных/.test(t.ridingNote) ? `<span class="tag tag--accent">${tx(t.ridingNote)}</span>` : ''}
      </span>
    </span>
  </a>`;
}

/** Dark list of tours with hover preview ("Полное расписание") */
export function scheduleList(img, tours) {
  return `<div class="sched" data-sched>
    ${join(tours, (t, i) => `
    <article class="sched__row" data-reveal style="--i:${i}">
      <a class="sched__link" href="${t.url}" aria-label="${esc(t.name)}: программа и цены" data-preview="${img.use(t.cover, { max: 960 }).src}"></a>
      <span class="sched__n">${String(i + 1).padStart(2, '0')}</span>
      <span class="sched__thumb">${img.tag(t.cover, { alt: '', sizes: '96px', max: 480 })}</span>
      <div class="sched__main">
        <h3 class="sched__title">${tx(t.name)}</h3>
        <ul class="sched__facts" aria-label="Коротко о туре">
          <li>${icon('clock')}${days(t.days)}</li>
          <li>${meter(t.difficulty, t.difficultyText)}<span class="sr">Сложность: </span>${esc(t.difficultyText)}</li>
          ${t.priceRub ? `<li class="sched__price">${rub(t.priceRub)}&nbsp;₽</li>` : ''}
        </ul>
        <p class="sched__text">${tx(t.teaser)}</p>
      </div>
      <div class="sched__act">
        ${btn('Забронировать', { cls: 'btn--light btn--sm', data: { 'data-book': t.slug } })}
        <span class="sched__go">${icon('arrow-up-right')}</span>
      </div>
    </article>`)}
    <div class="sched__preview" aria-hidden="true"><img alt=""></div>
  </div>`;
}

export function faqSection(d, { id = 'faq' } = {}) {
  const answer = (a) => a.split('\n').map((l) => l.trim()).filter(Boolean).reduce((acc, l) => {
    if (l.startsWith('•')) {
      if (!acc.list) acc.html += '<ul>', acc.list = true;
      acc.html += `<li>${tx(l.replace(/^•\s*/, ''))}</li>`;
    } else {
      if (acc.list) acc.html += '</ul>', acc.list = false;
      const isHead = /^[А-ЯЁ\s]+:$/.test(l);
      if (l === 'WhatsApp') acc.html += `<p><a class="link-line" href="${d.contacts.whatsapp}" target="_blank" rel="noopener">Написать в WhatsApp</a></p>`;
      else if (l !== '(нажмите, чтобы открыть чат).') acc.html += isHead ? `<p class="faq__h">${tx(l.slice(0, -1).toLowerCase().replace(/^./, (c) => c.toUpperCase()))}</p>` : `<p>${tx(l)}</p>`;
    }
    return acc;
  }, { html: '', list: false });
  return `<section class="section faq-sec" id="${id}">
    <div class="container split">
      <div class="split__aside">
        <span class="kicker" data-reveal>FAQ</span>
        <h2 class="h2" data-rise>${rise('Частые *вопросы*')}</h2>
        <p class="muted" data-reveal>Не нашли ответ? Напишите нам — расскажем про маршрут, снаряжение и даты.</p>
        <div class="btn-row" data-reveal>
          ${btn('Спросить в WhatsApp', { href: d.contacts.whatsapp, cls: 'btn--ghost', ic: 'whatsapp', external: true })}
        </div>
      </div>
      <div class="faq" data-reveal>
        ${join(d.faq, (q) => {
          const r = answer(q.answer);
          return `<details class="faq__item">
            <summary><span>${tx(q.question)}</span><span class="pm" aria-hidden="true"></span></summary>
            <div class="faq__a"><div class="faq__in">${r.html}${r.list ? '</ul>' : ''}</div></div>
          </details>`;
        })}
      </div>
    </div>
  </section>`;
}

export function socialTiles(d) {
  const c = d.contacts;
  const tiles = [
    { href: c.vk, label: 'ВКонтакте', ic: 'vk', note: 'Новости и фотоотчёты' },
    { href: c.instagram, label: 'Instagram', ic: 'instagram', note: '_canyontour_' },
    { href: c.telegramChannel, label: 'Telegram', ic: 'telegram', note: 'Канал КаньонТур' },
    { href: c.whatsapp, label: 'WhatsApp', ic: 'whatsapp', note: 'Написать нам' },
  ];
  return `<section class="section section--tight soc-sec">
    <div class="container">
      <div class="soc-head">
        <h2 class="h3" data-rise>${rise('Больше о нас в *соц. сетях*')}</h2>
      </div>
      <div class="soc-tiles" data-stagger>
        ${join(tiles, (t) => `<a class="soc-tile" href="${t.href}" target="_blank" rel="noopener">
          <span class="soc-tile__ic">${icon(t.ic)}</span>
          <span class="soc-tile__l">${esc(t.label)}</span>
          <span class="soc-tile__n">${esc(t.note)}</span>
          <span class="soc-tile__go">${icon('arrow-up-right')}</span>
        </a>`)}
      </div>
    </div>
  </section>`;
}

/** Dark CTA card with the lead form ("Пойдём в поход?") */
export function ctaSection(d, img, { tour = null, title = 'Пойдём в *поход*?', image } = {}) {
  const options = d.site.leadForm.fields.find((f) => f.options)?.options;
  return `<section class="section section--tight cta-sec" id="request">
    <div class="container">
      <div class="cta" data-theme="dark" data-reveal>
        <div class="cta__glow" aria-hidden="true"></div>
        <div class="cta__body">
          <span class="pill-live"><i></i>Отвечаем в Telegram и WhatsApp</span>
          <h2 class="xl cta__t" data-rise>${rise(title)}</h2>
          <p class="cta__sub">${tour
            ? tx(`Получите бесплатную консультацию о туре «${tour.name}». Оставьте данные — и мы свяжемся с вами.`)
            : 'Оставьте свои данные, и мы свяжемся с вами в ближайшее время.'}</p>
          ${leadForm(d, { id: tour ? `cta-${tour.slug}` : 'cta-form', tour, choice: tour ? false : options, dark: true, submit: 'Отправить' })}
        </div>
        <div class="cta__media" aria-hidden="true">
          ${img.tag(image || d.home.formImage, { alt: '', sizes: '(min-width: 1024px) 40vw, 1px', cls: 'cta__img' })}
          <div class="cta__chat">
            <a class="cta__chip" href="${d.contacts.telegram}" target="_blank" rel="noopener" tabindex="-1">${icon('telegram')} Telegram</a>
            <a class="cta__chip" href="${d.contacts.whatsapp}" target="_blank" rel="noopener" tabindex="-1">${icon('whatsapp')} WhatsApp</a>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

/** Horizontal rail of tour cards (sticky horizontal scroll on desktop, swipe on touch) */
export function tourRail(img, items, { intro, more } = {}) {
  return `<div class="hscroll" data-hscroll>
    <div class="hscroll__sticky">
      <div class="hscroll__track" data-hscroll-track>
        ${intro || ''}
        ${join(items, (it) => tourCard(img, it.tour, it))}
        ${more || ''}
      </div>
      <div class="hscroll__bar" aria-hidden="true"><i data-hscroll-bar></i></div>
    </div>
  </div>`;
}

export const marquee = (html, { cls = '', speed = 1 } = {}) => `<div class="marquee ${cls}" data-marquee data-speed="${speed}" aria-hidden="true">
  <div class="marquee__track"><div class="marquee__item">${html}</div><div class="marquee__item">${html}</div></div>
</div>`;

