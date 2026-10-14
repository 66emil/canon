// Page shell shared by all pages: <head>, icon sprite, preloader, header, menu, footer, modals.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, tx, attrs, icon, join, accent } from '../lib/html.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOGO = fs.readFileSync(path.join(HERE, '..', 'svg', 'logo.svg'), 'utf8')
  .replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

// Icons are drawn for this project (24×24, stroke = currentColor); the logo is the brand emblem.
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="i-logo" viewBox="0 0 65 65">${LOGO}</symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-arrow-up-right" viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-arrow-up" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-chevron" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
<symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
<symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor"/></symbol>
<symbol id="i-phone" viewBox="0 0 24 24"><path d="M5 4h3.5l1.6 4-2.1 1.4a11 11 0 0 0 6.6 6.6l1.4-2.1 4 1.6V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
<symbol id="i-mail" viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m4.5 7.5 7.5 5.5 7.5-5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
<symbol id="i-telegram" viewBox="0 0 24 24"><path d="M20.5 4.5 3.8 11a.6.6 0 0 0 0 1.1l4.2 1.5 1.6 5a.6.6 0 0 0 1 .25l2.4-2.3 4.3 3.2a.7.7 0 0 0 1.1-.4l3-14.1a.6.6 0 0 0-.9-.75Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m8 13.6 8.7-6-6.4 7.1-.6 4.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
<symbol id="i-whatsapp" viewBox="0 0 24 24"><path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.2 8.6c.2-.4.6-.4.8 0l.7 1.5c.1.3 0 .5-.2.7l-.4.4c.5 1.1 1.4 2 2.6 2.6l.4-.4c.2-.2.5-.3.7-.2l1.5.7c.4.2.4.6 0 .9-.6.6-1.5.9-2.4.6a7 7 0 0 1-4.2-4.2c-.3-.9 0-1.9.5-2.6Z" fill="currentColor"/></symbol>
<symbol id="i-vk" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6.5 9 9 15.5 11.5 9M13.5 9v6.5M17.5 9l-4 3.3 4 3.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-instagram" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></symbol>
<symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10" r="2.3" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
<symbol id="i-peak" viewBox="0 0 24 24"><path d="M2.5 19.5 9.5 7l3.6 6.3 2.4-3.8 6 10Z" fill="currentColor"/><path d="m8 9.7 1.5-2.7 1.6 2.8-1.1-.6Z" fill="#fff" opacity=".85"/></symbol>
<symbol id="i-horse" viewBox="0 0 24 24"><path d="M5 20c.4-3.4 1.6-5.6 3.6-6.8l-1.4-2.9c-.3-.7.1-1.4.8-1.6L12 7.5l1.6-3 1.4 2.3c2.6 1.3 4.5 3.9 5 7.2l-1.8 1-1.6-2.2-2 1.3.6 3.4c.2 1.2-.5 2.3-1.6 2.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 19.5c.6-3.2 2.7-5 5.5-5s4.9 1.8 5.5 5M15.5 5.6a3.2 3.2 0 0 1 0 6M17 14.7c2 .5 3.2 2.1 3.5 4.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
<symbol id="i-gauge" viewBox="0 0 24 24"><path d="M4 17a8 8 0 1 1 16 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="m12 17 3.5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
<symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 10h17M8 3.5v3M16 3.5v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.2 4L19 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-expand" viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</svg>`;

/** Pill button with rolling label + round icon. */
export function btn(label, { href, cls = '', ic = 'arrow', type, data = {}, external = false, aria } = {}) {
  const tag = href ? 'a' : 'button';
  const a = attrs({
    class: `btn ${cls}`.trim(), href, type: href ? null : type || 'button', 'aria-label': aria,
    target: external ? '_blank' : null, rel: external ? 'noopener' : null, ...data,
  });
  const t = esc(label);
  return `<${tag}${a}><span class="btn__label"><span class="btn__t">${t}</span><span class="btn__t" aria-hidden="true">${t}</span></span>${ic ? `<span class="btn__ic">${icon(ic)}</span>` : ''}</${tag}>`;
}

export const logo = (cls = '') => `<svg class="logo ${cls}" aria-hidden="true"><use href="#i-logo"/></svg>`;

function header(d) {
  return `
<header class="hdr" data-hdr>
  <a class="hdr__brand" href="/" aria-label="КаньонТур — на главную">
    ${logo()}
    <span class="hdr__word">Каньон<br>Тур</span>
  </a>
  <div class="hdr__actions">
    <a class="hdr__phone" href="${d.contacts.phoneHref}">${icon('phone')}<span>${esc(d.contacts.phoneDisplay)}</span></a>
    ${btn('Забронировать', { cls: 'btn--glass hdr__cta', data: { 'data-book': '' } })}
    <button class="menu-btn" type="button" aria-label="Меню" aria-expanded="false" aria-controls="menu" data-menu-toggle>
      <span class="menu-btn__label" aria-hidden="true"><b>Меню</b><b>Закрыть</b></span>
      <span class="menu-btn__dots" aria-hidden="true"><i></i><i></i></span>
    </button>
  </div>
</header>`;
}

export const NAV = [
  { href: '/#tours', label: 'Туры' },
  { href: '/#schedule', label: 'Даты походов' },
  { href: '/#about', label: 'О нас' },
  { href: '/#reviews', label: 'Отзывы' },
  { href: '/campig', label: 'Наш кемпинг' },
  { href: '#contacts', label: 'Контакты' },
];

function socials(d, cls = '') {
  const c = d.contacts;
  return `<ul class="socials ${cls}">
    <li><a class="soc" href="${c.telegram}" target="_blank" rel="noopener" aria-label="Telegram">${icon('telegram')}</a></li>
    <li><a class="soc" href="${c.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon('whatsapp')}</a></li>
    <li><a class="soc" href="${c.vk}" target="_blank" rel="noopener" aria-label="ВКонтакте">${icon('vk')}</a></li>
    <li><a class="soc" href="${c.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${icon('instagram')}</a></li>
  </ul>`;
}

function menu(d) {
  const counts = { '/#tours': d.homeTours.length };
  return `
<div class="menu" id="menu" data-menu hidden>
  <div class="menu__overlay" data-menu-close></div>
  <div class="menu__panel" role="dialog" aria-modal="true" aria-label="Меню сайта" data-theme="dark">
    <div class="menu__top">
      <span class="menu__label">Меню</span>
      <button class="menu__close" type="button" data-menu-close aria-label="Закрыть меню">${icon('close')}</button>
    </div>
    <nav class="menu__nav" aria-label="Основная навигация">
      <ul>${join(NAV, (n, i) => `
        <li style="--i:${i}"><a href="${n.href}" data-menu-link><span class="menu__ln"><span>${esc(n.label)}</span></span>${counts[n.href] ? `<span class="menu__count">${counts[n.href]}</span>` : ''}</a></li>`)}
      </ul>
    </nav>
    <div class="menu__bottom">
      <div class="menu__contacts">
        <span class="kicker">Связаться с нами</span>
        <a class="link-line" href="${d.contacts.phoneHref}">${esc(d.contacts.phoneDisplay)}</a>
        <a class="link-line" href="mailto:${d.contacts.email}">${esc(d.contacts.email)}</a>
        ${socials(d, 'socials--light')}
      </div>
      ${btn('Забронировать тур', { cls: 'btn--fill btn--lg', data: { 'data-book': '' } })}
    </div>
  </div>
</div>`;
}

function footer(d) {
  const c = d.contacts, co = d.site.company;
  return `
<footer class="ftr" id="contacts" data-theme="sand">
  <div class="container">
    <a class="ftr__brand" href="/" aria-label="КаньонТур — на главную" data-reveal>
      ${logo('ftr__logo')}
      <span class="ftr__word">Каньон<span>тур</span></span>
    </a>
    <div class="ftr__cards" data-stagger>
      <div class="card ftr__nav">
        <nav aria-label="Навигация в подвале"><ul>
          ${join(NAV.slice(0, 5), (n) => `<li><a href="${n.href}">${esc(n.label)}</a></li>`)}
          <li><a href="/#faq">Частые вопросы</a></li>
        </ul></nav>
        <div class="ftr__fine">
          <a href="/policy">Политика конфиденциальности ${icon('arrow-up-right')}</a>
        </div>
      </div>
      <div class="ftr__mid">
        <a class="card ftr__line" href="${c.phoneHref}">${icon('phone')}<span>${esc(c.phoneDisplay)}</span></a>
        <a class="card ftr__line" href="mailto:${c.email}">${icon('mail')}<span>${esc(c.email)}</span></a>
        <div class="card ftr__chat">
          <p class="ftr__chat-t">${accent('Ответим в *мессенджере*')}</p>
          <div class="ftr__chat-btns">
            ${btn('Telegram', { href: c.telegram, cls: 'btn--ghost btn--sm', ic: 'telegram', external: true })}
            ${btn('WhatsApp', { href: c.whatsapp, cls: 'btn--ghost btn--sm', ic: 'whatsapp', external: true })}
          </div>
        </div>
      </div>
      <div class="card card--dark ftr__social" data-theme="dark">
        <div>
          <p class="ftr__name">КаньонТур</p>
          <p class="ftr__tag">Конные походы по горам Кавказа</p>
          ${socials(d, 'socials--light')}
        </div>
        <div class="ftr__bottom">
          <span>© 2022 ${esc(co.legalName.replace(/"/g, ''))}</span>
          <button class="to-top-sm" type="button" data-to-top aria-label="Наверх">${icon('arrow-up')}</button>
        </div>
      </div>
    </div>
    <details class="ftr__legal">
      <summary>Реквизиты ${icon('plus')}</summary>
      <dl>
        <div><dt>Организация</dt><dd>${tx(co.legalName)}</dd></div>
        <div><dt>Генеральный директор / главный бухгалтер</dt><dd>Ходов Вадим Ильич</dd></div>
        <div><dt>Юридический адрес</dt><dd>${tx(co.legalAddress)}</dd></div>
        <div><dt>Реестровый номер туроператора (РТО)</dt><dd>${esc(co.rto)}</dd></div>
        <div><dt>ИНН / КПП</dt><dd>${esc(co.inn)} / ${esc(co.kpp)}</dd></div>
        <div><dt>ОГРН</dt><dd>${esc(co.ogrn)}</dd></div>
        <div><dt>Банк</dt><dd>${tx(co.bank.name)}, БИК ${esc(co.bank.bik)}</dd></div>
        <div><dt>Р/с</dt><dd>${esc(co.bank.account)}</dd></div>
        <div><dt>К/с</dt><dd>${esc(co.bank.corrAccount)}</dd></div>
      </dl>
    </details>
  </div>
</footer>`;
}

function bookingModal(d) {
  const tours = d.tours.filter((t) => !t.archived && t.priceRub);
  return `
<div class="modal" id="booking" data-modal="booking" hidden>
  <div class="modal__overlay" data-modal-close></div>
  <div class="modal__panel" role="dialog" aria-modal="true" aria-labelledby="booking-title">
    <button class="modal__close" type="button" data-modal-close aria-label="Закрыть">${icon('close')}</button>
    <span class="kicker">Быстрое бронирование</span>
    <h2 class="modal__title" id="booking-title">${accent('Забронировать *поход*')}</h2>
    <p class="modal__lead">Оставьте контакты — менеджер свяжется с вами и оформит бронь.</p>
    ${leadForm(d, { id: 'booking-form', tours, withDates: true })}
  </div>
</div>`;
}

/** Lead form: posts to /api/leads (mock backend), then redirects to /success. */
export function leadForm(d, { id, tours = [], tour = null, withDates = false, choice = false, dark = false, extra = '', submit = 'Отправить заявку' } = {}) {
  const tourField = tour
    ? `<input type="hidden" name="tourSlug" value="${esc(tour.slug)}">`
    : choice
      ? `<fieldset class="chips"><legend>Какой тур вас заинтересовал?</legend>${join(choice, (o, i) => `
          <label class="chip"><input type="radio" name="tourName" value="${esc(o)}"${i === choice.length - 1 ? ' checked' : ''}><span>${tx(o)}</span></label>`)}</fieldset>`
      : `<label class="field"><span class="field__l">Тур</span><span class="select"><select name="tourSlug" data-tour-select>
          <option value="">Ещё не определился(-ась)</option>
          ${join(tours, (t) => `<option value="${t.slug}">${tx(t.name)}${t.subtitle && /Маршрут/.test(t.subtitle) ? ` (${tx(t.subtitle.replace('Маршрут ', ''))})` : ''}</option>`)}
        </select>${icon('chevron')}</span></label>`;
  const dates = withDates
    ? `<label class="field" data-dates-field hidden><span class="field__l">Свободные даты</span><span class="select"><select name="dates" data-dates-select></select>${icon('chevron')}</span></label>
       <p class="form__note" data-dates-note hidden></p>`
    : '';
  return `<form class="form${dark ? ' form--dark' : ''}" id="${id}" data-lead novalidate>
    ${tourField}
    ${dates}${extra}
    <div class="form__row">
      <label class="field"><span class="field__l">Ваше имя</span><input name="name" autocomplete="name" required maxlength="80"><span class="field__err" data-err="name">Как к вам обращаться?</span></label>
      <label class="field"><span class="field__l">Телефон</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="+7 (___) ___-__-__" data-phone><span class="field__err" data-err="phone">Проверьте номер телефона</span></label>
    </div>
    <label class="field"><span class="field__l">E-mail <i>— по желанию</i></span><input name="email" type="email" autocomplete="email" maxlength="120"><span class="field__err" data-err="email">Проверьте адрес почты</span></label>
    <label class="check"><input type="checkbox" name="consent" required><span class="check__box">${icon('check')}</span><span>Я согласен(-на) с <a href="/policy" target="_blank">политикой конфиденциальности</a> и даю согласие на обработку моих персональных данных</span></label>
    <span class="field__err field__err--consent" data-err="consent">Нужно ваше согласие</span>
    <div class="form__foot">
      ${btn(submit, { cls: 'btn--fill btn--lg', type: 'submit' })}
      <p class="form__status" role="status" aria-live="polite"></p>
    </div>
  </form>`;
}

export function page(d, { title, description, path: pagePath = '/', body, ogImage, theme = 'light', bodyClass = '', jsonLd, tour }) {
  const tourData = d.tours.filter((t) => !t.archived && t.priceRub).map((t) => ({
    slug: t.slug, name: t.name, dates: t.dates, price: t.priceRub,
  }));
  const fullTitle = title ? `${title} — КаньонТур` : 'КаньонТур — конные походы по горам Кавказа';
  return `<!doctype html>
<html lang="ru" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || '')}">
<link rel="canonical" href="https://canyontour.ru${pagePath === '/' ? '/' : pagePath}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="КаньонТур">
<meta property="og:title" content="${esc(title || fullTitle)}">
<meta property="og:description" content="${esc(description || '')}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
<meta name="theme-color" content="#f4f0e6">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/manrope-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/lora-italic-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/main.css?v=${d.assetVersion}">
<script>document.documentElement.classList.replace('no-js','js');try{if(sessionStorage.getItem('ct-seen'))document.documentElement.classList.add('is-repeat')}catch(e){}</script>
<script src="/assets/main.js?v=${d.assetVersion}" defer></script>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
</head>
<body class="${esc(bodyClass)}" data-page-theme="${theme}"${tour ? ` data-tour="${esc(tour)}"` : ''}>
${SPRITE}
<a class="skip" href="#main">Перейти к содержимому</a>
<div class="preloader" aria-hidden="true">
  <div class="preloader__in">${logo('preloader__logo')}<span class="preloader__bar"><i></i></span></div>
</div>
${header(d)}
${menu(d)}
<main id="main">
${body}
</main>
${footer(d)}
${bookingModal(d)}
<div class="cursor" aria-hidden="true"><span class="cursor__label"></span></div>
<button class="to-top" type="button" data-to-top aria-label="Наверх"><svg viewBox="0 0 48 48" class="to-top__ring" aria-hidden="true"><circle cx="24" cy="24" r="22"/></svg>${icon('arrow-up')}</button>
<script type="application/json" id="tours-data">${JSON.stringify(tourData).replace(/</g, '\\u003c')}</script>
</body>
</html>`;
}

export { socials };
