#!/usr/bin/env python3
"""Fix wget artefacts: the CDN answers with Content-Encoding: gzip, wget keeps the
compressed bytes and appends ".gz" to the file name and to every converted link.

For every *.gz file: decompress to the same name without ".gz" and drop the
".gz" suffix from references in HTML/CSS/JS. Any other file that still holds
gzip bytes is decompressed in place.

Usage: python3 -I tools/fix_gz.py site
"""
import gzip
import os
import re
import sys

REF_RE = re.compile(r"(\.(?:js|css|txt|json|svg))\.gz(?=[\"'\)\s>])")


def main():
    root = sys.argv[1]
    fixed = 0
    for d, _, files in os.walk(root):
        for fn in files:
            if not fn.endswith(".gz"):
                continue
            src = os.path.join(d, fn)
            dst = src[:-3]
            with open(src, "rb") as f:
                raw = f.read()
            data = gzip.decompress(raw) if raw[:2] == b"\x1f\x8b" else raw
            with open(dst, "wb") as f:
                f.write(data)
            os.remove(src)
            fixed += 1
    # files fetched under their normal name but still holding gzip bytes
    for d, _, files in os.walk(root):
        for fn in files:
            p = os.path.join(d, fn)
            with open(p, "rb") as f:
                raw = f.read()
            if raw[:2] == b"\x1f\x8b":
                with open(p, "wb") as f:
                    f.write(gzip.decompress(raw))
                fixed += 1
    print("decompressed:", fixed)

    changed = 0
    for d, _, files in os.walk(root):
        for fn in files:
            if not fn.split("?")[0].endswith((".html", ".css", ".js")):
                continue
            p = os.path.join(d, fn)
            with open(p, encoding="utf-8", errors="surrogateescape") as f:
                text = f.read()
            new = REF_RE.sub(r"\1", text)
            if new != text:
                with open(p, "w", encoding="utf-8", errors="surrogateescape") as f:
                    f.write(new)
                changed += 1
    print("files with fixed references:", changed)


if __name__ == "__main__":
    main()
