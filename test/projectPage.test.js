// The project page: cards, Waiting on you, the left pane's name button and the default page.
import test from "node:test";
import assert from "node:assert/strict";
import { S } from "../web/state.js";
import { projectPage, waiting, pageProject } from "../web/projectPage.js";
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
  assert.equal((h.match(/class="pp-row"/g) || []).length, 2);
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
