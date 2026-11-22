# Michael Joffe — CV

Minimal static CV site built with Python's standard library. No Node, no package manager, no external runtime dependencies.

## Run locally

Requires Python 3.10+.

```sh
python3 build.py
python3 tests/verify.py
python3 serve.py
```

Open `http://127.0.0.1:8000`.

## Structure

- `content/` — JSON source files for Experience (`work.json`), Profile (`profile.json`), Projects (`projects.json`), Explorations (`explorations.json`), and Writing (`writing.json`).
- `assets/` — Stylesheet (`style.css`), navigation script (`site.js`), favicon, Open Graph card, and local media.
- `build.py` — Static generator that outputs `dist/`.
- `tests/verify.py` — Verifies JSON data, CSP tags, and every local link and media asset in `dist/`.
- `.github/workflows/deploy-pages.yml` — Builds, verifies, and publishes `dist/` to GitHub Pages on pushes to `main`.
