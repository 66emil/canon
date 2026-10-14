// Assembles everything the templates need from mock/data/*.json (tours, FAQ, company) and
// web/content/content.json (texts and photos extracted from the mirror by tools/extract_content.py).
import fs from 'node:fs';
import path from 'node:path';

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

// Display names: tours.json keeps the raw og:title, some of which carry "Конный тур ..." prefixes.
const NAMES = {
  weekendmountains: 'Выходные в горах',
  weekendinthemountains: 'Для сильных всадников',
  bermabut: 'Плато Бермамыт',
  avtopohodbalkaria: 'Автопоход «Верхняя Балкария»',
  hasaut2: 'Путь в ущелье солнца',
  hedmishsuu: 'Гедмыш Суу',
  balkbashi: 'Перевал Балк-Баши',
  elbruspohod: 'Рассвет у Эльбруса',
};
const SUBTITLES = {
  chegem: 'Маршрут с севера на юг',
  chegemsouth: 'Маршрут с юга на север',
  hasaut2: 'Древний Схауат',
  elbruspohod: 'Урочище Джилы-Су',
  bermabut: 'Синие горы Кавказа',
  weekendinthemountains: 'Выходные в горах',
  hedmishsuu: 'К водопаду Гедмыш',
  avtopohod: 'Эльбрус с севера. Наследие генерала Эммануэля',
};
// what kind of trip it is (shown as a kicker)
const KIND = { avtopohod: 'Автопоход', avtopohodbalkaria: 'Автопоход', gonaelbrus: 'Восхождение' };
// pages in the sitemap that are not offered on the live home page any more (see QUESTIONS.md, #4)
const ARCHIVED = new Set(['hasaut2']);

const DIFF = [
  [/ниже/, 1, 'ниже средней'],
  [/выше/, 3, 'выше средней'],
  [/сред/, 2, 'средняя'],
];
const FIT = { 1: 'ниже среднего', 2: 'средний', 3: 'выше среднего' };
const level = (s) => {
  const hit = DIFF.find(([re]) => re.test(s || ''));
  return hit ? hit[1] : null;
};

export function loadData(root) {
  const mock = path.join(root, 'mock', 'data');
  const toursRaw = readJson(path.join(mock, 'tours.json'));
  const site = readJson(path.join(mock, 'site.json'));
  const faq = readJson(path.join(mock, 'faq.json'));
  const content = readJson(path.join(root, 'web', 'content', 'content.json'));
  const home = content.home;

  const schedule = new Map(home.schedule.map((s) => [s.slug, s]));
  const featured = new Map(home.featured.map((f) => [f.slug, f]));

  const tours = toursRaw.map((t) => {
    const c = content.tours[t.slug] || {};
    const s = schedule.get(t.slug);
    const program = (t.program?.length ? t.program : c.program || []).map((p) => ({
      ...p, images: (c.days || []).find((d) => d.day === p.day)?.images || [],
    }));
    const diff = level(t.difficulty);
    const fit = level(t.fitnessLevel);
    const price = t.priceRub ?? c.priceRub ?? null;
    const gallery = c.gallery?.length ? c.gallery : s?.images || [];
    return {
      slug: t.slug,
      url: `/${t.slug}`,
      name: NAMES[t.slug] || t.name.replace(/\s+-\s+/g, ' — '),
      subtitle: SUBTITLES[t.slug] || c.subtitle || null,
      kind: KIND[t.slug] || 'Конный поход',
      pageTitle: t.pageTitle,
      description: t.description,
      keywords: t.keywords,
      teaser: s?.teaser?.replace(/^\d+ метров над уровнем моря\s*/, '') || featured.get(t.slug)?.text || t.description,
      altitude: (s?.teaser || c.subtitle || '').match(/^\d+ метров над уровнем моря/)?.[0] || null,
      priceRub: price,
      altPrices: c.altPrices || [],
      prepaymentPercent: t.prepaymentPercent || site.booking.prepaymentPercent,
      prepaymentRub: price && !c.altPrices?.length ? Math.round((price * (t.prepaymentPercent || 30)) / 100) : null,
      days: t.durationDays,
      difficulty: diff, difficultyText: DIFF.find((d) => d[1] === diff)?.[2] || t.difficulty,
      fitness: fit, fitnessText: FIT[fit] || t.fitnessLevel,
      ridingNote: c.ridingNote || null,
      logistics: c.logistics || [],
      intro: c.intro || [],
      story: c.story || [],
      gallery,
      cover: gallery[0] || s?.images?.[0],
      program,
      dates: (s?.dates?.groups?.length ? s.dates : c.dates) || { groups: [], note: null },
      archived: ARCHIVED.has(t.slug),
    };
  });
  const bySlug = Object.fromEntries(tours.map((t) => [t.slug, t]));

  // the home page lists: featured trips + "Полное расписание" in the order of the live site
  const homeTours = [...home.featured.map((f) => f.slug), ...home.schedule.map((s) => s.slug)]
    .filter((v, i, a) => a.indexOf(v) === i).map((slug) => bySlug[slug]);

  const contacts = {
    ...site.contacts,
    phoneHref: `tel:${site.contacts.phone}`,
    whatsapp: 'https://wa.me/79137757990',
    telegram: 'https://t.me/canyontour99',
    telegramChannel: 'https://t.me/kanontur',
    vk: 'https://vk.com/canyontours',
    instagram: 'https://www.instagram.com/_canyontour_/',
  };

  return { site, faq, content, home, tours, bySlug, homeTours, scheduleTours: home.schedule.map((s) => bySlug[s.slug]), contacts };
}
