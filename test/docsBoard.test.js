// Docs on the Board: the Epics and Docs parts, the tree in the left pane and the document layout.
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
    const json = path.startsWith("/api/docs/tree") ? TREE : path.startsWith("/api/docs/file") ? { text: "# Design", lastChange: null } : path.startsWith("/api/docs/linked") ? [TASK] : path.startsWith("/api/profiles") ? []
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

test("the left pane shows an Epics headline over the epics and a Docs headline over the tree, divided by a rule, with no toggles", async t => {
  const { els, render, docs, panes } = await setup(t);
  render();
  assert.doesNotMatch(panes(), /data-pane=|pane-toggles/);
  assert.match(panes(), /Epics<\/div>[\s\S]*First epic[\s\S]*<hr class="part-rule">\s*<div class="part-h">Docs<\/div>/);
  assert.doesNotMatch(panes(), /data-doc=/, "trees load after the board");
  await docs.refreshDocs();
  const both = panes();
  assert.ok(both.indexOf("Epics</div>") < both.indexOf("First epic") && both.indexOf("First epic") < both.indexOf("part-rule") && both.indexOf("part-rule") < both.indexOf("Design.md"), "the tree is under the epics");
  assert.equal(both.split('data-doc="Design.md"').length - 1, 2, "each project shows its own tree");
  assert.doesNotMatch(els.get("#views").innerHTML, /Docs|data-view="docs"/);
  assert.match(els.get("#views").innerHTML, /data-view="board".*data-view="claude"/s);
});

test("opening a doc gives the document the wide layout with Edit and Linked; choosing a task brings the task layout back", async t => {
  const { S, render, docs, panes } = await setup(t);
  await docs.refreshDocs();
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

test("the gear beside a project opens its settings in place with Board selected; a second click or a task brings the task layout back; no Settings button", async t => {
  const { S, els, render, panes } = await setup(t);
  const { settingsClick } = await import("../web/projectSettings.js");
  S.project = "a";
  render();
  assert.match(panes(), /Alpha<button class="gear" data-settings="a" aria-pressed="false"/);
  assert.doesNotMatch(els.get("#views").innerHTML, /Settings|data-settings/);
  settingsClick({ settings: "a" });
  await flush();
  assert.equal(S.view, "board");
  assert.match(els.get("#views").innerHTML, /aria-pressed="true" data-view="board"/);
  assert.match(panes(), /aria-label="Project settings"[\s\S]*aria-label="Marketing profile"/);
  assert.match(panes(), /data-settings="a" aria-pressed="true"/);
  settingsClick({ settings: "a" });
  render();
  assert.match(panes(), /id="list"/);
  settingsClick({ settings: "a" });
  await flush();
  S.settings.open = false; // events.js closes them on a task, epic or project pick
  render();
  assert.match(panes(), />Detail</);
  assert.doesNotMatch(els.get("#views").innerHTML, /Settings/);
});
