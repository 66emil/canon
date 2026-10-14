// Home page.
import { esc, tx, icon, join, rub, rise, scrollWords, accent } from '../lib/html.mjs';
import { btn, page } from './layout.mjs';
import { sectionHead, scheduleList, faqSection, ctaSection, socialTiles, tourRail, marquee, days } from './sections.mjs';

const HERO_CARDS = [
  'tild6230-3635-4364-b638-373639656265/IMG_5296.JPG', // всадник на фоне Эльбруса
  'tild3936-6331-4963-b638-346534646133/294_resized.jpg', // девушка с конём
  'tild3264-3163-4464-b863-346533323835/photo_2024-08-01_16-.jpg', // скала с видом на Эльбрус
];

// facts from the FAQ / booking rules: group size, guides per group, minimum age
const FACTS = (s) => [
  { n: s.booking.maxGroupSize, l: 'человек в группе — максимум' },
  { n: s.booking.staffPerGroup.instructors + s.booking.staffPerGroup.horseGuides, l: 'гида сопровождают группу' },
  { n: `${s.booking.minAge}+`, l: 'лет — возраст участников' },
];

// The route line that runs through the hero: a trail with waypoints, drawn on load and on scroll.
const TRAIL = 'M-40 640 C 140 610, 220 520, 330 545 S 520 690, 640 610 S 780 380, 900 420 S 1060 600, 1180 500 S 1330 250, 1480 300';

function hero(d, img) {
  return `
<section class="hero" data-theme="light">
  <div class="hero__bg" aria-hidden="true">
    <svg class="trail" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <path class="trail__shadow" d="${TRAIL}"/>
      <path class="trail__path" d="${TRAIL}" pathLength="1"/>
      <g class="trail__pts">
        <circle cx="330" cy="545" r="7"/><circle cx="640" cy="610" r="7"/><circle cx="900" cy="420" r="7"/><circle cx="1180" cy="500" r="7"/>
      </g>
    </svg>
    <div class="hero__glow"></div>
  </div>
  <div class="container hero__in">
    <span class="kicker hero__kicker">Кони, горы и команда</span>
    <h1 class="xxl hero__t">
      <span class="lm"><span>Настоящие</span></span>
      <span class="lm"><span>конные походы</span></span>
      <span class="lm"><span>по горам <em class="accent">Кавказа</em></span></span>
    </h1>
    <div class="hero__cards" data-hero-cards aria-hidden="true">
      ${join(HERO_CARDS, (p, i) => `<figure class="hcard hcard--${i + 1}" data-depth="${[0.6, 1, 0.35][i]}"><div class="hcard__in">${img.tag(p, { alt: '', sizes: '(min-width: 1024px) 22vw, 40vw', max: 960, eager: i === 0 })}</div></figure>`)}
    </div>
    <div class="hero__row">
      <div class="rot" data-rotator>
        <span class="rot__circle"><span class="rot__vals">${join(FACTS(d.site), (f, i) => `<b class="${i ? '' : 'on'}">${esc(f.n)}</b>`)}</span></span>
        <span class="rot__labels">${join(FACTS(d.site), (f, i) => `<b class="${i ? '' : 'on'}">${tx(f.l)}</b>`)}</span>
      </div>
      <p class="hero__sub">${tx('Конные туры по Кабардино-Балкарии — по местам, где вы не встретите толп туристов.')}</p>
      ${btn('Программы туров', { href: '#tours', cls: 'btn--fill btn--lg hero__cta' })}
    </div>
  </div>
</section>

<section class="reel" data-expand aria-label="Фильм о походах">
  <div class="reel__frame" data-cursor="Смотреть">
    ${img.tag(d.home.hero.image, { alt: 'Всадница в горах Кабардино-Балкарии', sizes: '100vw', cls: 'reel__img' })}
    <div class="reel__shade"></div>
    <div class="reel__copy container">
      <p class="reel__t">${accent('Фильм о красоте *гор Кавказа*')}</p>
      <p class="reel__text">${tx(d.home.film.text)}</p>
    </div>
    <button class="reel__play" type="button" data-video="${esc(d.home.videos[0])}" aria-label="Смотреть фильм Павла Матвеева о походе">
      <span class="reel__play-ic">${icon('play')}</span><span class="reel__play-l">Смотреть фильм</span>
    </button>
  </div>
</section>`;
}

function statement(d) {
  return `
<section class="section statement" id="intro">
  <div class="container">
    <span class="kicker" data-reveal>Кто мы</span>
    <p class="statement__t" data-words>${scrollWords('Мы — компания друзей-путешественников. Наша цель — новые виды отдыха для людей: *мы откроем Кавказ* для тех, кто ещё не сделал этого сам, и покажем новые грани тем, кто уже бывал здесь не один раз.')}</p>
    <div class="btn-row" data-reveal>
      ${btn('Смотреть туры', { href: '#tours', cls: 'btn--ghost' })}
      ${btn('Познакомиться с командой', { href: '#about', cls: 'btn--ghost' })}
    </div>
  </div>
</section>`;
}

function tours(d, img) {
  const featured = new Map(d.home.featured.map((f) => [f.slug, f]));
  const items = d.homeTours.map((t) => ({ tour: t, title: featured.get(t.slug)?.title }));
  const intro = `<div class="hbox hbox--intro">
      <div>
        <span class="kicker">Маршруты</span>
        <h2 class="h2">${accent('Наши *путешествия*')}&nbsp;<sup class="count">${items.length}</sup></h2>
        <p class="muted">${tx(`Походы от ${Math.min(...items.map((i) => i.tour.days))} до ${Math.max(...items.map((i) => i.tour.days))} дней. Нажмите на тур, чтобы увидеть программу по дням.`)}</p>
      </div>
      ${btn('Полное расписание', { href: '#schedule', cls: 'btn--dark btn--lg' })}
    </div>`;
  const more = `<div class="hbox hbox--more" data-theme="dark">
      <p class="h3">${accent('Не знаете, *какой* выбрать?')}</p>
      <p class="muted">${tx('Оставьте заявку — менеджер расскажет о маршрутах и поможет с выбором.')}</p>
      ${btn('Получить консультацию', { href: '#request', cls: 'btn--fill' })}
    </div>`;
  return `
<section class="section tours-sec" id="tours">
  ${marquee(`<span>Наши</span> <em class="accent">путешествия</em> <svg class="mq-ic"><use href="#i-peak"/></svg> <span>Конные</span> <em class="accent">походы</em> <svg class="mq-ic"><use href="#i-peak"/></svg>`, { cls: 'marquee--title' })}
  ${tourRail(img, items, { intro, more })}
</section>`;
}

function schedule(d, img) {
  return `
<section class="section section--dark sched-sec glow-bottom" id="schedule" data-theme="dark">
  <span id="list" class="anchor-alias"></span>
  <div class="container">
    <div class="sched-head">
      ${sectionHead({ kicker: 'Даты походов', title: 'Полное *расписание*', lead: 'Нажмите на название тура, чтобы увидеть программу по дням. Свободные даты — в форме бронирования.' })}
    </div>
    ${scheduleList(img, d.scheduleTours)}
  </div>
</section>`;
}

function gallery(d, img) {
  // put every photo into the currently shortest column, so the three parallax columns end together
  const cols = [[], [], []];
  const heights = [0, 0.45, 0.2]; // the middle column starts lower
  for (const p of d.home.gallery) {
    const { w, h } = img.dims(p);
    const k = heights.indexOf(Math.min(...heights));
    cols[k].push(p);
    heights[k] += h / w;
  }
  return `
<section class="section gallery-sec">
  <div class="container">
    ${sectionHead({ kicker: 'Фотоальбом', title: 'Фото прошедших *путешествий*', cls: 'shead--center' })}
    <div class="pgrid" data-pgrid>
      ${join(cols, (col, ci) => `<div class="pgrid__col" data-parallax="${[0.06, -0.08, 0.1][ci]}">
        ${join(col, (p) => `<a class="pgrid__item" href="${img.large(p)}" data-lightbox="home-gallery" data-cursor="Открыть" aria-label="Открыть фото">${img.tag(p, { alt: 'Фото из похода КаньонТур', sizes: '(min-width: 1024px) 30vw, 46vw', max: 960 })}</a>`)}
      </div>`)}
    </div>
  </div>
</section>
${marquee(`<span>Кони</span> <svg class="mq-ic"><use href="#i-peak"/></svg> <em class="accent">горы</em> <svg class="mq-ic"><use href="#i-peak"/></svg> <span>и команда</span> <svg class="mq-ic"><use href="#i-peak"/></svg>`, { cls: 'marquee--big', speed: 0.8 })}`;
}

function why(d, img) {
  const items = d.home.why;
  const subs = ['По местам, где нет толп', 'Маленькие группы', 'Верхом по Кавказу'];
  return `
<section class="section section--dark why-sec glow-bottom" data-theme="dark" data-rail-host>
  <div class="rail" aria-hidden="true"><span class="rail__s"><i data-rail-bar></i></span></div>
  <div class="container">
    <div class="why-intro">
      <h2 class="h2" data-rise>${rise('Почему выбирают *нас*?')}</h2>
      <div class="scroll-hint" data-reveal><span class="scroll-hint__c"></span>Листайте дальше</div>
    </div>
    ${join(items, (w, i) => `
    <div class="why-item">
      <div class="why-item__side"><div class="why-item__sticky">
        <span class="why-item__n">${String(i + 1).padStart(2, '0')}</span>
        <p class="why-item__sub">${accent(`*${subs[i]}*`)}</p>
        <h3 class="h2 why-item__t">${tx(w.title)}</h3>
      </div></div>
      <div class="why-item__body">
        <p class="why-item__text" data-reveal>${tx(w.text)}</p>
        <figure class="why-item__media" data-reveal="img">${img.tag(w.image, { alt: w.title, sizes: '(min-width: 1024px) 45vw, 92vw', max: 1600 })}</figure>
      </div>
    </div>`)}
  </div>
</section>`;
}

function reviews(d, img) {
  const shots = d.home.reviews;
  return `
<section class="section section--dark reviews-sec" id="reviews" data-theme="dark">
  <span id="otzivi" class="anchor-alias"></span>
  <div class="container">
    <div class="reviews-head">
      ${sectionHead({ kicker: 'Отзывы', title: 'Отзывы наших *путешественников*', lead: 'Сообщения и фото, которые гости присылают нам после походов.' })}
      ${btn('Смотреть видео', { cls: 'btn--light', ic: 'play', data: { 'data-video': d.home.videos[1] } })}
    </div>
  </div>
  <div class="drag-rail" data-drag>
    <div class="drag-rail__track">
      <button class="rvideo" type="button" data-video="${esc(d.home.videos[1])}" data-cursor="Смотреть" aria-label="Видео «Эльбрус на восходе солнца»">
        ${img.tag(d.home.reviewPhotos[3] || d.home.reviewPhotos[0], { alt: '', sizes: '(min-width: 1024px) 40vw, 80vw', max: 960 })}
        <span class="rvideo__t">${accent('Эльбрус на восходе солнца. *Конный поход*')}</span>
        <span class="rvideo__play">${icon('play')}</span>
      </button>
      ${join(shots, (p, i) => `<a class="rshot" href="${img.large(p)}" data-lightbox="reviews" data-cursor="Читать" aria-label="Отзыв ${i + 1}">${img.tag(p, { alt: `Отзыв гостя ${i + 1}`, sizes: '320px', max: 960 })}</a>`)}
    </div>
  </div>
  <div class="container">
    <div class="rphotos" data-stagger>
      ${join(d.home.reviewPhotos.slice(0, 3), (p) => `<a class="rphoto" href="${img.large(p)}" data-lightbox="review-photos" data-cursor="Открыть">${img.tag(p, { alt: 'Гости КаньонТур в походе', sizes: '(min-width: 1024px) 30vw, 90vw', max: 960 })}</a>`)}
    </div>
  </div>
</section>`;
}

function team(d, img) {
  const [founder, ...guides] = d.home.team;
  return `
<section class="section team-sec" id="about">
  <span id="onas" class="anchor-alias"></span>
  <div class="container">
    ${sectionHead({ kicker: 'О нас', title: 'Опытная *команда*' })}
    <div class="team-top">
      <div class="team-intro">
        ${join(d.home.teamIntro[0].split('\n').filter(Boolean), (p, i) => `<p class="${i === 0 ? 'lead' : ''}" data-reveal>${tx(p)}</p>`)}
      </div>
      <article class="founder" data-reveal>
        <figure class="founder__media">${img.tag(founder.image, { alt: founder.name, sizes: '(min-width: 1024px) 34vw, 92vw', max: 960 })}</figure>
        <div class="founder__body">
          <span class="kicker">${tx(founder.role)}</span>
          <h3 class="h3">${esc(founder.name)}</h3>
          <p>${tx(founder.bio.join(' '))}</p>
        </div>
      </article>
    </div>
    <div class="guides" data-stagger>
      ${join(guides, (g) => `<article class="guide" tabindex="0">
        <figure class="guide__media">${img.tag(g.image, { alt: g.name, sizes: '(min-width: 1024px) 24vw, 70vw', max: 960 })}</figure>
        <div class="guide__cap">
          <h3 class="guide__name">${esc(g.name)}</h3>
          <span class="guide__role">${tx(g.role)}</span>
        </div>
        <div class="guide__bio"><p>${tx(g.bio.join(' '))}</p></div>
      </article>`)}
    </div>
  </div>
</section>`;
}

export function campingBlock(d, img, { full = false } = {}) {
  const camp = d.site.camping;
  const pics = d.home.campingImages;
  const amen = ['Душевые и туалетные комнаты', 'Кухня и столовая', 'Беседка с мангалом', 'Шатёр для просмотра фильмов'];
  return `
<section class="section camp-sec" data-theme="sand">
  <div class="container">
    <div class="camp${full ? ' camp--full' : ''}">
      <div class="camp__text">
        <span class="kicker" data-reveal>${icon('pin')} ${tx(camp.location)}</span>
        ${full ? '' : `<h2 class="h2" data-rise>${rise('О нашем *кемпинге*')}</h2>`}
        <p class="lead" data-reveal>${tx('Наш лагерь расположен в Кабардино-Балкарии, в селе Сармаково. Именно отсюда начинаются все наши путешествия!')}</p>
        <ul class="amen" data-stagger>${join(amen, (a) => `<li>${icon('check')}${tx(a)}</li>`)}</ul>
        ${full ? '</div><div class="camp__text">' : ''}
        <p class="muted" data-reveal>${tx('За дополнительную стоимость можно забронировать гостевой дом целиком или место в нём.')}</p>
        <div class="prices" data-stagger>
          ${join(camp.accommodation, (a) => `<div class="price-card">
            <span class="price-card__l">${tx(a.name)}</span>
            <span class="price-card__v">${rub(a.pricePerPersonPerNightRub)}&nbsp;₽<small>/чел в сутки</small></span>
          </div>`)}
        </div>
        ${full ? '' : `<div class="btn-row" data-reveal>${btn('Подробнее о кемпинге', { href: '/campig', cls: 'btn--dark' })}</div>`}
      </div>
      ${full ? '' : `<div class="camp__media" data-reveal>
        ${join(pics.slice(0, 4), (p, i) => `<a class="camp__pic camp__pic--${i + 1}" href="${img.large(p)}" data-lightbox="camping" data-cursor="Открыть" ${i ? '' : 'data-parallax-inner="0.06"'}>${img.tag(p, { alt: 'Кемпинг КаньонТур в Сармаково', sizes: i ? '(min-width: 1024px) 18vw, 45vw' : '(min-width: 1024px) 38vw, 92vw', max: 1600 })}</a>`)}
      </div>`}
    </div>
  </div>
</section>`;
}

export function renderHome(d, img) {
  const body = [
    hero(d, img),
    statement(d),
    tours(d, img),
    schedule(d, img),
    gallery(d, img),
    why(d, img),
    reviews(d, img),
    team(d, img),
    campingBlock(d, img),
    socialTiles(d),
    faqSection(d),
    ctaSection(d, img),
  ].join('\n');
  return page(d, {
    title: null,
    description: 'Настоящие конные походы по горам Кавказа: маршруты к Эльбрусу, Бермамыту, Тызылу и Гедмышу. Маленькие группы до 12 человек, опытные гиды-коневоды, свой кемпинг в Кабардино-Балкарии.',
    path: '/',
    ogImage: `https://canyontour.ru${img.large(d.home.hero.image)}`,
    body,
    bodyClass: 'page-home',
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'TravelAgency', name: 'КаньонТур', url: 'https://canyontour.ru/',
      telephone: d.contacts.phone, email: d.contacts.email, address: { '@type': 'PostalAddress', addressLocality: 'Москва', streetAddress: d.site.company.legalAddress },
      sameAs: [d.contacts.vk, d.contacts.instagram, d.contacts.telegramChannel],
    },
  });
}

