# canyontour.ru: локальная копия и мок-бэкенд для прототипа

Копия публичной части сайта для редизайна. Делается с согласия заказчика. Скачано только то, что
отдаётся любому посетителю: URL из `sitemap.xml`, с соблюдением `robots.txt`, в один поток, с паузой
1–2 с между запросами.

## Запуск

```bash
node mock/server.mjs          # http://localhost:8080  (Node >= 18, без зависимостей)
```

- `http://localhost:8080/`, `/elbrus`, `/kanjol`, … это страницы из зеркала с теми же адресами, что на сайте.
- Формы работают: отправка уходит в мок (`/__mock/tilda/procces/`), заявка видна в `GET /api/leads`
  и в логе сервера, затем редирект на `/success`, как на живом сайте.
- Счётчики (Метрика, Top.Mail.Ru, FB, VK, Tilda Stat) при отдаче страниц вырезаются, так что
  прототип не портит статистику заказчика. Файлы зеркала при этом не меняются.
- JSON API для нового фронтенда описан в [`mock/API.md`](mock/API.md).

Просто открыть `site/canyontour.ru/index.html` двойным кликом тоже можно, но тогда формы и часть
скриптов Tilda (они рассчитаны на http) работать не будут.

## Структура

```
site/                        зеркало (структура по доменам, как у wget)
  canyontour.ru/*.html       21 страница из sitemap
  static.tildacdn.com/       css/js Tilda, изображения (tildXXXX-…/file.jpg)
  thb.tildacdn.com/          превью для lazy-load (20px)
  neo.tildacdn.com/, fonts.googleapis.com/, fonts.gstatic.com/
mock/
  server.mjs                 статика + API + Tilda-совместимый приём форм
  shim.js                    подмешивается в страницы: перенаправляет формы в мок, глушит трекеры
  data/tours.json            16 туров, извлечены из страниц (tools/extract_data.py)
  data/faq.json, site.json   FAQ, контакты, реквизиты, кемпинг, команда, поля форм
  data/db.runtime.json       заявки и брони мока (создаётся при работе)
  API.md                     наблюдаемое поведение сайта, модель данных, маршруты
tools/
  fetch_missing.py           докачка того, что wget не видит (lazy-load, JSON галерей, CSS url())
  fix_gz.py                  распаковка файлов, сохранённых wget как *.gz
  extract_data.py            HTML -> mock/data/tours.json + faq.json
  har_summary.py             разбор HAR (без cookies и токенов) для сверки с моком
QUESTIONS.md                 вопросы к заказчику
```

## Как воспроизвести скачивание

```bash
cd site && wget -i ../urls.txt --page-requisites --convert-links --adjust-extension --span-hosts \
  --domains=canyontour.ru,tildacdn.com,tildacdn.one,tildaapi.com,tilda.ws,fonts.googleapis.com,fonts.gstatic.com \
  --exclude-domains=forms.tildaapi.com,stat.tildaapi.com \
  -e robots=on --wait=1.5 --random-wait --tries=2 --restrict-file-names=unix
cd .. && python3 -I tools/fix_gz.py site && python3 -I tools/fetch_missing.py site
python3 -I tools/extract_data.py site/canyontour.ru mock/data/tours.json
```

`urls.txt` — это список `<loc>` из https://canyontour.ru/sitemap.xml (`sitemap-store.xml` пуст).

## Проверка (2026-10-14)

- В зеркале 1104 файла (295 МБ), из них 881 изображение. Все ссылки в HTML и CSS указывают на существующие локальные файлы.
- Все 21 страница открыты в headless Chrome через мок: 3716 запросов, все на localhost, ни одного ответа 4xx/5xx,
  ни одного запроса к внешним доменам.
- Форма на главной отправлена из браузера: заявка сохранилась в моке (`tourSlug` определился по выбору тура),
  затем редирект на `/success`.
- Особенности Tilda, которые обрабатывает мок:
  - lazy-load на лету переписывает картинки на `optim.tildacdn.com/…/-/format/webp/…` — сервер отдаёт оригинал;
  - часть скриптов собирает адреса вида `"https://static.tildacdn." + zone` — `shim.js` переводит их на зеркало.

## Ограничения

- Даты заездов, бронирования и статусы заявок в моке **синтетические** (`_synthetic: true`), на
  сайте этих данных нет. Подробнее в `QUESTIONS.md`.
- Программы туров разобраны эвристически (Zero-блоки Tilda). Предупреждения парсера отдаются в
  `GET /api/tours/:slug` → `parseWarnings`.
- Изображения скачаны в тех версиях, которые отдаёт CDN (оригиналы загрузки, не исходники фотографа).
