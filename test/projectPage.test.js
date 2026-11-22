// The project page: cards, Waiting on you, the left pane's name button and the default page.
import test from "node:test";
import assert from "node:assert/strict";
import { S } from "../web/state.js";
import { projectPage, waiting, pageProject, buildOrder, parseShort } from "../web/projectPage.js";
import { leftPane } from "../web/leftPane.js";

const t = (id, o = {}) => ({ project: "g", id, epic: "EPIC-001", title: id, state: "todo", owner: "ai", blocks: null, ...o });
const data = {
  projects: [{ id: "g", name: "Game", kind: "game" }, { id: "h", name: "Other" }],
  epics: [
    { project: "g", id: "EPIC-001", name: "Build", status: "Active", done: 1, total: 4 },
    { project: "g", id: "EPIC-002", name: "Next", status: "Planned", done: 0, total: 0 },
    { project: "h", id: "EPIC-001", name: "Else", status: "Active", done: 0, total: 1 }],
  parkedEpics: [{ project: "g", id: "EPIC-003", name: "Later" }, { project: "g", id: "EPIC-004", name: "Later2" }],
  closedEpics: [],
  tasks: [t("T-001.1", { state: "done" }), t("T-001.2", { blocks: "T-001.3" }), t("T-001.3", { owner: "human" }),
    t("T-001.4", { owner: "human" }), t("T-002.1", { owner: "human", epic: "EPIC-002" }), t("T-001.9", { owner: "human", project: "h" })],
};

test("the cards and the waiting list hold the counts; a blocked designer task is not waiting", () => {
  assert.deepEqual(waiting("g", data).map(x => x.id), ["T-001.4", "T-002.1"]);
  const h = projectPage(data.projects[0], data);
  assert.match(h, /PROJECT · g · game/);
  assert.match(h, /<b>Build<\/b>[^]*EPIC-001 · 1 of 4 done/);
  assert.match(h, /<b>2<\/b><span>tasks in 2 epics/);
  assert.match(h, /<b>1<\/b><span>epic · 2 parked/);
  assert.equal((h.match(/class="pp-row" data-id=/g) || []).length, 2);
  assert.doesNotMatch(h, /T-001\.3<\/span>/);
});

test("no active epic reads None active", () => {
  assert.match(projectPage(data.projects[0], { ...data, epics: [] }), /None active/);
});

test("the left pane renders the name as a button", () => {
  Object.assign(S, { data, project: "all" });
  S.docs.trees = { g: [], h: [] };
  assert.match(leftPane(), /<button class="pname" data-project-page="g"[^>]*>Game<\/button>/);
});

test("one selected project with nothing chosen shows its page; all projects does not", () => {
  Object.assign(S, { data, project: "g", projectPage: null });
  assert.equal(pageProject().id, "g");
  S.project = "all";
  assert.equal(pageProject(), null);
  S.projectPage = "h";
  assert.equal(pageProject().id, "h");
});

const e = (id, o = {}) => ({ project: "g", id, name: id, status: "Planned", done: 0, total: 2, after: null, ...o });
const order = { epics: [e("EPIC-001", { status: "Active" }), e("EPIC-002"), e("EPIC-003", { after: "EPIC-001" }), e("EPIC-004", { after: "EPIC-001" }), e("EPIC-005", { total: 0 }), e("EPIC-006")], parkedEpics: [] };

test("build order: Active first, Order lines place epics after theirs, epics without tasks last", () => {
  assert.deepEqual(buildOrder("g", order).map(x => x.id), ["EPIC-001", "EPIC-003", "EPIC-004", "EPIC-002", "EPIC-006", "EPIC-005"]);
  const h = projectPage(data.projects[0], { ...data, epics: order.epics });
  assert.match(h, /EPIC-005<\/span><b>EPIC-005<\/b>[^]*no tasks/);
  assert.match(h, /data-open-epic="g\/EPIC-003"/);
});

test("the parked row is folded to names, then one row each", () => {
  S.ppParkedOpen = {};
  S.docs.trees = {};
  let h = projectPage(data.projects[0], data);
  assert.match(h, /aria-expanded="false"[^]*Later, Later2/);
  assert.doesNotMatch(h, /data-open-epic="g\/EPIC-003"/);
  S.ppParkedOpen = { g: true };
  h = projectPage(data.projects[0], data);
  assert.match(h, /data-open-epic="g\/EPIC-003"[^]*data-open-epic="g\/EPIC-004"/);
});

test("one document link per document that exists", () => {
  S.docs.trees = { g: [{ type: "folder", name: "Design", path: "Design", children: [{ type: "file", name: "Design.md", path: "Design/Design.md" }] },
    { type: "file", name: "Architecture.md", path: "Architecture.md" }] };
  const h = projectPage(data.projects[0], data);
  assert.equal((h.match(/data-doc="/g) || []).length, 2);
  assert.match(h, /data-doc="Design\/Design.md" data-doc-project="g"/);
  assert.doesNotMatch(h, /Playtest/);
});

test("In short and Now testing are read from the design doc text", () => {
  assert.deepEqual(parseShort("# X\n\nIn short: A game.\nNow testing: the farm\nIn short: second"), { inShort: "A game.", nowTesting: "the farm" });
  S.pp = { g: { inShort: "A game.", nowTesting: "the farm" } };
  assert.match(projectPage(data.projects[0], data), /A game\.[^]*Now testing<\/b> the farm/);
  S.pp = { g: parseShort("") };
  assert.match(projectPage(data.projects[0], data), /No In short line yet/);
});
