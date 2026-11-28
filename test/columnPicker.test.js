// T-032: the shared column picker, and the lists that use it.
import test from "node:test";
import assert from "node:assert/strict";
import { visibleColumns, gridTemplate, toggleColumn, columnMenu, hiddenIds, headerRow } from "../web/columnPicker.js";

const COLS = [{ id: "a", label: "A", width: "minmax(8em, 2fr)" }, { id: "b", label: "B", width: "5em" }, { id: "c", label: "C", width: "4em" }];
const fake = (init = {}) => { const m = { ...init }; return { getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, m }; };
const ids = cols => cols.map(c => c.id);

test("visible columns follow the saved choice, and every column shows with none", () => {
  assert.deepEqual(ids(visibleColumns("l", COLS, fake())), ["a", "b", "c"]);
  assert.deepEqual(ids(visibleColumns("l", COLS, fake({ "doit.columns.l": '["b"]' }))), ["a", "c"]);
});

test("the first column cannot be hidden, even when storage says so, or through toggle", () => {
  const st = fake({ "doit.columns.l": '["a","c"]' });
  assert.deepEqual(ids(visibleColumns("l", COLS, st)), ["a", "b"]);
  toggleColumn("l", COLS, "a", st);
  assert.deepEqual(hiddenIds("l", st), ["a", "c"]);
  assert.match(columnMenu("l", COLS, st), /data-col="a" checked disabled/);
});

test("the grid template is the shown widths in order", () => {
  assert.equal(gridTemplate(visibleColumns("l", COLS, fake({ "doit.columns.l": '["b"]' }))), "minmax(8em, 2fr) 4em");
});

test("unreadable or missing storage shows all columns", () => {
  assert.deepEqual(ids(visibleColumns("l", COLS, fake({ "doit.columns.l": "{not json" }))), ["a", "b", "c"]);
  assert.deepEqual(ids(visibleColumns("l", COLS, { getItem() { throw new Error("off"); } })), ["a", "b", "c"]);
  assert.deepEqual(ids(visibleColumns("l", COLS, null)), ["a", "b", "c"]);
});

test("toggle saves and toggles back; the header has the corner button and the dropdown when open", () => {
  const st = fake();
  assert.deepEqual(ids(toggleColumn("l", COLS, "b", st)), ["a", "c"]);
  assert.equal(st.m["doit.columns.l"], '["b"]');
  assert.deepEqual(ids(toggleColumn("l", COLS, "b", st)), ["a", "b", "c"]);
  const h = open => headerRow({ list: "l", columns: COLS, cls: "x", open, cell: c => `<i>${c.label}</i>`, storage: st });
  assert.match(h(false), /data-col-menu="l" title="Columns"/);
  assert.ok(!h(false).includes("col-menu\""));
  assert.equal((h(true).match(/type="checkbox"/g) || []).length, 3);
});

async function withStorage(init, fn) {
  const st = fake(init);
  globalThis.localStorage = st;
  try { return await fn(); } finally { delete globalThis.localStorage; }
}

test("unticking Genre drops it from the Games header and rows; the sort stays", async () => {
  const { gameHeaderRow, gameCells } = await import("../web/gameColumns.js");
  const { gameRow } = await import("../web/gamesTab.js");
  const e = { key: "a", title: "A", genres: ["roguelike"], scales: ["indie"], stores: {}, rating: null, ratingLabel: "", reviews: null, estimates: { sales: null }, coverage: { count: 0, reach: 0 }, comps: [] };
  await withStorage({}, () => {
    assert.match(gameHeaderRow(null), /data-gm-sort="genre"/);
    assert.match(gameHeaderRow(null), /data-col-menu="games"/);
    assert.match(gameCells(e), /roguelike/);
  });
  await withStorage({ "doit.columns.games": '["genre"]' }, () => {
    const head = gameHeaderRow({ key: "genre", dir: "asc" });
    assert.ok(!head.includes('data-gm-sort="genre"'));
    assert.ok(!gameCells(e).includes("roguelike"));
    assert.ok(!gameRow(e, null).includes("roguelike"));
    assert.match(gameRow(e, null), /grid-template-columns: minmax\(8em, 2fr\) 5em 4em/);
  });
  const { orderGames } = await import("../web/gameColumns.js");
  const b = { ...e, key: "b", title: "B", genres: ["action"] };
  assert.deepEqual(orderGames([e, b], { key: "genre", dir: "asc" }).map(x => x.key), ["b", "a"]);
});

test("unticking Genre does not touch Contacts; unticking Reach drops it from the header and rows", async () => {
  const { headerRow: head, rowCells } = await import("../web/contactColumns.js");
  const { contactRow } = await import("../web/marketingView.js");
  const c = { id: 1, name: "Ada", types: ["press"], reach: 5000, status: "active", next: "", due: false, last: "", fit: [] };
  await withStorage({ "doit.columns.contacts": '["reach","type"]' }, () => {
    assert.ok(!head(null).includes('data-mk-sort="reach"'));
    assert.match(head(null), /data-mk-sort="status"/);
    assert.match(head(null), /data-col-menu="contacts"/);
    assert.ok(!contactRow(c, null).includes("5k"));
    assert.equal((rowCells(c).match(/<span class="(title|pill|mono|muted)/g) || []).length > 0, true);
  });
});

test("the epic task table hides Who or Model and effort when unticked, and Task stays", async () => {
  const { tasksTable } = await import("../web/epicParts.js");
  const t = [{ project: "p", id: "T-1.1", title: "Do it", owner: "ai", model: "Opus", effort: "high", state: "todo" }];
  await withStorage({}, () => {
    const h = tasksTable(t, () => "");
    for (const w of ["Task", "Title", "Who", "Model and effort"]) assert.ok(h.includes(`${w}</th>`), w);
    assert.match(h, /data-col-menu="epic-tasks"/);
  });
  await withStorage({ "doit.columns.epic-tasks": '["task","who","model"]' }, () => {
    const h = tasksTable(t, () => "");
    assert.match(h, /Task<\/th>/);
    assert.ok(!h.includes("Who</th>") && !h.includes("Model and effort</th>"));
    assert.ok(!h.includes("Opus"));
    assert.match(h, /T-1\.1/);
  });
});
