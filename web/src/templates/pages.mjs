// Camping, privacy policy, "thank you" and 404 pages.
import { esc, tx, icon, join, rise } from '../lib/html.mjs';
import { btn, page, logo } from './layout.mjs';
import { ctaSection, socialTiles, marquee } from './sections.mjs';
import { campingBlock } from './home.mjs';

const crumbs = (label) => `<nav class="crumbs" aria-label="Навигация"><a href="/">Главная</a>${icon('chevron')}<span aria-current="page">${esc(label)}</span></nav>`;

export function renderCamping(d, img) {
  const pics = [...new Set([...d.home.campingImages, ...d.home.campingPriceImages])];
  const body = `
<section class="thero thero--page" data-theme="light">
  <div class="hero__bg" aria-hidden="true"><div class="hero__glow"></div></div>
  <div class="container">
    ${crumbs('Наш кемпинг')}
    <span class="kicker">${icon('pin')} ${tx(d.site.camping.location)}</span>
    <h1 class="xxl page-t" data-rise>${rise('Наш *кемпинг*')}</h1>
    <div class="page-row">
      <p class="lead" data-reveal>${tx('Именно отсюда начинаются все наши путешествия!')}</p>
      <div class="btn-row" data-reveal>
        ${btn('Оставить заявку', { cls: 'btn--fill btn--lg', data: { 'data-book': '' } })}
        ${btn('Вернуться на главную', { href: '/', cls: 'btn--ghost btn--lg' })}
      </div>
    </div>
  </div>
</section>
<section class="reel" data-expand aria-label="Фото кемпинга">
  <div class="reel__frame" data-cursor="Фото">
    ${img.tag(d.content.camping.cover, { alt: 'Кемпинг КаньонТур в селе Сармаково', sizes: '100vw', cls: 'reel__img', eager: true })}
    <div class="reel__shade"></div>
    <div class="reel__copy container"><p class="reel__t">${tx('Сармаково, Кабардино-Балкария')}</p></div>
    <button class="reel__play reel__play--photos" type="button" data-lightbox-open="camp-photos" aria-label="Смотреть фото кемпинга">
      <span class="reel__play-ic">${icon('expand')}</span><span class="reel__play-l">Фото · ${pics.length}</span>
    </button>
  </div>
</section>
${campingBlock(d, img, { full: true })}
<section class="section section--tight">
  <div class="container">
    <h2 class="h3" data-rise>${rise('Фото *кемпинга*')}</h2>
    <div class="camp-grid" data-stagger>
      ${join(pics, (p, i) => `<a class="camp-grid__item${i === 0 ? ' camp-grid__item--big' : ''}${i === pics.length - 1 && pics.length % 2 === 0 ? ' camp-grid__item--wide' : ''}" href="${img.large(p)}" data-lightbox="camp-photos" data-cursor="Открыть">${img.tag(p, { alt: 'Кемпинг КаньонТур', sizes: i === 0 ? '(min-width: 1024px) 50vw, 92vw' : '(min-width: 1024px) 25vw, 46vw', max: 1600 })}</a>`)}
    </div>
  </div>
</section>
${socialTiles(d)}
${ctaSection(d, img)}`;
  return page(d, {
    title: 'Наш кемпинг в Сармаково',
    description: 'Кемпинг КаньонТур в селе Сармаково (Кабардино-Балкария): душевые, кухня и столовая, беседка с мангалом, кино под шатром. Размещение в домиках от 1000 ₽ в сутки.',
    path: '/campig', ogImage: `https://canyontour.ru${img.large(d.content.camping.cover)}`, body, bodyClass: 'page-camping',
  });
}

export function renderPolicy(d) {
  const { title, sections } = d.content.policy;
  const id = (i) => `p${i + 1}`;
  const body = `
<section class="thero thero--page thero--short" data-theme="light">
  <div class="container">
    ${crumbs('Политика конфиденциальности')}
    <span class="kicker">${tx(d.site.company.legalName)}</span>
    <h1 class="h2 page-t page-t--doc" data-rise>${rise(title)}</h1>
  </div>
</section>
<section class="section doc-sec">
  <div class="container doc">
    <nav class="doc__toc" aria-label="Содержание">
      <span class="kicker">Содержание</span>
      <ol>${join(sections.filter((s) => s.h), (s, i) => `<li><a href="#${id(i)}">${tx(s.h.replace(/^\d+\.\s*/, ''))}</a></li>`)}</ol>
    </nav>
    <article class="doc__body">
      ${join(sections, (s, i) => `<section class="doc__part"${s.h ? ` id="${id(i)}"` : ''}>
        ${s.h ? `<h2 class="doc__h">${tx(s.h)}</h2>` : ''}
        ${join(s.p, (p) => `<p${/^\d+\.\d+\./.test(p) ? ' class="doc__item"' : ''}>${tx(p).replace(/^(\d+\.\d+\.)/, '<b>$1</b>')}</p>`)}
      </section>`)}
    </article>
  </div>
</section>`;
  return page(d, { title: 'Политика конфиденциальности', description: 'Политика ООО «КАНЬОНТУР» в отношении обработки персональных данных посетителей сайта canyontour.ru.', path: '/policy', body, bodyClass: 'page-doc' });
}

function bigMessage(d, { kicker, title, text, path: p, buttons }) {
  return `
<section class="msg" data-theme="light">
  <div class="hero__bg" aria-hidden="true"><div class="hero__glow"></div></div>
  <div class="container msg__in">
    ${logo('msg__logo')}
    <span class="kicker" data-reveal>${esc(kicker)}</span>
    <h1 class="xxl msg__t" data-rise>${rise(title)}</h1>
    <p class="lead msg__text" data-reveal>${tx(text)}</p>
    <div class="btn-row msg__btns" data-reveal>${buttons}</div>
  </div>
</section>
${marquee(`<span>Кони</span> <svg class="mq-ic"><use href="#i-peak"/></svg> <em class="accent">горы</em> <svg class="mq-ic"><use href="#i-peak"/></svg> <span>и команда</span> <svg class="mq-ic"><use href="#i-peak"/></svg>`, { cls: 'marquee--big' })}`;
}

export function renderThanks(d, img, { path: p }) {
  const body = bigMessage(d, {
    kicker: 'Заявка отправлена', title: 'Спасибо за *заявку*!',
    text: 'Менеджер свяжется с вами в ближайшее время. Если хотите ускорить — напишите нам в мессенджер.',
    buttons: `${btn('На главную', { href: '/', cls: 'btn--fill btn--lg' })}${btn('Telegram', { href: d.contacts.telegram, cls: 'btn--ghost btn--lg', ic: 'telegram', external: true })}${btn('WhatsApp', { href: d.contacts.whatsapp, cls: 'btn--ghost btn--lg', ic: 'whatsapp', external: true })}`,
  });
  return page(d, { title: 'Спасибо за заявку', description: 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.', path: p, body, bodyClass: 'page-msg' })
    .replace('<meta name="description"', '<meta name="robots" content="noindex">\n<meta name="description"');
}

export function renderNotFound(d) {
  const body = bigMessage(d, {
    kicker: 'Ошибка 404', title: 'Тропа *потерялась*',
    text: 'Такой страницы нет. Возможно, маршрут переехал — загляните в список туров.',
    buttons: `${btn('На главную', { href: '/', cls: 'btn--fill btn--lg' })}${btn('Все туры', { href: '/#tours', cls: 'btn--ghost btn--lg' })}`,
  });
  return page(d, { title: 'Страница не найдена', description: '', path: '/404', body, bodyClass: 'page-msg' })
    .replace('<meta name="description"', '<meta name="robots" content="noindex">\n<meta name="description"');
}

