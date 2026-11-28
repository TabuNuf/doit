import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setup } from "./helpers.js";

test("open tasks follow epic status; ticked and completed epics stay out", t => {
  const s = setup(); t.after(s.cleanup);
  const tasks = s.board.list({ project: "game" });
  assert.deepEqual(tasks.map(x => `${x.id}:${x.state}`), ["T-009.1:todo", "T-014.2:todo", "T-014.3:todo"]);
  assert.equal(tasks[0].type, "bug");
  const epics = s.board.view({ project: "game" }).epics;
  assert.deepEqual(epics.map(e => `${e.id} ${e.done}/${e.total}`), ["EPIC-009 0/1", "EPIC-014 1/3"]);
  assert.deepEqual(s.board.view({ project: "game" }).parkedEpics.map(e => e.id), ["EPIC-016"]);
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

test("a star pins a project and comes off again", t => {
  const s = setup(); t.after(s.cleanup);
  assert.equal(s.board.starProject("game", true).starred, true);
  assert.equal(s.board.projects()[0].starred, true, "kept in settings");
  assert.equal(s.board.starProject("game", false).starred, undefined);
  assert.throws(() => s.board.starProject("nope", true), /No project nope/);
});

test("a project's kind is set, kept beside the star, and cleared; an unknown kind is refused", t => {
  const s = setup(); t.after(s.cleanup);
  assert.equal(s.board.setProjectKind("game", "Game").kind, "game");
  s.board.starProject("game", true);
  assert.deepEqual([s.board.projects()[0].kind, s.board.projects()[0].starred], ["game", true]);
  assert.equal(s.board.setProjectKind("game", "").kind, undefined);
  assert.throws(() => s.board.setProjectKind("game", "toaster"), /Kind must be game, application, podcast/);
  assert.throws(() => s.board.setProjectKind("nope", "game"), /No project nope/);
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
  assert.deepEqual(order("backlog"), ["T-014.2"]);
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

const lobbyView = s => s.board.view({ project: "game" });
const placeOf = (s, id) => {
  const v = lobbyView(s);
  if (v.epics.some(e => e.id === id)) return "open";
  if (v.parkedEpics.some(e => e.id === id)) return "parked";
  const c = v.closedEpics.find(e => e.id === id);
  return c && (c.archived ? "archived" : "completed");
};

test("parking a Planned epic files it in Parked/ and reopening files it back in Epics/", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.moveEpic("game", "EPIC-016", "open");
  assert.equal(placeOf(s, "EPIC-016"), "open");
  assert.ok(s.exists("Epics/EPIC-016-store.md") && !s.exists("Parked/EPIC-016-store.md"));
  const r = s.board.moveEpic("game", "EPIC-016", "parked");
  assert.equal(r.moved, true);
  assert.ok(s.exists("Epics/Parked/EPIC-016-store.md") && !s.exists("Epics/EPIC-016-store.md"));
  assert.match(s.read("Epics/Parked/EPIC-016-store.md"), /^Status: Parked$/m);
  assert.equal(placeOf(s, "EPIC-016"), "parked");
  s.board.moveEpic("game", "EPIC-016", "open");
  assert.match(s.read("Epics/EPIC-016-store.md"), /^Status: Planned$/m);
});

test("an Active epic is refused for Parked, and a same-place move does nothing", t => {
  const s = setup(); t.after(s.cleanup);
  assert.throws(() => s.board.moveEpic("game", "EPIC-014", "parked"), /only a Planned epic can be parked/);
  assert.ok(s.exists("Epics/EPIC-014-online-lobby.md"));
  assert.deepEqual(s.board.moveEpic("game", "EPIC-014", "open").moved, false);
  assert.deepEqual(s.board.moveEpic("game", "EPIC-016", "parked").moved, false);
  assert.throws(() => s.board.moveEpic("game", "EPIC-014", "nowhere"), /to must be one of/);
  assert.throws(() => s.board.moveEpic("game", "EPIC-099", "open"), /No epic/);
});

test("completed, archived and back: Archived line, tasks restored by their close only", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.update("game/T-014.3", { state: "archived" });
  s.board.update("game/T-014.2", { state: "done" });
  s.board.addTask({ project: "game", epic: "EPIC-014", title: "Extra" });
  const finished = s.board.get("game/T-014.2").completed;
  s.board.moveEpic("game", "EPIC-014", "completed");
  assert.equal(placeOf(s, "EPIC-014"), "completed");
  assert.doesNotMatch(s.read("Epics/Completed/EPIC-014-online-lobby.md"), /Archived:/);
  assert.equal(s.board.moveEpic("game", "EPIC-014", "completed").moved, false);

  s.board.moveEpic("game", "EPIC-014", "archived");
  assert.match(s.read("Epics/Completed/EPIC-014-online-lobby.md"), /^Closed: 2026-11-20\nArchived: 2026-11-20\n/m);
  assert.equal(placeOf(s, "EPIC-014"), "archived");
  s.board.moveEpic("game", "EPIC-014", "completed");
  assert.equal(placeOf(s, "EPIC-014"), "completed");
  s.board.moveEpic("game", "EPIC-014", "archived");

  const r = s.board.moveEpic("game", "EPIC-014", "open");
  assert.equal(r.restoredTasks, 1);
  assert.equal(placeOf(s, "EPIC-014"), "open");
  const text = s.read("Epics/EPIC-014-online-lobby.md");
  assert.match(text, /^Status: Planned$/m);
  assert.doesNotMatch(text, /Closed:|Archived:/);
  const done = s.board.get("game/T-014.2"), todo = s.board.get("game/T-014.4"), hand = s.board.get("game/T-014.3");
  assert.deepEqual([done.state, done.ticked, done.completed], ["done", true, finished]);
  assert.deepEqual([todo.state, todo.completed], ["todo", null]);
  assert.equal(hand.state, "archived");
  assert.ok(s.exists("Epics/Tasks/T-014.4.md") && !s.exists("Archive/Tasks/T-014.4.md"));
});

test("archiving an open epic closes it with both lines; an epic archived by date cannot be un-archived by line", t => {
  const s = setup(); t.after(s.cleanup);
  const r = s.board.moveEpic("game", "EPIC-014", "archived");
  assert.equal(r.archivedTasks, 0, "open tasks are hidden, not archived");
  assert.match(s.read("Epics/Completed/EPIC-014-online-lobby.md"), /^Status: Done\nClosed: 2026-11-20\nArchived: 2026-11-20\n/m);
  assert.equal(placeOf(s, "EPIC-014"), "archived");
  assert.throws(() => s.board.moveEpic("game", "EPIC-013", "completed"), /archived by date/);
  s.board.moveEpic("game", "EPIC-013", "open");
  assert.match(s.read("Epics/EPIC-013-netplay.md"), /^Status: Planned$/m);
});
test("the board view carries after on open and parked epics", t => {
  const s = setup(); t.after(s.cleanup);
  const v = s.board.view({ project: "game" });
  assert.deepEqual(v.epics.map(e => `${e.id}>${e.after}`), ["EPIC-009>EPIC-014", "EPIC-014>null"]);
  assert.deepEqual(v.parkedEpics.map(e => e.after), ["EPIC-009"]);
});

test("closing an epic waits for its open Check in play task, by close and by move", t => {
  const s = setup(); t.after(s.cleanup);
  const file = path.join(s.game, "GameDocs", "Epics", "EPIC-014-online-lobby.md");
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("- Batch A: development", "- Batch A: development\n- Check in play: T-014.3"));
  const refused = /EPIC-014 waits for T-014\.3, Check in play\. Finish it, then close\./;
  assert.throws(() => s.board.closeEpic("game", "EPIC-014"), refused);
  assert.throws(() => s.board.moveEpic("game", "EPIC-014", "completed"), refused);
  assert.throws(() => s.board.moveEpic("game", "EPIC-014", "archived"), refused);
  assert.equal(s.board.get("game/T-014.2").state, "todo", "nothing archived by a refused close");
  assert.ok(s.exists("Epics/EPIC-014-online-lobby.md") && !s.exists("Archive/Tasks/T-014.2.md"));
  s.board.update("game/T-014.3", { state: "done" });
  assert.equal(s.board.closeEpic("game", "EPIC-014"), 1);
});

test("an epic whose Check in play line says none closes as before", t => {
  const s = setup(); t.after(s.cleanup);
  const file = path.join(s.game, "GameDocs", "Epics", "EPIC-014-online-lobby.md");
  fs.writeFileSync(file, fs.readFileSync(file, "utf8") + "- Check in play: none\n");
  assert.equal(s.board.closeEpic("game", "EPIC-014"), 0);
});

test("a sibling EPIC-nnn-name.notes.md file is in no epic list, whichever folder it is in", t => {
  const s = setup(); t.after(s.cleanup);
  const root = path.join(s.game, "GameDocs", "Epics");
  const notes = (dir, n, name) => fs.writeFileSync(path.join(root, dir, `EPIC-${n}-${name}.notes.md`), `# EPIC-${n}: ${name}, notes\n\nStatus: Active\n`);
  notes("", "014", "online-lobby"); notes("Parked", "016", "store"); notes("Completed", "013", "netplay");
  const v = s.board.view({ project: "game", archived: true });
  const ids = [...v.epics, ...v.parkedEpics, ...v.closedEpics].map(e => e.id);
  assert.deepEqual(ids.sort(), ["EPIC-009", "EPIC-013", "EPIC-014", "EPIC-016"]);
  assert.ok(![...v.epics, ...v.parkedEpics, ...v.closedEpics].some(e => /notes/.test(e.title)));
});

test("open tasks of a parked epic are hidden from view and list, found by epic and get, and back after reopening", t => {
  const s = setup(); t.after(s.cleanup);
  const id = s.board.addEpic("game", "Side quest", "Planned");
  const todo = s.board.addTask({ project: "game", epic: id, title: "Sketch it", state: "todo" });
  const back = s.board.addTask({ project: "game", epic: id, title: "Later", state: "backlog" });
  s.board.moveEpic("game", id, "parked");
  const ids = () => s.board.view({ project: "game" }).tasks.map(x => x.id);
  for (const state of ["open", "active", "backlog"]) {
    assert.ok(!s.board.list({ project: "game", state }).some(x => x.epic === id), state);
  }
  assert.ok(!ids().includes(todo.id) && !ids().includes(back.id));
  assert.equal(s.board.view({ project: "game", hidden: true }).tasks.find(x => x.id === todo.id).hidden, true);
  assert.deepEqual(s.board.list({ project: "game", epic: id }).map(x => `${x.id}:${x.state}:${x.hidden}`), [`${todo.id}:todo:true`, `${back.id}:backlog:true`]);
  assert.equal(s.board.get(`game/${todo.id}`).hidden, true);
  s.board.moveEpic("game", id, "open");
  assert.ok(ids().includes(todo.id) && ids().includes(back.id));
  assert.equal(s.board.get(`game/${back.id}`).state, "backlog");
  assert.equal(s.board.get(`game/${back.id}`).hidden, false);
});

test("closing an epic archives its done tasks and hides the open ones, which come back as they were", t => {
  const s = setup(); t.after(s.cleanup);
  const id = s.board.addEpic("game", "Wrap up", "Active");
  const mk = (title, state) => s.board.addTask({ project: "game", epic: id, title, state }).id;
  const [a, b, c, d] = [mk("A", "todo"), mk("B", "todo"), mk("C", "backlog"), mk("D", "todo")];
  s.board.update(`game/${b}`, { state: "progress" });
  s.board.update(`game/${d}`, { state: "done" });
  assert.equal(s.board.closeEpic("game", id), 1);
  for (const x of [a, b, c]) {
    assert.ok(s.exists(`Epics/Tasks/${x}.md`) && !s.exists(`Archive/Tasks/${x}.md`), `${x} stays unarchived`);
    assert.equal(s.board.get(`game/${x}`).hidden, true);
  }
  assert.ok(s.exists(`Archive/Tasks/${d}.md`));
  assert.ok(!s.board.list({ project: "game" }).some(x => x.epic === id));
  s.board.moveEpic("game", id, "open");
  assert.deepEqual(s.board.list({ project: "game", epic: id }).map(x => `${x.id}:${x.state}`), [`${a}:todo`, `${b}:progress`, `${c}:backlog`]);
});

test("a hidden task whose file is moved to the archive by hand reads as archived and not hidden", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.update("game/T-016.1", { owner: "human" });
  assert.equal(s.board.get("game/T-016.1").hidden, true);
  const docs = path.join(s.game, "GameDocs"), arch = path.join(docs, "Archive", "Tasks");
  fs.mkdirSync(arch, { recursive: true });
  fs.renameSync(path.join(docs, "Epics", "Tasks", "T-016.1.md"), path.join(arch, "T-016.1.md"));
  const moved = s.board.get("game/T-016.1");
  assert.deepEqual([moved.state, moved.hidden], ["archived", false]);
  assert.ok(s.board.list({ state: "archived" }).some(x => x.id === "T-016.1"));
});
