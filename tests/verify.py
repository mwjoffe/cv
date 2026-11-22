#!/usr/bin/env python3
"""Verify built static output in dist/ before publishing."""

from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
DIST = ROOT / "dist"


class LinkChecker(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.refs: list[tuple[str, str]] = []
        self.has_csp = False
        self.inline_js = False
        self._in_script_tag = False
        self._script_is_js = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = dict(attrs)
        if tag == "meta" and (attr.get("http-equiv") or "").lower() == "content-security-policy":
            self.has_csp = True
        if tag == "script":
            self._in_script_tag = True
            t = (attr.get("type") or "").lower()
            self._script_is_js = t in ("", "text/javascript", "application/javascript", "module")
            if attr.get("src"):
                self.refs.append(("script", attr["src"]))
                self._script_is_js = False
        for key in ("href", "src", "poster"):
            val = attr.get(key)
            if val:
                self.refs.append((f"{tag}[{key}]", val))

    def handle_data(self, data: str) -> None:
        if self._in_script_tag and self._script_is_js and data.strip():
            self.inline_js = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "script":
            self._in_script_tag = False
            self._script_is_js = False


def main() -> int:
    errors: list[str] = []

    for name in ("profile", "work", "writing", "projects", "explorations"):
        data = json.loads((CONTENT / f"{name}.json").read_text("utf-8"))
        if isinstance(data, list):
            for item in data:
                if item.get("placeholder"):
                    errors.append(f"{name}.json still has placeholder entry: {item.get('slug')}")

    pages = sorted(DIST.rglob("*.html"))
    if not pages:
        errors.append("No HTML files found in dist/ — run `python3 build.py` first.")

    for page in pages:
        rel = page.relative_to(DIST)
        parser = LinkChecker()
        parser.feed(page.read_text("utf-8"))
        if not parser.has_csp:
            errors.append(f"{rel}: missing Content-Security-Policy meta tag")
        if parser.inline_js:
            errors.append(f"{rel}: unexpected inline executable <script>")

        for kind, ref in parser.refs:
            if ref.startswith("#") or ref.startswith("mailto:"):
                continue
            parsed = urlparse(ref)
            if parsed.scheme in ("http", "https"):
                continue
            if parsed.scheme:
                errors.append(f"{rel}: unexpected URI scheme in {kind}={ref!r}")
                continue
            target = (page.parent / parsed.path).resolve()
            if not target.is_file() or DIST.resolve() not in target.parents:
                errors.append(f"{rel}: broken local asset/link {kind}={ref!r}")

    if errors:
        for err in errors:
            print(f"FAIL: {err}", file=sys.stderr)
        return 1

    print(f"OK: verified {len(pages)} pages and all local assets/links in {DIST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
