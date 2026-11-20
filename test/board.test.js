import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setup } from "./helpers.js";

test("open tasks follow epic status; ticked and completed epics stay out", t => {
  const s = setup(); t.after(s.cleanup);
  const tasks = s.board.list({ project: "game" });
  assert.deepEqual(tasks.map(x => `${x.id}:${x.state}`), ["T-009.1:todo", "T-014.2:todo", "T-014.3:todo", "T-016.1:backlog"]);
  assert.equal(tasks[0].type, "bug");
  const epics = s.board.view({ project: "game" }).epics;
  assert.deepEqual(epics.map(e => `${e.id} ${e.done}/${e.total}`), ["EPIC-009 0/1", "EPIC-014 1/3", "EPIC-016 0/1"]);
});

test("completing ticks the epic line; reopening unticks it", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.update("game/T-014.2", { state: "done" });
  assert.match(s.read("Epics/EPIC-014-online-lobby.md"), /- \[x\] T-014.2 Host migration/);
  assert.equal(s.board.get("game/T-014.2").completed, "2026-11-20 09:00");
  s.board.update("game/T-014.2", { state: "todo" });
  assert.match(s.read("Epics/EPIC-014-online-lobby.md"), /- \[ \] T-014.2 Host migration/);
});

test("archiving moves the task file out of Tasks/ and restore brings it back", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.update("game/T-014.3", { state: "archived" });
  assert.ok(s.exists("Archive/Tasks/T-014.3.md"));
  assert.ok(!s.exists("Epics/Tasks/T-014.3.md"));
  assert.ok(!s.board.list({ project: "game" }).some(x => x.id === "T-014.3"), "archived task is not listed as open");
  assert.equal(s.board.list({ project: "game", state: "archived" }).filter(x => x.id === "T-014.3").length, 1);
  s.board.update("game/T-014.3", { state: "todo" });
  assert.ok(s.exists("Epics/Tasks/T-014.3.md"));
  assert.ok(!s.exists("Archive/Tasks/T-014.3.md"));
});

test("a passed deadline archives at the next read", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.update("game/T-014.3", { deadline: "2026-11-21" });
  s.clock.t = new Date("2026-11-22T08:00:00");
  assert.ok(!s.board.list({ project: "game" }).some(x => x.id === "T-014.3"));
  assert.match(s.board.get("game/T-014.3").archived, /Deadline passed on 2026-11-21/);
});

test("completed tasks move to the archive after the kept days", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.setKeepDays(3);
  s.board.update("game/T-014.2", { state: "done" });
  s.clock.t = new Date("2026-11-23T09:00:00");
  assert.equal(s.board.list({ project: "game", state: "done" }).length, 1);
  s.clock.t = new Date("2026-11-24T09:00:00");
  assert.equal(s.board.list({ project: "game", state: "done" }).length, 0);
  assert.match(s.board.get("game/T-014.2").archived, /kept 3 days/);
  assert.throws(() => s.board.setKeepDays(0));
});

test("a done task of a closed epic stays in Completed until the kept days pass", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.setKeepDays(3);
  s.board.update("game/T-014.2", { state: "done" });
  s.board.closeEpic("game", "EPIC-014");
  s.board.update("game/T-014.2", { state: "done" });
  const done = () => s.board.list({ project: "game", state: "done" }).map(x => x.id);
  assert.deepEqual(done(), ["T-014.2"], "untracked ticked lines of closed epics stay out");
  assert.ok(!s.board.view({ project: "game" }).epics.some(e => e.id === "EPIC-014"));
  s.clock.t = new Date("2026-11-24T09:00:00");
  assert.deepEqual(done(), []);
  assert.match(s.board.get("game/T-014.2").archived, /kept 3 days/);
});

test("a task file in Archive/ counts as archived whatever its state says", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.update("game/T-014.2", { state: "done" });
  fs.mkdirSync(path.join(s.game, "GameDocs/Archive/Tasks"), { recursive: true });
  fs.renameSync(path.join(s.game, "GameDocs/Epics/Tasks/T-014.2.md"), path.join(s.game, "GameDocs/Archive/Tasks/T-014.2.md"));
  const tasks = s.board.view({ project: "game", archived: true }).tasks;
  assert.equal(tasks.find(x => x.id === "T-014.2").state, "archived");
  assert.ok(!tasks.some(x => x.state === "done"));
});

test("adding a task appends to the epic and lands at the bottom of Active", t => {
  const s = setup(); t.after(s.cleanup);
  const added = s.board.addTask({ project: "game", epic: "EPIC-014", title: "Lobby browser", owner: "human", doneWhen: "lists lobbies" });
  assert.equal(added.id, "T-014.4");
  assert.match(s.read("Epics/EPIC-014-online-lobby.md"), /- \[ \] T-014.3 Show ping\n- \[ \] T-014.4 Lobby browser \(done when: lists lobbies\)\n/);
  const active = s.board.list({ project: "game", state: "active" });
  assert.equal(active.at(-1).id, "T-014.4");
  assert.throws(() => s.board.addTask({ project: "game", epic: "EPIC-013", title: "x" }), /No open epic/);
});

test("comments, description and owner persist in the task file", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.update("game/T-014.2", { description: "Next player becomes host.", owner: "human", rank: 1 });
  s.board.comment("game/T-014.2", "ai", "Started.");
  s.board.comment("game/T-014.2", "human", "Keep chat history.");
  const back = s.board.get("game/T-014.2");
  assert.equal(back.description, "Next player becomes host.");
  assert.equal(back.owner, "human");
  assert.deepEqual(back.comments.map(c => c.who), ["ai", "human"]);
  assert.equal(s.board.list({ project: "game" })[0].id, "T-014.2", "rank 1 sorts first");
});

test("new epic and new project", t => {
  const s = setup(); t.after(s.cleanup);
  assert.equal(s.board.addEpic("game", "Fog of war"), "EPIC-017");
  assert.ok(s.exists("Epics/EPIC-017-fog-of-war.md"));
  const p = s.board.addProject({ name: "Storm Haven", path: s.root + "/storm" });
  assert.equal(p.id, "storm-haven");
  assert.deepEqual(s.board.view({ project: "storm-haven" }).epics.map(e => e.name), ["Bugs (rolling)"]);
  assert.throws(() => s.board.addProject({ name: "Again", path: s.root + "/storm" }), /already a project/);
});

test("rejects bad input", t => {
  const s = setup(); t.after(s.cleanup);
  assert.throws(() => s.board.update("game/T-014.2", { state: "doing" }), /state must be/);
  assert.throws(() => s.board.update("game/T-014.2", { deadline: "next week" }), /YYYY-MM-DD/);
  assert.throws(() => s.board.get("game/T-099.1"), /No task/);
  assert.throws(() => s.board.list({ project: "nope" }), /No project/);
});

test("move places a task between neighbours, across sections and at the top", t => {
  const s = setup(); t.after(s.cleanup);
  const order = section => s.board.list({ project: "game", state: section }).map(x => x.id);
  assert.deepEqual(order("active"), ["T-009.1", "T-014.2", "T-014.3"]);
  s.board.move("game/T-014.3", { section: "active", before: "game/T-014.2" });
  assert.deepEqual(order("active"), ["T-009.1", "T-014.3", "T-014.2"]);
  s.board.move("game/T-009.1", { section: "active", after: "game/T-014.2" });
  assert.deepEqual(order("active"), ["T-014.3", "T-014.2", "T-009.1"]);
  s.board.move("game/T-009.1", { section: "active" });
  assert.deepEqual(order("active"), ["T-009.1", "T-014.3", "T-014.2"]);
  const moved = s.board.move("game/T-014.2", { section: "backlog" });
  assert.equal(moved.state, "backlog");
  assert.deepEqual(order("backlog"), ["T-014.2", "T-016.1"]);
  assert.throws(() => s.board.move("game/T-014.2", { section: "done" }), /section must be/);
  assert.throws(() => s.board.move("game/T-014.2", { section: "active", before: "game/T-099.1" }), /No task|not in/);
});

test("closing an epic writes the date; it is closed, then archived after the kept days; no date means archived", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.closeEpic("game", "EPIC-014");
  assert.match(s.read("Epics/Completed/EPIC-014-online-lobby.md"), /^Status: Done\nClosed: 2026-11-20\n/m);
  const find = (id) => s.board.view({ project: "game" }).closedEpics.find(e => e.id === id);
  assert.deepEqual([find("EPIC-014").closed, find("EPIC-014").archived], ["2026-11-20", false]);
  assert.equal(find("EPIC-014").total, 3);
  assert.equal(find("EPIC-013").closed, null);
  assert.equal(find("EPIC-013").archived, true);
  assert.ok(!s.board.view({ project: "game" }).epics.some(e => e.id === "EPIC-014"));
  s.clock.t = new Date("2026-12-05T09:00:00");
  assert.equal(find("EPIC-014").archived, true);
});
