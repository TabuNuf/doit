// Campaign lines, the task contact field and the touch logged when a contact task is done.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ContactBook } from "../src/domain/contactBook.js";
import { Outreach } from "../src/domain/outreach.js";
import { parseEpic, parseTaskFile, formatTaskFile } from "../src/store/markdown.js";
import { setup } from "./helpers.js";
import { MemoryContacts } from "./memoryContacts.js";

const shelf = { list: () => [{ game: "bunny-bunker" }], has: g => g === "bunny-bunker" };

function world(t) {
  const s = setup(); t.after(s.cleanup);
  const book = new ContactBook(new MemoryContacts(), shelf, () => new Date("2026-11-20T09:00:00"));
  book.add({ name: "Ada Plays", types: ["influencer"], reach: 20000 });
  const outreach = new Outreach(s.board, book, () => s.clock.t);
  s.board.subscribe(f => outreach.taskDone(f));
  const epic = s.board.addEpic("game", "Next Fest", { status: "Active", game: "bunny-bunker", event: "2027-02-01" });
  return { ...s, book, epic };
}

test("an epic file carries Game and Event under Status and the board exposes them", t => {
  const w = world(t);
  assert.match(w.read("Epics/EPIC-017-next-fest.md"), /Status: Active\nGame: bunny-bunker\nEvent: 2027-02-01\nGoal:/);
  const e = w.board.view({ project: "game" }).epics.find(x => x.id === w.epic);
  assert.equal(e.game, "bunny-bunker");
  assert.equal(e.event, "2027-02-01");
  assert.equal(w.board.view({ project: "game" }).epics.find(x => x.id === "EPIC-014").game, null);
  const parsed = parseEpic("# EPIC-001: X\n\nStatus: Done\nClosed: 2026-01-01\nGame: good-box\n\n## Tasks\n");
  assert.equal(parsed.game, "good-box");
  assert.equal(parsed.event, null);
});

test("a task carries its epic's game and a contact id that survives a round trip", t => {
  const w = world(t);
  const task = w.board.addTask({ project: "game", epic: w.epic, title: "Mail Ada", contact: "1" });
  assert.equal(task.contact, 1);
  assert.equal(w.board.get(`game/${task.id}`).game, "bunny-bunker");
  assert.equal(w.board.get("game/T-014.2").game, null);
  assert.equal(w.board.get("game/T-014.2").contact, null);
  assert.equal(parseTaskFile(formatTaskFile(w.board.get(`game/${task.id}`))).contact, 1);
});

test("update accepts a whole-number contact, clears it and refuses the rest", t => {
  const w = world(t);
  w.board.update("game/T-014.2", { contact: 3 });
  assert.equal(w.board.get("game/T-014.2").contact, 3);
  w.board.update("game/T-014.2", { contact: "" });
  assert.equal(w.board.get("game/T-014.2").contact, null);
  for (const bad of ["abc", 1.5, 0, -2]) assert.throws(() => w.board.update("game/T-014.2", { contact: bad }), /contact/i);
  assert.throws(() => w.board.addTask({ project: "game", epic: w.epic, title: "x", contact: "ada" }), /contact/i);
});

test("completing a contact task logs a touch for the campaign's game; a re-tick logs once", t => {
  const w = world(t);
  const { id } = w.board.addTask({ project: "game", epic: w.epic, title: "Reach out to Ada Plays", contact: 1 });
  const ref = `game/${id}`;
  w.board.update(ref, { state: "done" });
  let touches = w.book.get(1).touches;
  assert.equal(touches.length, 1);
  assert.deepEqual([touches[0].kind, touches[0].game, touches[0].date], ["mail", "bunny-bunker", "2026-11-20"]);
  assert.equal(touches[0].note, `${w.epic}: Reach out to Ada Plays`);
  w.board.update(ref, { state: "todo" });
  w.board.update(ref, { state: "done" });
  assert.equal(w.book.get(1).touches.length, 1);
});

test("a task without a contact, or with a missing one, logs nothing and throws nothing", t => {
  const w = world(t);
  w.board.update("game/T-014.2", { state: "done" });
  const { id } = w.board.addTask({ project: "game", epic: w.epic, title: "Ghost", contact: 99 });
  assert.doesNotThrow(() => w.board.update(`game/${id}`, { state: "done" }));
  assert.equal(w.book.get(1).touches.length, 0);
});

test("a fact has plain values and an unsubscribed listener hears nothing", t => {
  const w = world(t);
  const heard = [];
  const off = w.board.subscribe(f => heard.push(f));
  const { id } = w.board.addTask({ project: "game", epic: w.epic, title: "Mail Ada", contact: 1 });
  w.board.update(`game/${id}`, { state: "done" });
  assert.deepEqual(heard[0], { ref: `game/${id}`, project: "game", epic: w.epic, title: "Mail Ada", contact: 1, game: "bunny-bunker", date: "2026-11-20" });
  off();
  w.board.update(`game/${id}`, { state: "todo" });
  w.board.update(`game/${id}`, { state: "done" });
  assert.equal(heard.length, 1);
});

test("a game with no profile logs the touch without the game", t => {
  const w = world(t);
  w.book.shelf = { list: () => [], has: () => false };
  const { id } = w.board.addTask({ project: "game", epic: w.epic, title: "Mail Ada", contact: 1 });
  w.board.update(`game/${id}`, { state: "done" });
  assert.equal(w.book.get(1).touches[0].game, "");
});

test("a touch for an unknown contact is skipped; any other failure reaches the log", t => {
  const w = world(t);
  const logged = () => (fs.existsSync(path.join(w.home, "activity.log")) ? fs.readFileSync(path.join(w.home, "activity.log"), "utf8") : "");
  const { id } = w.board.addTask({ project: "game", epic: w.epic, title: "Mail nobody", contact: 99 });
  w.board.update(`game/${id}`, { state: "done" });
  assert.doesNotMatch(logged(), /follow-up failed/, "unknown contact: skipped quietly");
  w.book.source.addTouch = () => { throw new Error("disk full"); };
  const second = w.board.addTask({ project: "game", epic: w.epic, title: "Mail Ada", contact: 1 });
  w.board.update(`game/${second.id}`, { state: "done" });
  assert.match(logged(), /follow-up failed: disk full/);
});
