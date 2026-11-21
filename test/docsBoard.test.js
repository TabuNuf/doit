// Docs on the Board: the Epics and Docs toggles, the tree in the left pane and the document layout.
import test from "node:test";
import assert from "node:assert/strict";

/** A page stand-in: each selector gets one element whose innerHTML render() fills. */
function fakePage() {
  const els = new Map();
  const el = sel => { if (!els.has(sel)) els.set(sel, { innerHTML: "", style: { setProperty() {} }, querySelectorAll: () => [], classList: { toggle() {} }, setAttribute() {} }); return els.get(sel); };
  globalThis.document = { querySelector: el, getElementById: id => el("#" + id), documentElement: el("html"), querySelectorAll: () => [] };
  return els;
}

const TREE = [{ type: "file", name: "Design.md", path: "Design.md" }, { type: "folder", name: "Specs", path: "Specs", folded: false, children: [{ type: "file", name: "Net.md", path: "Specs/Net.md" }] }];
const EPIC = { project: "a", id: "EPIC-001", name: "First epic", status: "Active", done: 0, total: 1 };
const TASK = { project: "a", id: "T-001.1", epic: "EPIC-001", epicName: "First epic", title: "Write it", state: "todo", owner: "ai", type: "task", description: "", doneWhen: "", comments: [] };
const flush = () => new Promise(r => setTimeout(r, 5));

async function setup(t) {
  const els = fakePage();
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  globalThis.fetch = async path => {
    const json = path.startsWith("/api/docs/tree") ? TREE : path.startsWith("/api/docs/file") ? { text: "# Design", lastChange: null } : path.startsWith("/api/docs/linked") ? [TASK]
      : { projects: [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }], epics: [EPIC], tasks: [TASK], parkedEpics: [], closedEpics: [], settings: { keepCompletedDays: 14 } };
    return { ok: true, json: async () => json };
  };
  t.after(() => { delete globalThis.document; delete globalThis.fetch; delete globalThis.localStorage; });
  const state = await import("../web/state.js");
  const { render } = await import("../web/render.js");
  const docs = await import("../web/docsView.js");
  state.S.data = { projects: [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }], epics: [EPIC], tasks: [TASK], parkedEpics: [], closedEpics: [] };
  Object.assign(state.S, { view: "board", project: "all", epic: null, sel: null });
  Object.assign(state.S.docs, { show: {}, trees: {}, active: false, path: null, doc: null, open: {} });
  state.setRenderer(render);
  return { S: state.S, els, render, docs, panes: () => els.get("#panes").innerHTML };
}

test("Docs shows a project's tree under its epics, Epics off leaves the tree, and the top bar has no Docs button", async t => {
  const { S, els, render, docs, panes } = await setup(t);
  render();
  assert.doesNotMatch(panes(), /data-doc=/);
  assert.match(panes(), /data-pane="docs" data-pane-p="a"/);
  assert.doesNotMatch(els.get("#views").innerHTML, /Docs|data-view="docs"/);
  assert.match(els.get("#views").innerHTML, /data-view="board".*data-view="claude"/s);

  docs.docsClick({ pane: "docs", paneP: "a" });
  await flush();
  const both = panes();
  assert.ok(both.indexOf("First epic") > 0 && both.indexOf("First epic") < both.indexOf("Design.md"), "the tree is under the epics");
  assert.equal(both.split('data-doc="Design.md"').length - 1, 1, "only project a has Docs on");

  docs.docsClick({ pane: "epics", paneP: "a" });
  await flush();
  assert.doesNotMatch(panes(), /First epic/);
  assert.match(panes(), /data-doc="Specs\/Net.md"/);
  assert.match(panes(), /data-pane-p="b"/, "project b keeps its own toggles");
  assert.ok(S.docs.show.a.docs && !S.docs.show.a.epics);
});

test("the Epics and Docs choice is kept per project and read back from storage", async t => {
  const { S, docs, render } = await setup(t);
  docs.docsClick({ pane: "docs", paneP: "a" });
  docs.docsClick({ pane: "epics", paneP: "a" });
  await flush();
  S.docs.show = {}; // a new page load
  assert.deepEqual(docs.paneShow("a"), { epics: false, docs: true });
  assert.deepEqual(docs.paneShow("b"), { epics: true, docs: false });
  localStorage.setItem("doit.show.b", "not json");
  S.docs.show = {};
  assert.deepEqual(docs.paneShow("b"), { epics: true, docs: false });
  render();
});

test("opening a doc gives the document the wide layout with Edit and Linked; choosing a task brings the task layout back", async t => {
  const { S, render, docs, panes } = await setup(t);
  docs.docsClick({ pane: "docs", paneP: "a" });
  await flush();
  render();
  assert.match(panes(), /id="list"/, "the task list before a doc is opened");

  docs.docsClick({ doc: "Design.md", docProject: "a" });
  await flush();
  const wide = panes();
  assert.match(wide, /aria-label="Document"/);
  assert.match(wide, /data-doc-edit/);
  assert.match(wide, /aria-label="Linked"/);
  assert.match(wide, /data-linked="a\/T-001.1"/);
  assert.match(wide, /data-doc="Design.md"[^>]*>|aria-pressed="true" data-doc="Design.md"/, "the tree stays in the left pane");
  assert.doesNotMatch(wide, /id="list"|aria-label="Detail"|>Detail</, "no task list or Detail pane");

  docs.docsClick({ pane: "docs", paneP: "b" }); // a toggle keeps the document layout
  assert.equal(S.docs.active, true);

  docs.docsLeave({ openEpic: "a/EPIC-001" });
  render();
  assert.match(panes(), /id="list"/);
  assert.match(panes(), />Detail</);
  assert.doesNotMatch(panes(), /data-doc-edit/);

  docs.docsClick({ doc: "Design.md", docProject: "a" });
  await flush();
  docs.docsClick({ linked: "a/T-001.1" }); // a task in Linked
  await flush();
  assert.equal(S.docs.active, false);
  assert.equal(S.sel, "a/T-001.1");
  assert.match(panes(), /id="list"/);
});

test("the document layout keeps its column widths apart from the task layout", async () => {
  const { loadWidths, VIEW_DEFAULTS } = await import("../web/resize.js");
  const storage = { getItem: k => k === "doit.columns.docs" ? JSON.stringify({ left: 200, right: 500 }) : JSON.stringify({ left: 300, right: 400 }) };
  assert.deepEqual(loadWidths("docs", storage), { left: 200, right: 500 });
  assert.deepEqual(loadWidths("board", storage), { left: 300, right: 400 });
  assert.notDeepEqual(VIEW_DEFAULTS.docs, VIEW_DEFAULTS.board);
});
