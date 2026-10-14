#!/usr/bin/env python3
"""Summarise a HAR export (DevTools -> Network -> Save all as HAR) for mock design.

Prints requests grouped by host / method / path with status, content types and,
for non-static calls, request body field names and a short response sample.
Cookies, Authorization headers and tildaspec-cookie values are never printed.

Usage: python3 -I tools/har_summary.py capture.har [--bodies]
"""
import json
import re
import sys
import urllib.parse
from collections import OrderedDict

STATIC = re.compile(r"\.(css|js|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|eot|mp4)(\?|$)", re.I)
SECRET_KEYS = re.compile(r"cookie|token|auth|session|password|captcha|formskey", re.I)


def field_names(post):
    if not post:
        return []
    if post.get("params"):
        return [p["name"] for p in post["params"]]
    text = post.get("text") or ""
    mime = post.get("mimeType", "")
    if "json" in mime:
        try:
            return list(json.loads(text).keys())
        except Exception:  # noqa: BLE001
            return ["<invalid json>"]
    if "urlencoded" in mime:
        return [k for k, _ in urllib.parse.parse_qsl(text, keep_blank_values=True)]
    return ["<%s, %d bytes>" % (mime or "unknown", len(text))]


def redact(text):
    try:
        obj = json.loads(text)
    except Exception:  # noqa: BLE001
        return text[:300]

    def walk(o):
        if isinstance(o, dict):
            return {k: ("<redacted>" if SECRET_KEYS.search(k) else walk(v)) for k, v in o.items()}
        if isinstance(o, list):
            return [walk(x) for x in o[:3]]
        return o
    return json.dumps(walk(obj), ensure_ascii=False)[:500]


def main():
    har = json.load(open(sys.argv[1], encoding="utf-8"))
    show_bodies = "--bodies" in sys.argv
    groups = OrderedDict()
    for e in har["log"]["entries"]:
        req, res = e["request"], e["response"]
        u = urllib.parse.urlsplit(req["url"])
        kind = "static" if STATIC.search(u.path) else "dynamic"
        key = (kind, u.netloc, req["method"], re.sub(r"\d{5,}", "{id}", u.path))
        g = groups.setdefault(key, {"n": 0, "status": set(), "types": set(), "query": set(), "fields": set(), "sample": None})
        g["n"] += 1
        g["status"].add(res.get("status"))
        g["types"].add((res.get("content") or {}).get("mimeType", "").split(";")[0])
        g["query"].update(k for k, _ in urllib.parse.parse_qsl(u.query, keep_blank_values=True))
        g["fields"].update(field_names(req.get("postData")))
        if show_bodies and kind == "dynamic" and not g["sample"]:
            g["sample"] = redact((res.get("content") or {}).get("text") or "")

    for kind in ("dynamic", "static"):
        print("\n## %s requests" % kind)
        for (k, host, method, p), g in groups.items():
            if k != kind:
                continue
            if kind == "static":
                continue
            print("%-6s %s%s  x%d  status=%s  type=%s" % (method, host, p, g["n"], sorted(g["status"]), ",".join(sorted(t for t in g["types"] if t))))
            if g["query"]:
                print("        query:", ", ".join(sorted(g["query"])))
            if g["fields"]:
                print("        body :", ", ".join(sorted(g["fields"])))
            if g["sample"]:
                print("        resp :", g["sample"])
        if kind == "static":
            hosts = OrderedDict()
            for (k, host, *_), g in groups.items():
                if k == "static":
                    hosts[host] = hosts.get(host, 0) + g["n"]
            for h, n in hosts.items():
                print("  %-30s %d files" % (h, n))


if __name__ == "__main__":
    main()
