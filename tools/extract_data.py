#!/usr/bin/env python3
"""Build mock/data/tours.json from the mirrored public pages (site/canyontour.ru/*.html).

Only data visible to any visitor is used. Parsing is heuristic (Tilda Zero blocks
have no semantic markup), so every tour gets a "_parse" section with warnings.

Usage: python3 -I tools/extract_data.py site/canyontour.ru mock/data/tours.json
"""
import html
import json
import os
import re
import sys

NOT_TOURS = {"index", "success", "sps", "policy", "campig"}
FORM_FIELD_IDS = re.compile(r"data-tilda-(?:page|project)-id=\"(\d+)\"")


def text_lines(src):
    s = re.sub(r"<script.*?</script>|<style.*?</style>", "", src, flags=re.S)
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"<[^>]+>", "\n", s)
    s = html.unescape(s).replace("\xa0", " ")
    return [re.sub(r"\s+", " ", l).strip() for l in s.split("\n") if l.strip()]


def meta(src, name):
    m = re.search(r'<meta (?:name|property)="%s" content="([^"]*)"' % re.escape(name), src)
    return html.unescape(m.group(1)).strip() if m else None


def value_after(lines, label, stop=None, join=2):
    """Value that follows 'Label:' – either on the same line or in the next 1..join lines."""
    head = re.compile(r"^%s\s*(?:[:\-—–]|$)" % re.escape(label), re.I)
    clean = lambda v: v.strip(" :-—–.") or None  # noqa: E731
    for i, l in enumerate(lines):
        m = head.match(l)
        if m:
            rest = l[m.end():]
            if clean(rest):
                return clean(rest)
            parts = []
            for nxt in lines[i + 1:i + 1 + join]:
                if stop and re.match(stop, nxt):
                    break
                parts.append(nxt)
                if not re.fullmatch(r"(выше|ниже|\d+)", nxt, re.I):
                    break
            return clean(" ".join(parts))
    return None


def parse_rub(s):
    return int(re.sub(r"\D", "", s)) if s else None


def tour_from_page(slug, src, warn):
    L = text_lines(src)
    title = html.unescape(re.search(r"<title>(.*?)</title>", src, re.S).group(1)).strip()

    prices = [l for l in L if re.search(r"\d[\d ]*₽\s*/\s*чел(?!.*сутки)", l)]
    price = parse_rub(re.search(r"\d[\d ]*(?=₽)", prices[0]).group(0)) if prices else None
    alt_prices = sorted({parse_rub(re.search(r"\d[\d ]*(?=₽)", p).group(0)) for p in prices} - {price})
    if not prices:
        warn.append("price not found on page")

    dur_raw = value_after(L, "Продолжительность", join=2)
    dur = re.search(r"(\d+)", dur_raw or "")
    if not dur:
        # "Продолжительность:" / "5" / "дней" split into separate nodes, or only "N дней" somewhere
        m = next((re.match(r"(\d+)\s*(дн|день)", l) for l in L if re.match(r"\d+\s*(дн|день)", l)), None)
        dur = m
        warn.append("duration parsed from fallback (%r)" % dur_raw)

    prepay = None
    for l in L:
        m = re.search(r"(\d+)\s*%\s*от стоимости", l)
        if m:
            prepay = int(m.group(1))
            break

    # Program: Zero-block text comes before its "N ДЕНЬ" label in DOM order
    program, buf, started = [], [], False
    for l in L:
        if l.startswith("Стоимость тура"):
            break
        m = re.fullmatch(r"(\d+)\s*ДЕНЬ", l)
        if m:
            program.append({"day": int(m.group(1)), "text": " ".join(buf).strip()})
            buf = []
        elif l == "Программа похода":
            started = True
        elif started:
            buf.append(l)
    if program:
        nums = [d["day"] for d in program]
        if nums != list(range(1, len(nums) + 1)):
            warn.append("program days not sequential: %s" % nums)
    else:
        warn.append("program not found")

    duration_days = int(dur.group(1)) if dur else None
    empty = [d["day"] for d in program if not d["text"]]
    if empty:
        warn.append("empty text for days %s (Zero-block order differs, check manually)" % empty)
    if program and duration_days and len(program) != duration_days:
        warn.append("program has %d days, duration says %d" % (len(program), duration_days))

    og_image = meta(src, "og:image")
    return {
        "slug": slug,
        "name": meta(src, "og:title") or title,
        "pageTitle": title,
        "description": meta(src, "description"),
        "keywords": [k.strip() for k in (meta(src, "keywords") or "").split(",") if k.strip()],
        "coverImage": og_image,
        "priceRub": price,
        "altPricesRub": alt_prices,
        "prepaymentPercent": prepay,
        "durationDays": duration_days,
        "difficulty": value_after(L, "Сложность", join=2),
        "fitnessLevel": value_after(L, "Уровень физической подготовки", join=1),
        "meetingPoint": value_after(L, "Место встречи", join=1),
        "program": program,
        "sourceUrl": "https://canyontour.ru/" + slug,
    }


def extract_faq(src):
    """'Частые вопросы' accordion: a question is a line ending with '?', answer runs to the next one."""
    L = text_lines(src)
    try:
        start = L.index("Частые вопросы") + 1
        end = L.index("Почему выбирают нас?", start)
    except ValueError:
        return []
    faq = []
    for l in L[start:end]:
        if l.endswith("?") and len(l) < 80 and (not faq or faq[-1]["answer"]):
            faq.append({"question": l, "answer": []})
        elif faq:
            faq[-1]["answer"].append(l)
    return [{"question": q["question"], "answer": "\n".join(q["answer"])} for q in faq]


def main():
    pages_dir, out = sys.argv[1], sys.argv[2]
    with open(os.path.join(pages_dir, "elbrus.html"), encoding="utf-8") as f:
        faq = extract_faq(f.read())
    with open(os.path.join(os.path.dirname(out), "faq.json"), "w", encoding="utf-8") as f:
        json.dump(faq, f, ensure_ascii=False, indent=2)
    print("faq:", len(faq))
    tours, report = [], {}
    for fn in sorted(os.listdir(pages_dir)):
        if not fn.endswith(".html"):
            continue
        slug = fn[:-5]
        if slug in NOT_TOURS:
            continue
        with open(os.path.join(pages_dir, fn), encoding="utf-8") as f:
            src = f.read()
        warn = []
        t = tour_from_page(slug, src, warn)
        t["_parse"] = {"warnings": warn, "heuristic": True}
        tours.append(t)
        report[slug] = warn
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(tours, f, ensure_ascii=False, indent=2)
    print("tours:", len(tours))
    for slug, w in report.items():
        if w:
            print("  %-24s %s" % (slug, "; ".join(w)))


if __name__ == "__main__":
    main()
