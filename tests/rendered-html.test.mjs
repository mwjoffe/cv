import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("static export includes the complete accessible résumé and playable entry point", async () => {
  const html = await readFile(
    new URL("../out/index.html", import.meta.url),
    "utf8",
  );
  for (const text of [
    "Marketing builder",
    "START SESSION",
    "Head of GTM, Health",
    "Adjunct Professor",
    "YouTube",
    "Blue Ant Media",
    "Concordia University",
    "Smarter Together",
    "linkedin.com/in/michaeljoffe",
  ])
    assert.ok(html.includes(text), `Missing ${text}`);
  assert.doesNotMatch(
    html,
    /TRICK BOOK|PICK TRICK|KEEP ROLLING|Skate or CV|forward motion|checkpoint-card|hero-tags|class="ticker"|MICHAEL JOFFE \/ RÉSUMÉ|PRINT \/ SAVE|2009 — PRESENT|03 \/ CONTACT/i,
  );
  assert.match(html, /id="resume"/);
  assert.match(html, /id="role-7"/);
  assert.match(html, /Skip game and read résumé/);
  assert.match(html, /\/cv\/_next\//);
});
