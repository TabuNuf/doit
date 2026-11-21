import test from "node:test";
import assert from "node:assert/strict";
import { ContactBook } from "../src/domain/contactBook.js";

import { MemoryContacts } from "./memoryContacts.js";

const shelf = { list: () => [{ game: "bunny-bunker" }, { game: "good-box" }], has: g => ["bunny-bunker", "good-box"].includes(g) };

function book() {
  const b = new ContactBook(new MemoryContacts(), shelf, () => new Date("2026-11-21T10:00:00"));
  b.add({ name: "Ada Plays", types: ["influencer"], reach: 20000, next: "2026-11-01" });
  b.add({ name: "Bit Blog", types: ["blogger", "press"], reach: 2500, email: "bit@example.test", next: "2026-12-01" });
  b.add({ name: "Cog Con", types: ["conference"], topic: "game dev", reach: 300, next: "2026-11-21" });
  b.add({ name: "Dim Tester", types: ["tester"], status: "dormant", next: "2026-10-01" });
  b.add({ name: "Echo", types: ["influencer"], reach: 60 });
  b.setFit(1, "bunny-bunker", "plays cozy co-op");
  b.setFit(2, "good-box", "reviews puzzle games");
  b.setFit(2, "bunny-bunker", "covers indies");
  return b;
}
const names = list => list.map(c => c.name);

test("defaults and a stored contact", () => {
  const c = book().get(2);
  assert.equal(c.status, "active");
  assert.deepEqual(c.types, ["blogger", "press"]);
  assert.equal(c.fit.length, 2);
});

test("no filter lists all, due first then largest reach", () => {
  assert.deepEqual(names(book().list()), ["Ada Plays", "Cog Con", "Bit Blog", "Echo", "Dim Tester"]);
});

test("filter by type", () => {
  assert.deepEqual(names(book().list({ type: "influencer" })), ["Ada Plays", "Echo"]);
  assert.deepEqual(names(book().list({ type: "press" })), ["Bit Blog"]);
});

test("filter by game fit", () => {
  assert.deepEqual(names(book().list({ fits: "bunny-bunker" })), ["Ada Plays", "Bit Blog"]);
  assert.deepEqual(names(book().list({ fits: "good-box" })), ["Bit Blog"]);
});

test("filter by status", () => {
  assert.deepEqual(names(book().list({ status: "dormant" })), ["Dim Tester"]);
});

test("filter by reach keeps at least n; an empty reach never matches", () => {
  assert.deepEqual(names(book().list({ reach: 1000 })), ["Ada Plays", "Bit Blog"]);
  assert.deepEqual(names(book().list({ reach: "300" })), ["Ada Plays", "Cog Con", "Bit Blog"]);
  assert.deepEqual(names(book().list({ reach: 0 })), ["Ada Plays", "Cog Con", "Bit Blog", "Echo"]);
});

test("reach accepts a count with separators and empty; the sort puts empty last", () => {
  const b = book();
  assert.equal(b.add({ name: "Sep", types: ["press"], reach: "12 400" }).reach, 12400);
  assert.equal(b.add({ name: "Comma", types: ["press"], reach: "12,400" }).reach, 12400);
  assert.equal(b.add({ name: "None", types: ["press"], reach: "" }).reach, null);
  assert.deepEqual(names(b.list({ reach: 12000 })), ["Ada Plays", "Comma", "Sep"]);
  assert.equal(names(b.list()).at(-1), "None");
});

test("due: active, next contact on or before today; dormant never", () => {
  const due = book().list({ due: true });
  assert.deepEqual(names(due), ["Ada Plays", "Cog Con"]);
  assert.ok(due.every(c => c.due));
});

test("filters combine", () => {
  assert.deepEqual(names(book().list({ type: "influencer", due: true })), ["Ada Plays"]);
});

test("refuses an unknown type, reach, status, channel kind, date and touch kind", () => {
  const b = book();
  assert.throws(() => b.add({ name: "X", types: ["wizard"] }), /Unknown type/);
  assert.throws(() => b.add({ name: "X", types: [] }), /at least one type/);
  assert.throws(() => b.add({ name: "X", types: ["press"], reach: -1 }), /Reach must be/);
  for (const bad of [1.5, "1.5", "abc", "B", true, -3]) assert.throws(() => b.add({ name: "X", types: ["press"], reach: bad }), /Reach must be/);
  assert.throws(() => b.add({ name: "X", types: ["press"], status: "gone" }), /Unknown status/);
  assert.throws(() => b.add({ name: "X", types: ["press"], channels: [{ kind: "myspace", url: "u" }] }), /Unknown channel kind/);
  assert.throws(() => b.add({ name: "X", types: ["press"], next: "soon" }), /YYYY-MM-DD/);
  assert.throws(() => b.add({ name: "", types: ["press"] }), /needs a name/);
  assert.throws(() => b.list({ type: "wizard" }), /Unknown type/);
  assert.throws(() => b.list({ reach: "Z+" }), /Reach must be/);
  assert.throws(() => b.addTouch(1, { kind: "call" }), /Unknown touch kind/);
});

test("update checks the whole contact and keeps fit", () => {
  const b = book();
  const c = b.update(1, { status: "dormant", notes: "moved on" });
  assert.equal(c.status, "dormant");
  assert.equal(c.fit.length, 1);
  assert.throws(() => b.update(1, { reach: "Q" }), /Reach must be/);
  assert.equal(b.get(1).reach, 20000);
  assert.throws(() => b.get(99), /No contact 99/);
});

test("fit needs a profile and a reason; a second fit to a game replaces the reason", () => {
  const b = book();
  assert.throws(() => b.setFit(1, "no-such-game", "why"), /No profile/);
  assert.throws(() => b.setFit(1, "good-box", " "), /needs a reason/);
  b.setFit(2, "good-box", "newer reason");
  assert.deepEqual(b.get(2).fit.filter(f => f.game === "good-box"), [{ game: "good-box", reason: "newer reason" }]);
});

test("touch defaults to today and may name a game with a profile", () => {
  const b = book();
  const c = b.addTouch(1, { kind: "mail", game: "good-box" });
  assert.deepEqual(c.touches[0], { date: "2026-11-21", kind: "mail", game: "good-box" });
  assert.throws(() => b.addTouch(1, { kind: "mail", game: "nope" }), /No profile/);
  assert.equal(b.addTouch(1, { kind: "reply", date: "2026-11-02" }).touches.length, 2);
});
