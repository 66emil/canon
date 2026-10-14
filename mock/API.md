# canyontour.ru: структура данных и маршруты

Источник: публичные страницы из `sitemap.xml` (21 URL) и публичный JS Tilda, который отдаётся любому посетителю
(`tilda-forms-1.0.min.js`). HAR-файл пока не приложен; когда он появится, сверить раздел 1 с
`python3 -I tools/har_summary.py file.har`.

## 1. Что делает живой сайт (наблюдаемое поведение)

Сайт собран на **Tilda** (project `4368899`, root-zone `com`) и стоит за DDoS-Guard. Собственного
бэкенда/API у сайта нет: страницы статические, все динамические вызовы идут в сервисы Tilda.

| Что | Запрос | Примечание |
|---|---|---|
| Страницы | `GET https://canyontour.ru/<slug>` | 21 страница, 16 из них туры |
| Статика | `static.tildacdn.com`, `thb.tildacdn.com` (превью 20px для lazy-load), `neo.tildacdn.com` (fallback-скрипт), Google Fonts (Raleway) | |
| **Отправка формы** | `POST https://forms.tildaapi.com/procces/` | `Content-Type: application/x-www-form-urlencoded`, `Accept: application/json` |
| Капча (по требованию сервера) | `GET //forms.tildaapi.com/procces/captcha/?tildaspec-formid=…&tildaspec-formskey=…` | в iframe |
| Аналитика | Яндекс.Метрика `79460461`, Top.Mail.Ru `3363571`, Facebook Pixel, VK Retargeting, Tilda Stat | в моке вырезается |

### Тело отправки формы (из `tilda-forms-1.0.min.js`)

Поля формы, как они названы на сайте:

```
Name=Иван
Phone=+7 (900) 111-22-33
Email=i@example.com                       # в 20 формах обязательное, в 17 нет
Какой тур вас заинтересовал=Таинственный Тызыл   # только в общей форме на главной
formservices[]=…                          # служебное поле Tilda
```

Служебные поля, которые добавляет скрипт:

```
tildaspec-cookie, tildaspec-referer (URL страницы), tildaspec-formid (напр. form599533464),
tildaspec-formskey, tildaspec-version-lib, tildaspec-pageid, tildaspec-projectid=4368899, tildaspec-lang,
tildaspec-fp, form-spec-comments (honeypot против спама)
```

Набор полей подтверждён реальной отправкой формы с главной в headless Chrome через мок. Пришли
`Name, Phone, Email, Какой тур вас заинтересовал, formservices[]`, все `tildaspec-*` и
`form-spec-comments`. В ответ на `{"message":"OK",…}` скрипт сделал редирект на `/success`.
`tildaspec-cookie` мок не сохраняет.

Ответы, которые обрабатывает скрипт:

```jsonc
{ "message": "OK", "results": ["4368899:<tranId>[:<orderId>]"] }   // успех -> редирект на data-success-url (/success) или попап
{ "error": "текст ошибки" }                                         // показывается в .t-form__errorbox
{ "redirectto": "xyz" }                                             // переотправка на forms.tildaapi.xyz
{ "needcaptcha": … }                                                // показ капчи
{ "next": { … } }                                                   // шаг оплаты (корзина/платёжка Tilda); на сайте корзины нет
```

Формы на сайте (`data-success-callback`): `t698` (попап «Пойдем в поход?», на главной есть выбор тура)
и `t702` (попап «Получите бесплатную консультацию о туре …» на страницах туров). Кнопки «Быстрое
бронирование» открывают попапы `#popup:myformN`.

## 2. Модель данных (мок)

```ts
type Tour = {
  slug: string;              // = путь страницы, напр. "elbrus"
  name: string;              // og:title, напр. "Эльбрус на восходе солнца"
  pageTitle: string;         // <title>
  description: string;       // meta description
  keywords: string[];
  coverImage: string;        // og:image (локальный путь, если файл есть в зеркале)
  priceRub: number | null;   // «89 900 ₽/чел»
  altPricesRub: number[];    // вторая цена на странице (gonaelbrus: 68 000)
  prepaymentPercent: number; // 30
  prepaymentRub: number;     // вычисляемое
  durationDays: number;
  difficulty: string;        // «ниже среднего» | «средняя» | «выше среднего» (свободный текст на сайте)
  fitnessLevel: string;
  meetingPoint: string;      // «Минеральные воды» | «село Сармаково»
  program: { day: number; text: string }[];
  sourceUrl: string;
  parseWarnings: string[];   // что парсер не смог разобрать
};

type Departure = {           // ⚠ СИНТЕТИКА: дат заездов на сайте нет
  id: string;                // "<slug>-YYYY-MM-DD"
  tourSlug: string;
  startDate: string; endDate: string;
  priceRub: number;
  seatsTotal: 12; seatsBooked: number; seatsLeft: number;
  _synthetic: true;
};

type Lead = {                // = заявка из формы (то, что сейчас уходит в Tilda)
  id: string;                // "L-000001"
  createdAt: string;
  source: "tilda-form" | "api";
  status: "new" | "contacted" | "booked" | "rejected";   // ⚠ статусы придуманы
  name: string; phone: string /* только цифры, 7XXXXXXXXXX */; email: string | null;
  tourSlug: string | null;   // по странице, с которой отправлена форма, или по выбору в радио
  tourChoice: string | null; // сырое значение «Какой тур вас заинтересовал»
  departureId: string | null;
  comment: string | null;
  pageUrl: string | null; formId?: string; utm?: object; raw?: object;
};

type Booking = {             // ⚠ гипотеза для прототипа: на сайте онлайн-брони нет
  id: string;                // "B-000001"
  status: "pending_prepayment";
  departureId: string; tourSlug: string; participants: number;
  contact: { name; phone; email };
  totalRub: number; prepaymentRub: number;   // 30%
  freeCancellationUntil: string;             // старт − 14 дней
};
```

Справочные данные (`data/site.json`): реквизиты компании, контакты, кемпинг (2 типа размещения,
1000 и 1500 ₽/чел/сутки), правила брони (предоплата 30%, бесплатная отмена за 14 дней, группа до 12,
возраст от 14), команда, описание полей формы. FAQ (10 вопросов) лежит в `data/faq.json`.

## 3. Маршруты мок-сервера

Базовый URL: `http://localhost:8080`. CORS открыт (`*`), чтобы отдельный фронтенд на другом порту
мог ходить в API.

| Метод | Путь | Описание |
|---|---|---|
| GET | `/`, `/<slug>`, `/<slug>.html` | страницы из зеркала (+ shim, без аналитики) |
| GET | `/static.tildacdn.com/...` и т.п. | статика зеркала |
| POST | `/__mock/tilda/procces/` | совместим с `forms.tildaapi.com/procces/`; shim перенаправляет туда формы |
| GET | `/api/health` | |
| GET | `/api/tours?difficulty=&maxPrice=&minDays=&maxDays=&sort=price\|duration` | список (краткий) |
| GET | `/api/tours/:slug` | карточка тура с программой |
| GET | `/api/tours/:slug/departures` | синтетические даты |
| GET | `/api/departures?from=YYYY-MM-DD&to=&available=1` | все даты |
| GET | `/api/faq`, `/api/camping`, `/api/team`, `/api/contacts`, `/api/booking-rules`, `/api/forms/lead` | справочники |
| POST | `/api/leads` | `{name, phone, email?, consent: true, tourSlug? \| tourName?, departureId?, comment?, pageUrl?, utm?}` → 201 / 422 |
| GET | `/api/leads` | все заявки (dev) |
| PATCH | `/api/leads/:id` | `{status?, comment?}` |
| POST | `/api/bookings` | `{departureId, participants, consent: true, contact: {name, phone, email}}` → 201 / 409 `not_enough_seats` / 422 |
| GET | `/api/bookings/:id` | |
| DELETE | `/api/_reset` | очистить заявки и брони |

Ошибки валидации: `422 {"error":"validation_failed","fields":{"phone":"invalid", ...}}`.
Данные хранятся в `mock/data/db.runtime.json`, файл создаётся при первой записи.
