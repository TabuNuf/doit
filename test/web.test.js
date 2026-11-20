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

test("the epic pane has Parked, Completed and Archived sections, folded until their header is clicked", async () => {
  const { S } = await import("../web/state.js");
  const { epicSections, toggleFold } = await import("../web/epicList.js");
  const e = (id, extra) => ({ project: "p", id, name: "Name " + id, status: "Done", done: 1, total: 1, ...extra });
  S.data = { epics: [e("EPIC-010", { status: "Active" })], parkedEpics: [e("EPIC-009", { status: "Parked" })],
    closedEpics: [e("EPIC-003", { closed: "2026-11-19", archived: false }), e("EPIC-001", { archived: true }), e("EPIC-002", { archived: true })] };
  S.epicFold = {};
  const body = (html, sec) => html.split(`data-drop-epic="${sec}"`)[1].split('class="sec-body"')[1];
  const folded = epicSections("p");
  const heads = [...folded.matchAll(/data-drop-epic="(\w+)"[^>]*aria-expanded="(\w+)">[^<]*? (\w+)<span class="c">(\d+)/g)].map(m => m.slice(1).join(","));
  assert.deepEqual(heads, ["parked,false,Parked,1", "completed,false,Completed,1", "archived,false,Archived,2"]);
  for (const sec of ["parked", "completed", "archived"]) assert.match(body(folded, sec), /^ hidden>/);
  assert.doesNotMatch(folded, /EPIC-010/);
  toggleFold("p", "parked");
  assert.match(body(epicSections("p"), "parked"), /^>[\s\S]*draggable="true"[\s\S]*data-open-epic="p\/EPIC-009"/);
  toggleFold("p", "completed"); toggleFold("p", "archived");
  const open = epicSections("p");
  assert.match(body(open, "completed"), /^>[\s\S]*EPIC-003/);
  assert.match(body(open, "archived"), /^>[\s\S]*EPIC-001[\s\S]*EPIC-002/);
  assert.match(epicSections("other"), /Parked<span class="c">0/);
});

test("dropping an epic calls the move API, and asks first for Completed and Archived", async () => {
  const { S } = await import("../web/state.js");
  const { dropEpic } = await import("../web/epicMove.js");
  const calls = [], asked = [];
  globalThis.document = { querySelector: () => ({ textContent: "", hidden: true }) };
  globalThis.fetch = async (path, o) => { calls.push([o.method, path, o.body]); return { ok: true, json: async () => ({ moved: true, projects: [], tasks: [], epics: [] }) }; };
  S.project = "all"; S.tab = "open";
  let answer = true;
  globalThis.confirm = m => { asked.push(m); return answer; };
  for (const to of ["parked", "open", "completed", "archived"]) await dropEpic("p/EPIC-007", to);
  const moves = calls.filter(c => c[0] === "POST");
  assert.deepEqual(moves.map(c => [c[1], c[2]]), ["parked", "open", "completed", "archived"].map(to => ["/api/epics/p/EPIC-007/move", JSON.stringify({ to })]));
  assert.equal(asked.length, 2);
  assert.match(asked[0], /EPIC-007.*Completed/);
  assert.match(asked[1], /EPIC-007.*Archived/);
  answer = false; calls.length = 0;
  await dropEpic("p/EPIC-007", "archived");
  assert.equal(calls.length, 0);
});

test("a click on an epic section header is not taken by the Docs view, which reads the click first", async () => {
  const { S } = await import("../web/state.js");
  const { epicSections } = await import("../web/epicList.js");
  S.data = { epics: [], parkedEpics: [], closedEpics: [] };
  const header = epicSections("p").match(/<button class="sub-h[^>]*>/)[0];
  const keys = [...header.matchAll(/data-([\w-]+)=/g)].map(m => m[1].replace(/-(\w)/g, (_, c) => c.toUpperCase()));
  const src = fs.readFileSync(path.join(WEB, "docsView.js"), "utf8");
  const click = src.slice(src.indexOf("export function docsClick"), src.indexOf("\n}\n", src.indexOf("export function docsClick")));
  const docs = new Set([...click.matchAll(/\bd\.(\w+)/g)].map(m => m[1]));
  assert.deepEqual(keys.filter(k => docs.has(k)), []);
});
