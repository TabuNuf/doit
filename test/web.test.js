// The page's files stay small and leave ranking to the server.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const WEB = path.join(import.meta.dirname, "..", "web");
const files = fs.readdirSync(WEB).filter(f => f.endsWith(".js"));

test("no web file is over 300 lines", () => {
  for (const f of files) {
    const lines = fs.readFileSync(path.join(WEB, f), "utf8").split("\n").length;
    assert.ok(lines <= 300, `${f} has ${lines} lines`);
  }
});

test("the page does no rank arithmetic", () => {
  for (const f of files) {
    const text = fs.readFileSync(path.join(WEB, f), "utf8");
    assert.doesNotMatch(text, /\brank\s*[-+*/]|[-+*/]\s*\w*\.?rank\b|between\s*\(/i, `${f} computes ranks`);
  }
});

test("column widths keep their minimums and leave the middle column room", async () => {
  const { clampWidths, DEFAULTS } = await import("../web/resize.js");
  assert.deepEqual(clampWidths(DEFAULTS, 1400), DEFAULTS);
  assert.deepEqual(clampWidths({ left: 10, right: 10 }, 1400), { left: 160, right: 260 });
  const wide = clampWidths({ left: 900, right: 900 }, 1400);
  assert.ok(1400 - wide.left - wide.right - 20 >= 320, "middle column keeps 320 px");
});

test("the Board and the Docs view keep their column widths apart", async () => {
  const { loadWidths, VIEW_DEFAULTS } = await import("../web/resize.js");
  const saved = new Map([["doit.columns", JSON.stringify({ left: 300, right: 420 })]]);
  const storage = { getItem: k => saved.get(k) ?? null };
  assert.deepEqual(loadWidths("board", storage), { left: 300, right: 420 });
  assert.deepEqual(loadWidths("docs", storage), VIEW_DEFAULTS.docs);
  saved.set("doit.columns.docs", "not json");
  assert.deepEqual(loadWidths("docs", storage), VIEW_DEFAULTS.docs);
});

test("the markdown renderer shows headings, lists and checkboxes, and escapes text", async () => {
  const { renderMarkdown } = await import("../web/markdown.js");
  const html = renderMarkdown("# EPIC-1: A <b>\n\nGoal: **fast** `x`\n\n## Tasks\n\n- [x] T-1.1 Done (done when: ok)\n- [ ] T-1.2 Open\n\n1. one\n2. two\n\n```\n<script>\n```");
  assert.match(html, /<h1>EPIC-1: A &lt;b&gt;<\/h1>/);
  assert.match(html, /<strong>fast<\/strong> <code>x<\/code>/);
  assert.match(html, /<h2>Tasks<\/h2>/);
  assert.match(html, /<li class="check"><input type="checkbox" disabled checked[^>]*> T-1.1 Done/);
  assert.match(html, /<li class="check"><input type="checkbox" disabled  [^>]*> T-1.2 Open/);
  assert.match(html, /<ol><li>one<\/li><li>two<\/li><\/ol>/);
  assert.match(html, /<pre>&lt;script&gt;<\/pre>/);
  assert.doesNotMatch(html, /<script>|<b>/);
});

test("single newlines inside a paragraph become line breaks", async () => {
  const { renderMarkdown } = await import("../web/markdown.js");
  assert.equal(renderMarkdown("Status: Active\nGoal: x\n\nNext"), "<p>Status: Active<br>Goal: x</p>\n<p>Next</p>");
});

test("a pipe table renders as a table with header and body cells, keeping inline formatting and escaping", async () => {
  const { renderMarkdown } = await import("../web/markdown.js");
  const html = renderMarkdown("Intro\n| Tier | Modules |\n|---|:--:|\n| Domain | `src/domain/` and **more** |\n| <b> | a \\| b |\n\nAfter");
  assert.match(html, /<p>Intro<\/p>\n<table><thead><tr><th>Tier<\/th><th>Modules<\/th><\/tr><\/thead>/);
  assert.match(html, /<td>Domain<\/td><td><code>src\/domain\/<\/code> and <strong>more<\/strong><\/td>/);
  assert.match(html, /<td>&lt;b&gt;<\/td><td>a \| b<\/td>/);
  assert.match(html, /<\/table>\n<p>After<\/p>/);
  assert.doesNotMatch(html, /<b>/);
  assert.equal(renderMarkdown("a | b\n\ntext"), "<p>a | b</p>\n<p>text</p>");
});

test("the epic header has Close epic on an open epic and not on a completed one", async () => {
  const { S } = await import("../web/state.js");
  const { epicViewPane } = await import("../web/epicView.js");
  S.epicView = { project: "p", id: "EPIC-001", status: "Active", completed: false, text: "# EPIC-001: A" };
  assert.match(epicViewPane(""), /data-close-epic="p\/EPIC-001"[^>]*>Close epic</);
  S.epicView = { ...S.epicView, status: "Done", completed: true };
  assert.doesNotMatch(epicViewPane(""), /Close epic/);
});

test("the epic pane lists Closed epics and a folded Archived section that opens on click", async () => {
  const { S } = await import("../web/state.js");
  const { closedSections } = await import("../web/epicList.js");
  const e = (id, closed, archived) => ({ project: "p", id, name: "Name " + id, status: "Done", done: 1, total: 1, closed, archived });
  S.data = { closedEpics: [e("EPIC-003", "2026-11-19", false), e("EPIC-001", null, true), e("EPIC-002", "2026-10-01", true)] };
  S.archivedOpen = {};
  const folded = closedSections("p");
  assert.match(folded, /Closed<span class="c">1<\/span>[\s\S]*data-open-epic="p\/EPIC-003"/);
  assert.match(folded, /data-toggle-archived="p"[^>]*aria-expanded="false"[^>]*>[^<]*Archived<span class="c">2/);
  assert.doesNotMatch(folded, /data-open-epic="p\/EPIC-001"/);
  S.archivedOpen = { p: true };
  const open = closedSections("p");
  assert.match(open, /data-open-epic="p\/EPIC-001"/);
  assert.match(open, /data-open-epic="p\/EPIC-002"/);
  assert.equal(closedSections("other"), "");
});
