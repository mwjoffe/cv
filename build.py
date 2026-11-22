#!/usr/bin/env python3
"""Build the CV site from content/*.json into dist/.

Pure Python standard library: no Node, no packages.
Usage: python3 build.py
"""

from __future__ import annotations

import datetime
import json
import re
import shutil
from html import escape
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"
ASSETS = ROOT / "assets"
DIST = ROOT / "dist"
YEAR = datetime.date.today().year

SECTIONS = [
    ("work", "Experience", "index.html"),
    ("projects", "Projects", "projects/index.html"),
    ("explorations", "Explorations", "explorations/index.html"),
    ("writing", "Writing", "writing/index.html"),
]

SITE_URL = "https://mwjoffe.github.io/cv"

CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self'; "
    "img-src 'self' data:; media-src 'self'; "
    "frame-src https://www.youtube-nocookie.com https://www.youtube.com; "
    "object-src 'none'; base-uri 'self'; form-action 'none'"
)
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
YT_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")

PROFILE: dict = {}
PROJECTS: list[dict] = []
EXPLORATIONS: list[dict] = []
WRITING_GROUPS: list[tuple[str, str, list[dict]]] = []

WRITING_BUCKETS = [
    ("books", "Books", {"Book"}),
    ("papers", "Papers & Chapters", {"Paper", "Chapter", "Article"}),
    ("talks", "Talks", {"Talk", "Keynote", "Panel"}),
    ("essays", "Essays", {"Essay"}),
]


def group_writing(items: list[dict]) -> list[tuple[str, str, list[dict]]]:
    groups = []
    used: set[int] = set()
    for slug, label, types in WRITING_BUCKETS:
        matched = [w for idx, w in enumerate(items) if w.get("type") in types and not used.add(idx)]
        if matched:
            groups.append((slug, label, matched))
    leftover = [w for idx, w in enumerate(items) if idx not in used]
    if leftover:
        groups.append(("other", "Other", leftover))
    return groups


def e(value: object) -> str:
    return escape(str(value), quote=True)


def safe_json(data: object) -> str:
    return json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")


def load(name: str):
    return json.loads((CONTENT / f"{name}.json").read_text("utf-8"))


def safe_url(url: str) -> str:
    if urlparse(url).scheme not in ("http", "https"):
        raise ValueError(f"Only http(s) external links are allowed: {url!r}")
    return url


def asset(rel: str) -> str:
    path = Path(rel)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError(f"Media paths must stay inside assets/: {rel!r}")
    if not (ASSETS / path).is_file():
        raise FileNotFoundError(f"Missing media file: assets/{rel}")
    return path.as_posix()


def check_slugs(items: list[dict], kind: str) -> None:
    seen = set()
    for item in items:
        slug = item["slug"]
        if not SLUG_RE.match(slug) or slug in seen:
            raise ValueError(f"Invalid or duplicate {kind} slug: {slug!r}")
        seen.add(slug)


def paragraphs(items: list[str]) -> str:
    return "".join(f"<p>{e(p)}</p>" for p in items if p)


def write(rel: str, html: str) -> None:
    out = DIST / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, "utf-8")


def youtube_embed(embed: dict) -> str:
    vid = str(embed.get("youtube", ""))
    if not YT_ID_RE.match(vid):
        raise ValueError(f"Invalid YouTube video ID: {vid!r}")
    title = e(embed.get("title", "Embedded video"))
    return (
        f'<div class="embed-frame">'
        f'<iframe src="https://www.youtube-nocookie.com/embed/{vid}?rel=0" '
        f'title="{title}" '
        f'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" '
        f'referrerpolicy="strict-origin-when-cross-origin" '
        f'allowfullscreen loading="lazy"></iframe>'
        f"</div>"
    )


def video_player(root: str, video: dict) -> str:
    src = e(f"{root}assets/{asset(video['src'])}")
    poster_attr = ""
    if video.get("poster"):
        poster_attr = f' poster="{e(f"{root}assets/{asset(video["poster"])}")}"'
    return (
        f'<div class="video-frame">'
        f'<video class="video-el" src="{src}"{poster_attr} controls playsinline preload="metadata"></video>'
        f"</div>"
    )


def media_frame(root: str, media: dict | None, slot_label: str, *, autoplay: bool = False) -> str:
    if not media:
        return (
            f'<div class="media-slot" role="img" aria-label="{e(slot_label)}">'
            f'<span class="media-slot-label">{e(slot_label)}</span>'
            f"</div>"
        )
    src = e(f"{root}assets/{asset(media['src'])}")
    if media.get("type") == "video":
        attrs = (
            'autoplay muted loop playsinline preload="metadata"'
            if autoplay
            else 'controls playsinline muted loop preload="metadata"'
        )
        return f'<video class="media-el" src="{src}" {attrs}></video>'
    return (
        f'<img class="media-el" src="{src}" alt="{e(media.get("alt", ""))}" '
        f'loading="lazy" decoding="async">'
    )


def figure(root: str, media: dict) -> str:
    if media.get("type") == "youtube":
        el = youtube_embed(media)
    else:
        el = media_frame(root, media, "", autoplay=False)
    cap = f"<figcaption>{e(media['caption'])}</figcaption>" if media.get("caption") else ""
    return f'<figure class="gallery-item">{el}{cap}</figure>'


def entry_sections(sections: list[dict]) -> str:
    if not sections:
        return ""
    blocks = []
    for sec in sections:
        heading = f'<h2 class="entry-subhead">{e(sec["heading"])}</h2>' if sec.get("heading") else ""
        blocks.append(f'<section class="entry-section">{heading}{paragraphs(sec.get("body", []))}</section>')
    return "".join(blocks)


def external_links(links: list[dict]) -> str:
    if not links:
        return ""
    items = "".join(
        f'<li><a href="{e(safe_url(link["url"]))}" target="_blank" rel="noopener noreferrer">'
        f'{e(link["label"])} <span aria-hidden="true">↗</span></a></li>'
        for link in links
    )
    return f'<ul class="entry-links">{items}</ul>'


def sub_entries(root: str, section: str, active_slug: str | None) -> list[dict]:
    if section == "work":
        return [
            {"num": "", "label": "Current", "href": f"{root}index.html#current", "active": False, "anchor": "current"},
            {"num": "", "label": "Earlier", "href": f"{root}index.html#earlier", "active": False, "anchor": "earlier"},
            {"num": "", "label": "Education", "href": f"{root}index.html#credentials", "active": False, "anchor": "credentials"},
        ]
    if section == "projects":
        return [
            {
                "num": f"{i + 1:02d}",
                "label": pr["title"],
                "href": f"{root}projects/{pr['slug']}/index.html",
                "active": active_slug == pr["slug"],
            }
            for i, pr in enumerate(PROJECTS)
        ]
    if section == "explorations":
        return [
            {
                "num": f"{i + 1:02d}",
                "label": ex["title"],
                "href": f"{root}explorations/{ex['slug']}/index.html",
                "active": active_slug == ex["slug"],
            }
            for i, ex in enumerate(EXPLORATIONS)
        ]
    if section == "writing":
        return [
            {
                "num": "",
                "label": label,
                "href": f"{root}writing/index.html#{slug}",
                "active": False,
                "anchor": slug,
            }
            for slug, label, _items in WRITING_GROUPS
        ]
    return []


def render_sub_list(entries: list[dict], aria_label: str, *, overlay: bool = False) -> str:
    if not entries:
        return ""
    cls = "ov-sub" if overlay else "sub-dir"
    link_cls = "ov-sub-link" if overlay else "sub-link"
    items = []
    for item in entries:
        cur = ' aria-current="page"' if item["active"] else ""
        anchor_attr = f' data-spy-target="{e(item["anchor"])}"' if item.get("anchor") else ""
        num_html = f'<span class="sub-num">{e(item["num"])}</span>' if item["num"] else ""
        items.append(
            f'<li><a class="{link_cls}" href="{e(item["href"])}"{anchor_attr}{cur}>'
            f'{num_html}<span>{e(item["label"])}</span></a></li>'
        )
    return f'<ul class="{cls}" aria-label="{e(aria_label)}">{"".join(items)}</ul>'


def vernier_ticks(total: int, active_index: int) -> str:
    """Fine micrometer tick scale with major detents at each navigable stop."""
    ticks = []
    for i in range(total):
        state = " is-active" if i == active_index else ""
        ticks.append(f'<span class="v-tick v-major{state}" data-stop="{i}"></span>')
        if i < total - 1:
            ticks.append('<span class="v-tick"></span><span class="v-tick"></span><span class="v-tick"></span>')
    return "".join(ticks)


def shell(
    *,
    root: str,
    section: str,
    title: str,
    description: str,
    body: str,
    active_slug: str | None = None,
    dial_stops: list[dict] | None = None,
    dial_index: int = 0,
    dial_mode: str = "sections",
    prev: str | None = None,
    nxt: str | None = None,
) -> str:
    section_names = {k: lbl for k, lbl, _ in SECTIONS}
    sec_keys = [k for k, _, _ in SECTIONS]
    sec_idx = sec_keys.index(section)

    if dial_stops is None:
        dial_stops = [
            {"label": lbl, "href": f"{root}{href}"}
            for _k, lbl, href in SECTIONS
        ]
        dial_index = sec_idx

    prev_stop = dial_stops[dial_index - 1]
    next_stop = dial_stops[(dial_index + 1) % len(dial_stops)]
    current_stop = dial_stops[dial_index]

    rail_items = []
    overlay_items = []
    for key, label, href in SECTIONS:
        is_current = key == section
        current_attr = ' aria-current="page"' if (is_current and not active_slug) else ""
        active_class = " is-active" if is_current else ""
        entries = sub_entries(root, key, active_slug) if is_current else []
        sub_rail = render_sub_list(entries, label, overlay=False)
        sub_ov = render_sub_list(entries, label, overlay=True)

        rail_items.append(
            f'<li class="dir-item{active_class}">'
            f'<a class="dir-link" href="{root}{href}"{current_attr}>'
            f"<span>{label}</span>"
            f"</a>{sub_rail}</li>"
        )
        overlay_items.append(
            f'<li class="ov-item{active_class}">'
            f'<a class="ov-link" href="{root}{href}"{current_attr}>'
            f"<span>{label}</span>"
            f"</a>{sub_ov}</li>"
        )

    head_links = ""
    for rel, href in (("prev", prev), ("next", nxt)):
        if href:
            head_links += f'<link rel="{rel}" href="{e(href)}">'

    nav_payload = {
        "mode": dial_mode,
        "activeIndex": dial_index,
        "stops": dial_stops,
    }

    mobile_context = (
        f"{section_names[section]} · {dial_index + 1:02d}/{len(dial_stops):02d}"
        if dial_mode == "entries"
        else section_names[section]
    )

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<meta name="robots" content="noindex, nofollow">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:type" content="website">
<meta property="og:image" content="{SITE_URL}/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(description)}">
<meta name="twitter:image" content="{SITE_URL}/assets/og.png">
<link rel="icon" href="{root}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{root}assets/style.css">
{head_links}
<script id="site-nav-data" type="application/json">{safe_json(nav_payload)}</script>
<script src="{root}assets/site.js" defer></script>
</head>
<body data-section="{e(section)}">
<a class="skip" href="#main">Skip to content</a>
<div class="top-trace" aria-hidden="true"><span class="top-trace-fill"></span></div>

<header class="mobile-head">
  <a class="brand" href="{root}index.html">{e(PROFILE['name'])}</a>
  <span class="mobile-loc">{e(mobile_context)}</span>
</header>

<div class="shell" id="top">
  <aside class="rail" aria-label="Site directory">
    <div class="rail-top">
      <a class="brand" href="{root}index.html">{e(PROFILE['name'])}</a>
      <p class="brand-sub">{e(PROFILE['descriptor'])}</p>
    </div>

    <nav class="dir" aria-label="Sections">
      <ul>{''.join(rail_items)}</ul>
    </nav>

    <div class="rail-foot">
      <a class="ext-link" href="{e(safe_url(PROFILE['linkedin']))}" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
      <span class="copy">© {YEAR}</span>
    </div>
  </aside>

  <main id="main" class="content">
    {body}
    <footer class="foot">
      <span class="foot-mobile-only">© {YEAR} {e(PROFILE['name'])}</span>
      <div class="foot-links">
        <a class="foot-mobile-only" href="{e(safe_url(PROFILE['linkedin']))}" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  </main>
</div>

<!-- Mobile translucent tactile dial -->
<div class="dial-dock" id="dial-dock">
  <div class="dial-preview" id="dial-preview" aria-live="polite" hidden>
    <span class="dial-preview-label" id="dial-preview-label"></span>
  </div>
  <nav class="dial" aria-label="Quick navigation dial">
    <a class="dial-step" href="{e(prev_stop['href'])}" aria-label="Previous: {e(prev_stop['label'])}">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3.5 5.5 8 10 12.5"/></svg>
    </a>
    <button class="dial-core" id="dial-core" type="button" aria-haspopup="dialog" aria-controls="nav-overlay" aria-expanded="false" aria-label="Open navigation or drag horizontally to scrub">
      <span class="dial-label" id="dial-label">{e(current_stop['label'])}</span>
      <span class="vernier-window" aria-hidden="true">
        <span class="vernier" id="dial-vernier">{vernier_ticks(len(dial_stops), dial_index)}</span>
      </span>
      <span class="dial-progress" aria-hidden="true"><span class="dial-progress-fill"></span></span>
    </button>
    <a class="dial-step" href="{e(next_stop['href'])}" aria-label="Next: {e(next_stop['label'])}">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>
    </a>
  </nav>
</div>

<!-- Full-viewport translucent navigation overlay (mobile) -->
<dialog class="nav-overlay" id="nav-overlay" aria-label="Site navigation">
  <div class="ov-inner">
    <div class="ov-head">
      <a class="brand" href="{root}index.html">{e(PROFILE['name'])}</a>
      <button class="ov-close" id="ov-close" type="button" aria-label="Close navigation">
        <span>Close</span>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>
      </button>
    </div>

    <nav class="ov-body" aria-label="Sections">
      <ul class="ov-dir">{''.join(overlay_items)}</ul>
    </nav>

    <div class="ov-foot">
      <a class="ext-link" href="{e(safe_url(PROFILE['linkedin']))}" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
      <span class="ov-hint">Drag dial to scrub</span>
    </div>
  </div>
</dialog>
</body>
</html>
"""


# ------------------------------------------------------------------ home
def build_home(work: list[dict]) -> None:
    root = ""
    p = PROFILE
    project_titles = {pr["slug"]: pr["title"] for pr in PROJECTS}

    def role_html(r: dict, idx: int) -> str:
        highlights = "".join(f"<li>{e(h)}</li>" for h in r.get("highlights", []))
        highlights_html = f'<ul class="role-highlights">{highlights}</ul>' if highlights else ""
        related = "".join(
            f'<a class="inline-action" href="projects/{e(slug)}/index.html">'
            f'Project: {e(project_titles[slug])} <span aria-hidden="true">→</span></a>'
            for slug in r.get("projects", [])
            if slug in project_titles
        )
        related_html = f'<div class="role-links">{related}</div>' if related else ""
        return f"""
<article class="role" id="role-{idx}">
  <div class="role-dates">{e(r['dates'])}</div>
  <div class="role-main">
    <h3 class="role-title">{e(r['role'])}</h3>
    <p class="role-org">{e(r['org'])}</p>
    <p class="role-summary">{e(r['summary'])}</p>
    {highlights_html}
    {related_html}
  </div>
</article>"""

    current = [r for r in work if r.get("current")]
    earlier = [r for r in work if not r.get("current")]

    current_html = "".join(role_html(r, i) for i, r in enumerate(current))
    earlier_html = "".join(role_html(r, i + len(current)) for i, r in enumerate(earlier))

    edu_html = "".join(
        f"<li><span class='cred-primary'>{e(x['degree'])}</span>"
        f"<span class='cred-secondary'>{e(x['school'])}</span></li>"
        for x in p["education"]
    )
    rec_html = "".join(f"<li>{e(x)}</li>" for x in p["recognition"])

    body = f"""
<section class="intro" aria-labelledby="intro-heading">
  <h1 id="intro-heading" class="statement">{e(p['statement'])}</h1>
  <div class="intro-copy">{paragraphs(p['intro'])}</div>
</section>

<section class="cv-block" id="current" data-spy-section="current" aria-labelledby="current-heading">
  <div class="block-head">
    <h2 id="current-heading" class="group-title">Current</h2>
  </div>
  {current_html}
</section>

<section class="cv-block" id="earlier" data-spy-section="earlier" aria-labelledby="earlier-heading">
  <div class="block-head">
    <h2 id="earlier-heading" class="group-title">Earlier</h2>
  </div>
  {earlier_html}
</section>

<section class="credentials" id="credentials" data-spy-section="credentials" aria-label="Education and recognition">
  <div class="cred-col">
    <h2 class="group-title">Education</h2>
    <ul class="cred-list">{edu_html}</ul>
  </div>
  <div class="cred-col">
    <h2 class="group-title">Recognition</h2>
    <ul class="cred-list">{rec_html}</ul>
  </div>
</section>"""

    write(
        "index.html",
        shell(
            root=root,
            section="work",
            title=f"{p['name']} — {p['descriptor']}",
            description=p["statement"],
            body=body,
        ),
    )


# --------------------------------------------------------------- writing
def build_writing() -> None:
    root = "../"
    sections_html = []
    for slug, label, group_items in WRITING_GROUPS:
        rows = "".join(
            f"""
<li class="bib-row">
  <span class="bib-year">{e(w['year'])}</span>
  <span class="bib-type">{e(w['type'])}</span>
  <div class="bib-main">
    <a class="bib-title" href="{e(safe_url(w['url']))}" target="_blank" rel="noopener noreferrer">{e(w['title'])} <span aria-hidden="true">↗</span></a>
    <p class="bib-venue">{e(w['venue'])}</p>
    {f"<p class='bib-note'>{e(w['note'])}</p>" if w.get('note') else ""}
  </div>
</li>"""
            for w in group_items
        )
        sections_html.append(
            f"""
<section class="cv-block" id="{e(slug)}" data-spy-section="{e(slug)}" aria-labelledby="writing-{e(slug)}">
  <div class="block-head">
    <h2 id="writing-{e(slug)}" class="group-title">{e(label)}</h2>
  </div>
  <ol class="bib-list">{rows}</ol>
</section>"""
        )

    body = f"""
<header class="page-head">
  <h1 class="page-title">Writing</h1>
  <p class="page-dek">{e(PROFILE['sections']['writing'])}</p>
</header>
{''.join(sections_html)}"""
    write(
        "writing/index.html",
        shell(
            root=root,
            section="writing",
            title=f"Writing — {PROFILE['name']}",
            description=PROFILE["sections"]["writing"],
            body=body,
        ),
    )


# ------------------------------------------------ detail page primitives
def pager(items: list[dict], i: int, section_label: str) -> tuple[str, str | None, str | None]:
    if len(items) < 2:
        return "", None, None
    prev_item = items[i - 1]
    next_item = items[(i + 1) % len(items)]
    prev_href = f"../{prev_item['slug']}/index.html"
    next_href = f"../{next_item['slug']}/index.html"
    html = f"""
<nav class="pager" aria-label="Browse {e(section_label.lower())}">
  <a class="pager-btn pager-prev" href="{e(prev_href)}" data-key-nav="prev" rel="prev">
    <span class="pager-label">← Previous</span>
    <span class="pager-title">{e(prev_item['title'])}</span>
  </a>
  <a class="pager-btn pager-next" href="{e(next_href)}" data-key-nav="next" rel="next">
    <span class="pager-label">Next →</span>
    <span class="pager-title">{e(next_item['title'])}</span>
  </a>
</nav>"""
    return html, prev_href, next_href


def entry_page(
    *,
    kind: str,
    section_label: str,
    item: dict,
    i: int,
    items: list[dict],
    meta: list[tuple[str, str]],
) -> None:
    root = "../../"
    slot_label = f"{i + 1:02d} / {len(items):02d} — Add image or MP4 in content/{kind}.json"
    if item.get("embed") and item["embed"].get("youtube"):
        cover_html = youtube_embed(item["embed"])
    elif item.get("video") and item["video"].get("src"):
        cover_html = video_player(root, item["video"])
    else:
        cover_html = media_frame(root, item.get("cover"), slot_label, autoplay=False)
    meta_html = "".join(
        f"<div class='meta-pair'><dt>{e(k)}</dt><dd>{e(v)}</dd></div>"
        for k, v in meta
        if v
    )
    gallery = "".join(figure(root, m) for m in item.get("media", []))
    gallery_html = f'<div class="gallery">{gallery}</div>' if gallery else ""
    pager_html, prev_href, next_href = pager(items, i, section_label)

    dial_stops = [
        {
            "label": it["title"],
            "href": f"../{it['slug']}/index.html",
        }
        for it in items
    ]

    body = f"""
<article class="entry">
  <header class="entry-head">
    <div class="breadcrumb">
      <a href="../index.html" data-key-nav="up">← {e(section_label)}</a>
      <span class="crumb-count">{i + 1:02d} / {len(items):02d}</span>
    </div>
    <h1 class="entry-title">{e(item['title'])}</h1>
    <p class="entry-dek">{e(item.get('dek', ''))}</p>
  </header>

  <dl class="meta-bar">{meta_html}</dl>

  <div class="entry-cover">{cover_html}</div>

  <div class="entry-body">
    {paragraphs(item.get('body', []))}
    {entry_sections(item.get('sections', []))}
    {external_links(item.get('links', []))}
  </div>

  {gallery_html}
</article>
{pager_html}"""

    write(
        f"{kind}/{item['slug']}/index.html",
        shell(
            root=root,
            section=kind,
            title=f"{item['title']} — {PROFILE['name']}",
            description=item.get("dek") or PROFILE["sections"][kind],
            body=body,
            active_slug=item["slug"],
            dial_stops=dial_stops,
            dial_index=i,
            dial_mode="entries",
            prev=prev_href,
            nxt=next_href,
        ),
    )


# -------------------------------------------------------------- projects
def build_projects() -> None:
    rows = "".join(
        f"""
<li>
  <a class="case-row" href="{e(pr['slug'])}/index.html">
    <span class="case-num">{i + 1:02d}</span>
    <div class="case-main">
      <h2 class="case-title">{e(pr['title'])}</h2>
      <p class="case-dek">{e(pr['dek'])}</p>
    </div>
    <div class="case-meta">
      <span>{e(pr['org'])}</span>
      <span>{e(pr['year'])}</span>
    </div>
    <span class="case-arrow" aria-hidden="true">→</span>
  </a>
</li>"""
        for i, pr in enumerate(PROJECTS)
    )
    body = f"""
<header class="page-head">
  <h1 class="page-title">Projects</h1>
  <p class="page-dek">{e(PROFILE['sections']['projects'])}</p>
</header>
<ol class="case-list">{rows}</ol>"""
    write(
        "projects/index.html",
        shell(
            root="../",
            section="projects",
            title=f"Projects — {PROFILE['name']}",
            description=PROFILE["sections"]["projects"],
            body=body,
        ),
    )
    for i, pr in enumerate(PROJECTS):
        entry_page(
            kind="projects",
            section_label="Projects",
            item=pr,
            i=i,
            items=PROJECTS,
            meta=[
                ("Role", pr.get("role", "")),
                ("Organization", pr.get("org", "")),
                ("Timeframe", pr.get("year", "")),
                ("Scope", pr.get("scope", "")),
                ("Outcome", pr.get("outcome", "")),
            ],
        )


# ---------------------------------------------------------- explorations
def build_explorations() -> None:
    tiles = []
    for i, ex in enumerate(EXPLORATIONS):
        slot_label = f"{i + 1:02d} · Visual slot"
        thumb = media_frame("../", ex.get("cover"), slot_label, autoplay=True)
        shipped = (
            f'<p class="tile-shipped">Included in {e(ex["featured_in"])}</p>'
            if ex.get("featured_in")
            else ""
        )
        tiles.append(
            f"""
<li>
  <a class="tile" href="{e(ex['slug'])}/index.html">
    <div class="tile-media">{thumb}</div>
    <div class="tile-meta">
      <div class="tile-top">
        <span class="tile-title">{e(ex['title'])}</span>
        <span class="tile-year">{e(ex['year'])}</span>
      </div>
      <p class="tile-sub">{e(ex.get('medium', ''))}</p>
      {shipped}
    </div>
  </a>
</li>"""
        )

    body = f"""
<header class="page-head">
  <h1 class="page-title">Explorations</h1>
  <p class="page-dek">{e(PROFILE['sections']['explorations'])}</p>
</header>
<ol class="contact-sheet">{''.join(tiles)}</ol>"""
    write(
        "explorations/index.html",
        shell(
            root="../",
            section="explorations",
            title=f"Explorations — {PROFILE['name']}",
            description=PROFILE["sections"]["explorations"],
            body=body,
        ),
    )
    for i, ex in enumerate(EXPLORATIONS):
        entry_page(
            kind="explorations",
            section_label="Explorations",
            item=ex,
            i=i,
            items=EXPLORATIONS,
            meta=[
                ("Medium", ex.get("medium", "")),
                ("Year", ex.get("year", "")),
                ("Launch context", ex.get("featured_in", "")),
            ],
        )


def main() -> None:
    global PROFILE, PROJECTS, EXPLORATIONS, WRITING_GROUPS
    PROFILE = load("profile")
    work = load("work")
    writing = load("writing")
    PROJECTS = load("projects")
    EXPLORATIONS = load("explorations")
    WRITING_GROUPS = group_writing(writing)

    check_slugs(PROJECTS, "project")
    check_slugs(EXPLORATIONS, "exploration")

    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(ASSETS, DIST / "assets")

    build_home(work)
    build_writing()
    build_projects()
    build_explorations()
    print(f"Built {len(PROJECTS)} projects and {len(EXPLORATIONS)} explorations into {DIST}")


if __name__ == "__main__":
    main()
