#!/usr/bin/env python3
"""Build web/content/content.json (texts, photos, dates) for the new design from the mirror.

Complements extract_data.py (tours.json: prices, durations, programs). Here we collect what the
new pages need on top of that: intro texts, galleries, photos per program day, quick-booking
dates, home page sections, team, camping, policy. Only public page content is used.

Tilda Zero blocks have no semantic markup, so elements are read with their coordinates
(data-field-top/left-value) and ordered the way they are laid out on the desktop page.

Usage: python3 -I tools/extract_content.py site/canyontour.ru web/content/content.json
"""
import html
import json
import os
import re
import sys

UUID = r"tild[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
IMG_RE = re.compile(r"(%s/(?!-/)[^\"'&)\s?]+\.(?:jpe?g|png|gif|webp))" % UUID, re.I)
ICONS = re.compile(r"(whatsapp|telegram|instagram|vk-logo|__14_2|\.svg$|\.gif$)", re.I)
SHARED_START = ("Частые вопросы", "Почему выбирают нас?")


def clean(t):
    t = re.sub(r"<br\s*/?>", "\n", t)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t).replace("\xa0", " ")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r" *\n *", "\n", t)
    return t.strip()


def records(src):
    """[(rec_id, type, html)] in page order."""
    parts = re.split(r'(<div id="rec\d+" class="r t-rec[^"]*"[^>]*data-record-type="\d+")', src)
    out = []
    for i in range(1, len(parts), 2):
        rid = re.search(r"rec(\d+)", parts[i]).group(1)
        typ = re.search(r'data-record-type="(\d+)"', parts[i]).group(1)
        out.append((rid, typ, parts[i] + parts[i + 1]))
    return out


def images(fragment):
    seen = []
    for m in IMG_RE.finditer(fragment):
        p = m.group(1)
        if not ICONS.search(p) and p not in seen:
            seen.append(p)
    return seen


def elements(rec_html):
    """Zero block elements with coordinates, sorted top->bottom, left->right."""
    body = re.sub(r"<script.*?</script>|<style.*?</style>", "", rec_html, flags=re.S)
    chunks = re.split(r"(?=<div class='t396__elem)", body)
    out = []
    for c in chunks[1:]:
        typ = re.search(r"data-elem-type='(\w+)'", c)
        top = re.search(r'data-field-top-value="(-?\d+)"', c)
        left = re.search(r'data-field-left-value="(-?\d+)"', c)
        width = re.search(r'data-field-width-value="(\d+)"', c)
        atom = re.search(r"<(div|a|h\d)[^>]*class='tn-atom'[^>]*>(.*?)</\1>", c, flags=re.S)
        out.append({
            "type": typ.group(1) if typ else None,
            "top": int(top.group(1)) if top else 0,
            "left": int(left.group(1)) if left else 0,
            "width": int(width.group(1)) if width else 0,
            "text": clean(atom.group(2)) if atom else "",
            "html": atom.group(2) if atom else "",
            "images": images(c),
        })
    out.sort(key=lambda e: (e["top"], e["left"]))
    return out


def rec_text(rec_html):
    body = re.sub(r"<script.*?</script>|<style.*?</style>", "", rec_html, flags=re.S)
    return clean(re.sub(r"<(div|p|br)[^>]*>", "\n", body))


def form_dates(rec_html):
    """Options of the 'Свободные даты' select of a Zero form -> [{month, dates[]}] + note."""
    m = re.search(r'class="tn-atom__inputs-data" data-value="([^"]*)"', rec_html)
    if not m:
        return None
    for field in json.loads(html.unescape(m.group(1))):
        if field.get("li_title") != "Свободные даты":
            continue
        groups, note = [], None
        for line in field.get("li_variants", "").split("\n"):
            line = line.strip()
            if not line:
                continue
            if line.startswith("--"):
                title = line.strip("- ").strip()
                if re.search(r"(?i)бронир|предзапис|не определил|выбираю", title):
                    if not re.search(r"(?i)не определил|выбираю", title):
                        note = title
                    continue
                groups.append({"month": title.replace("Августа", "Август"), "dates": []})
            elif groups:
                groups[-1]["dates"].append(line.replace("-", "–"))
        return {"groups": groups, "note": note}
    return None


def paragraphs(text):
    return [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]


# ---------------------------------------------------------------- tour pages
def tour_page(src, slug, warn):
    recs = records(src)
    out = {"intro": [], "logistics": [], "ridingNote": None, "gallery": [], "days": {}, "dates": None,
           "subtitle": None, "priceNote": None}
    started = False
    for rid, typ, h in recs:
        txt = rec_text(h)
        if any(txt.startswith(s) or ("\n" + s) in txt[:200] for s in SHARED_START) and started:
            break
        if typ in ("702", "309") or re.search(r"Связаться с нами\s*\nчерез (Telegram|WhatsApp)", txt):
            continue
        els = elements(h)
        if not els:
            if "Стоимость тура" in txt:
                started = True
                note = re.search(r"Для бронирования.*?(?:похода|тура)\.", txt.replace("\n", " "))
                out["priceNote"] = note.group(0) if note else None
                # extra prices with their label, e.g. «стоимость без штурма 68 000 ₽/чел» (/gonaelbrus)
                lines = [l.strip() for l in txt.split("\n") if l.strip()]
                out["altPrices"] = [{"label": lines[i - 1], "priceRub": int(re.sub(r"\D", "", l))}
                                    for i, l in enumerate(lines)
                                    if i > 1 and re.fullmatch(r"[\d ]+₽/чел", l) and not lines[i - 1].startswith("Стоимость тура")]
            continue
        day = next((int(re.match(r"\d+", e["text"]).group(0)) for e in els
                    if re.fullmatch(r"\d+\s*ДЕНЬ", e["text"])), None)
        if day:
            started = True
            out["days"][day] = [i for e in els for i in e["images"]]
            continue
        gallery = [i for e in els if e["type"] == "gallery" for i in e["images"]]
        if out["gallery"]:
            # free-form description blocks (/avtopohod: «Описание похода» without days)
            text = "\n".join(e["text"] for e in els if len(e["text"]) > 60)
            if text:
                out.setdefault("story", []).append({"text": re.sub(r"\s*\n\s*", " ", text),
                                                    "images": [i for e in els for i in e["images"]]})
            continue
        if gallery and not out["gallery"]:
            started = True
            out["gallery"] = gallery
            texts = [e for e in els if e["text"]]
            long = sorted((e for e in texts if len(e["text"]) > 160), key=lambda e: (e["top"], e["left"]))
            for e in long:
                out["intro"] += paragraphs(e["text"])
            for e in texts:
                t = e["text"]
                if t.startswith("Место встречи") or t.startswith("Трансфер"):
                    out["logistics"] += [l.strip() for l in t.split("\n") if l.strip()]
                elif re.search(r"(?i)навыков верховой|сильных всадников|опытных всадников", t) and len(t) < 90:
                    out["ridingNote"] = t
                elif re.search(r"(?i)метров над уровнем", t) and len(t) < 60:
                    out["subtitle"] = t
            out["dates"] = form_dates(h)
    if not out["gallery"]:
        warn.append("no intro gallery")
    if not out["intro"]:
        warn.append("no intro text")
    out["days"] = [{"day": d, "images": imgs} for d, imgs in sorted(out["days"].items())]
    return out


def legacy_tour_page(src, warn):
    """Old 2022 layout (/hasaut2): standard Tilda blocks instead of Zero blocks, program as text."""
    recs = records(src)
    cover = next(h for _, typ, h in recs if typ == "206")
    about = rec_text(next(h for _, typ, h in recs if typ == "473"))
    lines = [l.strip(" ﻿") for l in about.split("\n") if l.strip(" ﻿")]
    lines = [l for l in lines if l != "О маршруте:"]
    facts = [l for l in lines if re.match(r"(Продолжительность|Сложность|Не требует|Уровень|Место встречи|Трансфер)", l)]
    intro = " ".join(l for l in lines if l not in facts)
    intro = re.sub(r"\s+([.,)])", r"\1", re.sub(r"\(\s*", "(", intro))
    days, program = {}, {}
    for _, typ, h in recs:
        if typ not in ("843", "847"):
            continue
        txt = rec_text(h).replace("﻿", "")
        imgs = images(h)
        block_days = []
        for m in re.finditer(r"(\d+) ДЕНЬ:\s*(.*?)(?=\n\d+ ДЕНЬ:|\nХОЧУ С ВАМИ|$)", txt, flags=re.S):
            d = int(m.group(1))
            program[d] = re.sub(r"\s+", " ", m.group(2)).strip()
            block_days.append(d)
        if imgs and block_days:
            days[block_days[0]] = imgs  # photos of a text block illustrate the block as a whole
    price = re.search(r"стоимость ([\d ]+) руб", rec_text(cover))
    note = re.search(r"\d\d\.\d\d-\d\d\.\d\d \([^)]*\)", src)
    if not program:
        warn.append("no program")
    return {"intro": [intro], "logistics": [l for l in facts if l.startswith(("Место", "Трансфер"))],
            "ridingNote": next((l.rstrip(".") for l in facts if l.startswith("Не требует")), None),
            "gallery": images(cover) + images(next(h for _, typ, h in recs if typ == "670")),
            "days": [{"day": d, "images": days.get(d, [])} for d in sorted(program)],
            "program": [{"day": d, "text": program[d]} for d in sorted(program)],
            "dates": {"groups": [], "note": f"Архивный маршрут: {note.group(0)}" if note else "Архивный маршрут"},
            "subtitle": None, "priceNote": None,
            "priceRub": int(price.group(1).replace(" ", "")) if price else None}


# ---------------------------------------------------------------- home page
def by_id(recs, rid):
    return next(h for r, _, h in recs if r == rid)


def home_page(src):
    recs = records(src)
    home = {}

    hero = by_id(recs, "599611561")
    home["hero"] = {"image": images(hero)[0]}

    home["featured"] = []
    for rid in ("599624988", "599627736", "599628694"):
        h = by_id(recs, rid)
        els = [e for e in elements(h) if e["text"]]
        title = next(e["text"] for e in els if len(e["text"]) < 70)
        text = max((e["text"] for e in els), key=len)
        # the tour is the one the title links to (photos of the first card still point to /chegem)
        chunk = next(c for c in re.split(r"(?=<div class='t396__elem)", h) if clean(c).startswith(title[:20]))
        slug = re.search(r'href="([a-z]+)\.html"', chunk).group(1)
        home["featured"].append({"slug": slug, "title": title.replace("\n", " "), "text": text,
                                 "images": [i for e in elements(h) for i in e["images"]]})

    film = clean(by_id(recs, "609501993"))
    home["film"] = {"text": re.sub(r"\s+", " ", film.replace("\n", " ")).strip()}
    home["videos"] = re.findall(r'data-videolazy-id="([\w-]+)"', src)
    home["gallery"] = images(by_id(recs, "599533451"))

    why = elements(by_id(recs, "604282272"))
    titles = [e for e in why if e["text"] and len(e["text"]) < 40]
    bodies = [e for e in why if len(e["text"]) >= 40]
    pics = [e for e in why if e["images"]]
    home["why"] = []
    for t in sorted(titles, key=lambda e: e["left"]):
        body = min(bodies, key=lambda b: abs(b["left"] - t["left"]))
        pic = min(pics, key=lambda p: abs(p["left"] - t["left"]))
        home["why"].append({"title": t["text"], "text": re.sub(r"\s+", " ", body["text"]).strip(),
                            "image": pic["images"][0]})

    home["schedule"] = []
    for rid in ("604282277", "604282276", "749776201", "762235797", "4120161101", "604282280", "604282281"):
        h = by_id(recs, rid)
        links = [l for l in re.findall(r'href="([a-z]+)\.html"', h) if l != "index"]
        slug = links[-1] if rid == "4120161101" else links[0]  # Канжол card also links to Инал
        els = elements(h)
        # card layout: gallery | title + text column (x≈410) | quick booking form (x≈800)
        column = [e for e in els if e["text"] and 380 <= e["left"] < 790]
        title = column[0]["text"]
        facts = re.compile(r"(?i)^(сложность|продолжительность|уровень|не требует|только для|быстрое)")
        teaser = " ".join(e["text"] for e in column[1:] if not facts.match(e["text"]))
        home["schedule"].append({"slug": slug, "title": title.replace("\n", " "), "teaser": teaser.replace("\n", " "),
                                 "images": [i for e in els for i in e["images"]], "dates": form_dates(h)})

    home["reviews"] = images(by_id(recs, "604282290"))
    home["reviewPhotos"] = images(by_id(recs, "604282283"))

    team_intro = elements(by_id(recs, "604282286"))
    texts = [e["text"] for e in team_intro if len(e["text"]) > 120]
    home["teamIntro"] = [t for t in texts if not t.startswith("Путешествует")]
    home["team"] = []
    for rid in ("604282286", "604282287", "798078987"):
        els = elements(by_id(recs, rid))
        roles = [e for e in els if re.match(r"(Основатель|Гид|Вроде)", e["text"]) and len(e["text"]) < 40]
        for r in roles:
            # Zero block card: photo, then name, role and bio stacked in one column
            col = [e for e in els if abs(e["left"] - r["left"]) < 120]
            name = min((e for e in col if e["text"] and e is not r and abs(e["top"] - r["top"]) < 60 and len(e["text"]) < 20),
                       key=lambda e: abs(e["top"] - r["top"]), default=None)
            bio = sorted((e for e in col if len(e["text"]) > 40 and e["top"] > r["top"]), key=lambda e: e["top"])
            photo = min((e for e in col if e["images"] and e["top"] < r["top"]),
                        key=lambda e: r["top"] - e["top"], default=None)
            home["team"].append({"name": name["text"] if name else None, "role": r["text"],
                                 "bio": [e["text"] for e in bio], "image": photo["images"][0] if photo else None})

    camp = by_id(recs, "604282292")
    home["campingImages"] = images(camp)
    home["campingPriceImages"] = images(by_id(recs, "604282293"))
    form = by_id(recs, "599533464")
    home["formImage"] = images(form)[0]
    return home


def camping_page(src):
    recs = records(src)
    cover = next(images(h)[0] for _, typ, h in recs if typ == "14")
    return {"cover": cover}


def policy_page(src):
    recs = records(src)
    h = next(h for _, typ, h in recs if typ == "106")
    raw = re.search(r'<div field="text"[^>]*>(.*?)</div>', h, flags=re.S).group(1)
    title = clean(re.search(r"<strong>(.*?)</strong>", raw, flags=re.S).group(1))
    raw = raw.replace(re.search(r"<strong>.*?</strong>", raw, flags=re.S).group(0), "", 1)
    blocks = []
    for line in clean(re.sub(r"</?(p|div|li)[^>]*>", "\n", raw)).split("\n"):
        line = line.strip()
        if not line:
            continue
        if re.match(r"^\d+\. [А-ЯA-Z]", line) and len(line) < 120:
            blocks.append({"h": line, "p": []})
        elif blocks:
            blocks[-1]["p"].append(line)
        else:
            blocks.append({"h": None, "p": [line]})
    return {"title": title, "sections": blocks}


def main(pages_dir, out_file):
    read = lambda name: open(os.path.join(pages_dir, name), encoding="utf8").read()  # noqa: E731
    content = {"_source": "Сгенерировано tools/extract_content.py из публичных страниц зеркала. Не править руками.",
               "home": home_page(read("index.html")), "camping": camping_page(read("campig.html")),
               "policy": policy_page(read("policy.html")), "tours": {}}
    skip = {"index", "success", "sps", "policy", "campig"}
    for f in sorted(os.listdir(pages_dir)):
        slug = f[:-5]
        if not f.endswith(".html") or slug in skip:
            continue
        warn = []
        src = read(f)
        is_legacy = 'data-record-type="473"' in src and "ДЕНЬ:" in src
        content["tours"][slug] = legacy_tour_page(src, warn) if is_legacy else tour_page(src, slug, warn)
        content["tours"][slug]["_warnings"] = warn
        if warn:
            print(f"[warn] {slug}: {', '.join(warn)}", file=sys.stderr)
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    with open(out_file, "w", encoding="utf8") as fh:
        json.dump(content, fh, ensure_ascii=False, indent=1)
    print(f"{out_file}: {len(content['tours'])} tours")


if __name__ == "__main__":
    main(*sys.argv[1:3])
