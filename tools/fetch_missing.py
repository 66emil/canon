#!/usr/bin/env python3
"""Second pass after wget: fetch assets wget missed and make the mirror work offline.

What wget does not pick up on Tilda pages:
  * lazy-load images (data-original, data-img-zoom-url, data-content-cover-bg, inline style url())
  * thumbnail/optimised variants on thb./optim.tildacdn.com (we map them to the original file)
  * absolute CDN URLs inside inline <script> / JSON
  * url() references inside downloaded CSS (fonts, backgrounds)

Usage: python3 -I tools/fetch_missing.py site [--dry-run] [--no-rewrite]
Polite: one thread, a pause between requests, skips files that already exist.
"""
import gzip
import os
import re
import sys
import time
import random
import urllib.request
import urllib.parse

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/129.0 Safari/537.36")
DELAY = (1.0, 2.0)

ASSET_HOSTS = ("static.tildacdn.com", "static.tildacdn.one", "neo.tildacdn.com",
               "thb.tildacdn.com", "optim.tildacdn.com", "fonts.googleapis.com",
               "fonts.gstatic.com")
ASSET_EXT = re.compile(r"\.(jpe?g|png|gif|webp|svg|ico|avif|css|js|woff2?|ttf|otf|eot|mp4|webm|json)$", re.I)

# absolute URL, possibly JSON-escaped (https:\/\/...); stops at & so &quot;-wrapped JSON works
URL_RE = re.compile(r"https?:(?:\\?/){2}([a-z0-9.-]+\.(?:tildacdn\.com|tildacdn\.one|googleapis\.com|gstatic\.com))((?:\\?/)[^\s\"'()<>\\&,]*(?:\\/[^\s\"'()<>\\&,]*)*)", re.I)
# thb/optim variants: /tildXXXX/-/resize/20x/name.jpg , /tildXXXX/-/format/webp/name.jpg ...
VARIANT_RE = re.compile(r"^/(tild[0-9a-f-]+)/(?:-/[^/]+/[^/]+/)+(.+)$")


def normalise(host, path):
    """Return (download_url, local_rel_path) or None if not an asset we want."""
    path = path.replace("\\/", "/")
    path = path.split("#")[0]
    host = host.lower()
    if host not in ASSET_HOSTS:
        return None
    if host in ("thb.tildacdn.com", "optim.tildacdn.com"):
        m = VARIANT_RE.match(path.split("?")[0])
        if not m:
            return None
        host, path = "static.tildacdn.com", "/%s/%s" % m.groups()
    bare = path.split("?")[0]
    if host == "fonts.googleapis.com":
        local = host + bare + ("_" + urllib.parse.quote(path.split("?", 1)[1], safe="") if "?" in path else "") + ".css"
    elif not ASSET_EXT.search(bare):
        return None
    else:
        local = host + bare
    return "https://%s%s" % (host, path), local


def scan_text(text):
    for m in URL_RE.finditer(text):
        r = normalise(m.group(1), m.group(2))
        if r:
            yield m.group(0), r


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://canyontour.ru/"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    # tildacdn sends Content-Encoding: gzip even without Accept-Encoding
    if data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)


def text_files(root):
    for d, _, files in os.walk(root):
        for fn in files:
            base = fn.split("?")[0].lower()
            if base.endswith((".html", ".css", ".js")):
                yield os.path.join(d, fn)


def main():
    root = sys.argv[1]
    dry = "--dry-run" in sys.argv
    rewrite = "--no-rewrite" not in sys.argv

    # 1. collect
    wanted = {}
    for path in text_files(root):
        with open(path, encoding="utf-8", errors="surrogateescape") as f:
            for _, (url, local) in scan_text(f.read()):
                wanted.setdefault(local, url)
    missing = {l: u for l, u in wanted.items() if not os.path.exists(os.path.join(root, l))}
    print("referenced assets: %d, missing locally: %d" % (len(wanted), len(missing)))

    # 2. download missing
    failed = []
    for i, (local, url) in enumerate(sorted(missing.items()), 1):
        if dry:
            print("  would fetch", url)
            continue
        try:
            n = download(url, os.path.join(root, local))
            print("  [%d/%d] %s (%d B)" % (i, len(missing), url, n))
        except Exception as e:  # noqa: BLE001 - report and keep going
            failed.append((url, str(e)))
            print("  [%d/%d] FAIL %s: %s" % (i, len(missing), url, e))
        time.sleep(random.uniform(*DELAY))

    # 3. rewrite absolute CDN URLs to relative local paths (only if the file exists)
    if rewrite and not dry:
        changed = 0
        for path in text_files(root):
            with open(path, encoding="utf-8", errors="surrogateescape") as f:
                text = f.read()
            here = os.path.dirname(path)

            def repl(m):
                r = normalise(m.group(1), m.group(2))
                if not r or not os.path.exists(os.path.join(root, r[1])):
                    return m.group(0)
                rel = os.path.relpath(os.path.join(root, r[1]), here)
                rel = urllib.parse.quote(rel, safe="/._-~")
                return rel.replace("/", "\\/") if "\\/" in m.group(0) else rel

            new = URL_RE.sub(repl, text)
            if new != text:
                with open(path, "w", encoding="utf-8", errors="surrogateescape") as f:
                    f.write(new)
                changed += 1
        print("rewritten files:", changed)

    if failed:
        print("\nFAILED (%d):" % len(failed))
        for u, e in failed:
            print(" ", u, e)


if __name__ == "__main__":
    main()
