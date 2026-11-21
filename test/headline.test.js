// Development: a long checklist title splits into a heading and a rendered spec; the stored title stays whole.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { headline, LONG_TITLE } from "../web/headline.js";
import { renderMarkdown, inline } from "../web/markdown.js";

const LONG = "Palette guard. **Blocked: designer** picks a rename for `--color-danger` (`#ff1c1f`, 359°) first; then a new `PaletteTests` reads every `--color-*` hex in `Tokens.uss` and fails for a token whose hue is within 30° of a reserved hue. Put the check in one static method.";

test("a long title shows its first sentence as the heading and the rest as a rendered spec", () => {
  assert.ok(LONG.length > 250);
  const { head, rest } = headline(LONG);
  assert.equal(head, "Palette guard.");
  assert.ok(rest.startsWith("**Blocked: designer**"));
  const html = renderMarkdown(rest);
  assert.match(html, /<strong>Blocked: designer<\/strong>/);
  assert.match(html, /<code>--color-danger<\/code>/);
});

test("a short title is not split", () => {
  const t = "Board: per project, toggles Epics and Docs";
  assert.deepEqual(headline(t), { head: t, rest: "" });
});

test("a long title with no early sentence end is cut at a word and keeps the whole text as the spec", () => {
  const t = "word ".repeat(40).trim();
  const { head, rest } = headline(t);
  assert.ok(head.endsWith("…") && head.length <= LONG_TITLE);
  assert.ok(!/\s…$/.test(head));
  assert.equal(rest, t);
});

test("a title's markdown renders inline and is escaped", () => {
  assert.equal(inline("**a** `<b>`"), "<strong>a</strong> <code>&lt;b&gt;</code>");
});

test("the detail pane and list rows use the heading, and the store is untouched", () => {
  const render = fs.readFileSync(path.join(import.meta.dirname, "..", "web", "render.js"), "utf8");
  assert.match(render, /<h2>\$\{inline\(head\)\}<\/h2>/);
  assert.match(render, /inline\(headline\(t\.title\)\.head\)/);
  assert.match(render, /class="doc spec"/);
});
