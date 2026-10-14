// Tour page: hero with price, photo frame, description, gallery, program by day, price & booking.
import { esc, tx, icon, join, rub, rise, scrollWords, accent, typo } from '../lib/html.mjs';
import { btn, page, leadForm } from './layout.mjs';
import { faqSection, ctaSection, tourCard, days, meter } from './sections.mjs';

/** "Инал — по пути с Икаром" -> "Инал — *по пути с Икаром*", "Таинственный Тызыл" -> "Таинственный *Тызыл*" */
function accentName(name) {
  if (name.includes(' — ')) {
    const [a, ...b] = name.split(' — ');
    return `${a} — *${b.join(' — ')}*`;
  }
  const m = /^(.*\s)(\S+)$/.exec(name);
  return m ? `${m[1]}*${m[2]}*` : `*${name}*`;
}

const faqList = (d, q) => (d.faq.find((f) => f.question === q)?.answer || '').split('\n').map((l) => l.trim()).filter(Boolean);

/** times like 08:00 / 16.00 / 13-00 in program texts */
const withTimes = (s) => tx(s).replace(/\b(\d{1,2}[:.-]\d{2})\b/g, '<b class="time">$1</b>');

function hero(d, img, t) {
  const start = (t.logistics.find((l) => /Место (встречи|старта)/.test(l)) || '').replace(/^Место (встречи|старта)\s*[-:—]\s*/, '') || 'Минеральные Воды';
  const prepay = t.prepaymentRub ? `Предоплата ${t.prepaymentPercent}% — ${rub(t.prepaymentRub)}&nbsp;₽` : `Предоплата ${t.prepaymentPercent}% от стоимости`;
  const facts = [
    { ic: 'clock', l: 'Продолжительность', v: days(t.days) },
    { ic: 'gauge', l: 'Сложность', v: `${meter(t.difficulty, t.difficultyText)} ${esc(t.difficultyText)}` },
    { ic: 'horse', l: 'Подготовка', v: esc(t.fitnessText) },
    { ic: 'pin', l: 'Место встречи', v: tx(start.replace(/^Минеральные воды$/i, 'Минеральные Воды')) },
  ];
  return `
<section class="thero" data-theme="light">
  <div class="hero__bg" aria-hidden="true"><div class="hero__glow"></div></div>
  <div class="container">
    <nav class="crumbs" aria-label="Навигация">
      <a href="/">Главная</a>${icon('chevron')}<a href="/#tours">Туры</a>${icon('chevron')}<span aria-current="page">${tx(t.name)}</span>
    </nav>
    ${t.archived ? `<p class="archived">${icon('calendar')}${tx(`${t.dates.note}. Уточните у менеджера, будет ли маршрут в новом сезоне.`)}</p>` : ''}
    <div class="thero__grid">
      <div class="thero__main">
        <span class="kicker">${esc(t.kind)} · ${days(t.days)}</span>
        <h1 class="xl thero__t" data-rise>${rise(accentName(t.name))}</h1>
        ${t.subtitle || t.altitude ? `<p class="thero__sub" data-reveal>${tx([...new Set([t.subtitle, t.altitude].filter(Boolean))].join(' · '))}</p>` : ''}
      </div>
      <aside class="thero__price" data-reveal>
        <span class="thero__price-l">Стоимость тура</span>
        <span class="thero__sum">${t.priceRub ? `${rub(t.priceRub)}&nbsp;₽` : 'По запросу'}<small>${t.priceRub ? '/чел' : ''}</small></span>
        ${t.altPrices.map((a) => `<span class="thero__alt">${tx(a.label.replace(/^./, (c) => c.toUpperCase()))} — ${rub(a.priceRub)}&nbsp;₽/чел</span>`).join('')}
        <span class="thero__pre">${icon('check')}${prepay}</span>
        ${t.dates.note && !t.archived ? `<span class="thero__note">${icon('calendar')}${tx(t.dates.note)}</span>` : ''}
        <div class="thero__btns">
          ${btn('Забронировать', { cls: 'btn--fill btn--lg btn--wide', data: { 'data-book': t.slug } })}
          ${btn('Задать вопрос', { href: d.contacts.whatsapp, cls: 'btn--ghost btn--wide', ic: 'whatsapp', external: true })}
        </div>
      </aside>
    </div>
    <ul class="tfacts" data-stagger>
      ${join(facts, (f) => `<li class="tfact"><span class="tfact__ic">${icon(f.ic)}</span><span class="tfact__l">${f.l}</span><span class="tfact__v">${f.v}</span></li>`)}
    </ul>
  </div>
</section>
<section class="reel reel--tour" data-expand aria-label="Фото маршрута">
  <div class="reel__frame" data-cursor="Фото">
    ${img.tag(t.cover, { alt: t.name, sizes: '100vw', cls: 'reel__img', eager: true })}
    <div class="reel__shade"></div>
    <div class="reel__copy container">
      <p class="reel__t">${accent(`*${t.kind}* по горам Кавказа`)}</p>
    </div>
    <button class="reel__play reel__play--photos" type="button" data-lightbox-open="tour-gallery" aria-label="Смотреть все фото маршрута">
      <span class="reel__play-ic">${icon('expand')}</span><span class="reel__play-l">Все фото · ${t.gallery.length}</span>
    </button>
  </div>
</section>`;
}

function about(d, img, t) {
  const [first, ...rest] = t.intro.length ? t.intro : [t.description];
  const logistics = t.logistics.map((l) => {
    const m = /^(Место (?:встречи|старта))\s*[-:—]\s*(.+)$/.exec(l);
    return m ? { ic: 'pin', l: m[1], v: m[2] } : { ic: 'clock', l: null, v: l };
  });
  const sentences = (first || '').split('\n').map((s) => s.trim()).filter(Boolean);
  return `
<section class="section tabout" id="about-tour">
  <div class="container">
    <span class="kicker" data-reveal>О маршруте</span>
    <p class="statement__t" data-words>${scrollWords(sentences[0] || '')}</p>
    <div class="tabout__grid">
      <div class="tabout__text">
        ${join([...sentences.slice(1), ...rest].flatMap((p) => p.split('\n')).filter(Boolean), (p) => `<p data-reveal>${tx(p)}</p>`)}
      </div>
      <aside class="tabout__card" data-reveal>
        <span class="kicker">Как всё устроено</span>
        <ul class="logi">
          ${join(logistics, (l) => `<li>${icon(l.ic)}<span>${l.l ? `<b>${tx(l.l)}</b>` : ''}${tx(l.v)}</span></li>`)}
          ${t.ridingNote ? `<li>${icon('horse')}<span>${tx(t.ridingNote)}</span></li>` : ''}
          <li>${icon('users')}<span>${tx(`Группа до ${d.site.booking.maxGroupSize} человек, участники от ${d.site.booking.minAge} лет`)}</span></li>
        </ul>
      </aside>
    </div>
  </div>
</section>`;
}

function gallery(img, t) {
  if (t.gallery.length < 2) return '';
  return `
<section class="section section--tight tgal">
  <div class="container tgal__head">
    <h2 class="h3" data-rise>${rise('Фото *маршрута*')}</h2>
    <span class="muted tgal__hint">${icon('arrow')} Листайте или перетаскивайте</span>
  </div>
  <div class="drag-rail drag-rail--light" data-drag>
    <div class="drag-rail__track">
      ${join(t.gallery, (p, i) => `<a class="tgal__item${i % 3 === 0 ? ' tgal__item--wide' : ''}" href="${img.large(p)}" data-lightbox="tour-gallery" data-cursor="Открыть">${img.tag(p, { alt: `${t.name}: фото ${i + 1}`, sizes: '(min-width: 1024px) 40vw, 80vw', max: 1600 })}</a>`)}
    </div>
  </div>
</section>`;
}

function program(img, t) {
  const items = t.program.length
    ? t.program.map((p) => ({ n: p.day, label: 'День', text: p.text, images: p.images }))
    : t.story.filter((s) => s.images.length).map((s, i) => ({ n: i + 1, label: 'Этап', text: s.text, images: s.images }));
  if (!items.length) return '';
  const notes = t.story.filter((s) => !s.images.length && /оценить уровень/.test(s.text));
  const title = t.program.length ? 'Программа *по дням*' : 'Описание *похода*';
  return `
<section class="section section--dark prog glow-bottom" id="program" data-theme="dark" data-rail-host>
  <div class="rail" aria-hidden="true"><span class="rail__s"><i data-rail-bar></i></span></div>
  <div class="container prog__grid">
    <div class="prog__aside">
      <div class="prog__sticky">
        <span class="kicker" data-reveal>Маршрут</span>
        <h2 class="h2" data-rise>${rise(title)}</h2>
        <nav class="prog__nav" data-days-nav aria-label="Дни программы">
          ${join(items, (it) => `<a href="#day-${it.n}"><span>${String(it.n).padStart(2, '0')}</span>${it.label}&nbsp;${it.n}</a>`)}
        </nav>
        ${join(notes, (n) => `<p class="prog__note">${icon('gauge')}<span>${tx(n.text.replace(/\.\s*\./g, '.'))}</span></p>`)}
      </div>
    </div>
    <ol class="days">
      ${join(items, (it) => {
        const shown = it.images.slice(0, 4);
        const more = it.images.length - shown.length;
        return `<li class="day" id="day-${it.n}" data-reveal>
          <div class="day__head"><span class="day__n">${String(it.n).padStart(2, '0')}</span><span class="day__l">${it.label} ${it.n}</span></div>
          <p class="day__text">${withTimes(it.text)}</p>
          ${shown.length ? `<div class="day__pics day__pics--${Math.min(shown.length, 4)}">
            ${join(shown, (p, i) => `<a class="day__pic" href="${img.large(p)}" data-lightbox="day-${it.n}" data-cursor="Открыть">${img.tag(p, { alt: `${it.label} ${it.n}: фото ${i + 1}`, sizes: i === 0 ? '(min-width: 1024px) 34vw, 90vw' : '(min-width: 1024px) 17vw, 45vw', max: 1600 })}${more > 0 && i === shown.length - 1 ? `<span class="day__more">+${more}</span>` : ''}</a>`)}
            ${join(it.images.slice(4), (p) => `<a href="${img.large(p)}" data-lightbox="day-${it.n}" hidden aria-hidden="true" tabindex="-1"></a>`)}
          </div>` : ''}
        </li>`;
      })}
    </ol>
  </div>
</section>`;
}

function priceBlock(d, img, t) {
  const included = faqList(d, 'Что входит в стоимость тура?');
  const gear = faqList(d, 'Какое снаряжение предоставляется?');
  const groups = t.dates.groups || [];
  const datesField = groups.length
    ? `<label class="field" data-dates-field><span class="field__l">Свободные даты</span><span class="select"><select name="dates">
        ${join(groups, (g) => g.dates.length
          ? `<optgroup label="${esc(g.month)}">${join(g.dates, (x) => `<option value="${esc(`${x} (${g.month})`)}">${esc(x)}</option>`)}</optgroup>`
          : `<option value="${esc(g.month)}">${esc(g.month)}</option>`)}
        <option value="">Ещё выбираю дату</option>
      </select>${icon('chevron')}</span></label>`
    : t.dates.note ? `<p class="form__note">${tx(`${t.dates.note}. Оставьте заявку — менеджер расскажет о ближайших датах.`)}</p>` : '';
  return `
<section class="section price-sec" id="price">
  <div class="container price-grid">
    <div class="price-info">
      <span class="kicker" data-reveal>Стоимость</span>
      <h2 class="h2" data-rise>${rise('Стоимость *тура*')}</h2>
      <p class="price-big" data-reveal>${t.priceRub ? `${rub(t.priceRub)}&nbsp;₽<small>/чел</small>` : 'Стоимость по запросу'}</p>
      ${t.altPrices.map((a) => `<p class="price-alt" data-reveal>${tx(a.label.replace(/^./, (c) => c.toUpperCase()))}: <b>${rub(a.priceRub)}&nbsp;₽/чел</b></p>`).join('')}
      <p class="price-pre" data-reveal>${tx(`Для бронирования вносится только предоплата — ${t.prepaymentPercent}% от стоимости тура${t.prepaymentRub ? ` (${rub(t.prepaymentRub)} ₽)` : ''}. Остальная сумма вносится на месте, перед стартом похода.`)}</p>
      <div class="incl" data-reveal>
        <div>
          <h3 class="incl__t">Что входит в стоимость</h3>
          <ul>${join(included, (l) => `<li>${icon('check')}<span>${tx(l)}</span></li>`)}</ul>
        </div>
        <div>
          <h3 class="incl__t">Снаряжение предоставляем</h3>
          <ul>${join(gear, (l) => `<li>${icon('check')}<span>${tx(l)}</span></li>`)}</ul>
        </div>
      </div>
    </div>
    <div class="price-form" data-reveal>
      <span class="kicker">Быстрое бронирование</span>
      <h3 class="h3">${accent(`Забронировать *${t.kind === 'Автопоход' ? 'автопоход' : 'поход'}*`)}</h3>
      <p class="muted">${tx('Менеджер свяжется с вами, ответит на вопросы и оформит бронь.')}</p>
      ${leadForm(d, { id: `book-${t.slug}`, tour: t, extra: datesField })}
    </div>
  </div>
</section>`;
}

function others(d, img, t) {
  const list = d.homeTours.filter((x) => x.slug !== t.slug);
  return `
<section class="section others" aria-labelledby="others-t">
  <div class="container others__head">
    <h2 class="h2" id="others-t" data-rise>${rise('Другие *маршруты*')}</h2>
    ${btn('Все туры', { href: '/#tours', cls: 'btn--ghost' })}
  </div>
  <div class="drag-rail drag-rail--light" data-drag>
    <div class="drag-rail__track">
      ${join(list, (x) => tourCard(img, x, { sizes: '(min-width: 1024px) 28vw, 80vw' }))}
    </div>
  </div>
</section>`;
}

export function renderTour(d, img, t) {
  const body = [
    hero(d, img, t),
    about(d, img, t),
    gallery(img, t),
    program(img, t),
    priceBlock(d, img, t),
    others(d, img, t),
    faqSection(d),
    ctaSection(d, img, { tour: t, title: 'Остались *вопросы*?', image: t.gallery[1] || t.cover }),
  ].join('\n');
  return page(d, {
    title: t.pageTitle || t.name,
    description: typo(t.description),
    path: t.url,
    ogImage: `https://canyontour.ru${img.large(t.cover)}`,
    body,
    tour: t.slug,
    bodyClass: 'page-tour',
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'TouristTrip', name: t.name, description: t.description,
      touristType: 'Конный туризм', provider: { '@type': 'TravelAgency', name: 'КаньонТур', url: 'https://canyontour.ru/' },
      ...(t.priceRub ? { offers: { '@type': 'Offer', price: t.priceRub, priceCurrency: 'RUB', url: `https://canyontour.ru${t.url}` } } : {}),
      itinerary: t.program.length ? { '@type': 'ItemList', numberOfItems: t.program.length } : undefined,
    },
  });
}

