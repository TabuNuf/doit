import test from "node:test";
import assert from "node:assert/strict";
import { makeContact, ContactError } from "../src/domain/contacts.js";
import { checkEvent, daysLeft } from "../src/domain/events.js";

test("an event gets defaults and clean lists", () => {
  const e = checkEvent({ year: "2027", deadline: "2027-01-10", where: "Steam", criteria: { genres: "Puzzle, puzzle, Co-op", stages: ["Demo"] } });
  assert.deepEqual(e, {
    year: 2027, starts: "", ends: "", deadline: "2027-01-10", cost: "", where: "steam",
    criteria: { genres: ["puzzle", "co-op"], stages: ["demo"], platforms: [] }, state: "watching",
  });
});

test("an unknown where, stage or state, a bad date or year is refused", () => {
  assert.throws(() => checkEvent({ year: 2027, where: "moon" }), ContactError);
  assert.throws(() => checkEvent({ year: 2027, criteria: { stages: ["beta"] } }), /stage/);
  assert.throws(() => checkEvent({ year: 2027, state: "won" }), /watching state/);
  assert.throws(() => checkEvent({ year: 2027, deadline: "2027-02-30" }), /YYYY-MM-DD/);
  assert.throws(() => checkEvent({ year: 2027, starts: "2027-06-02", ends: "2027-06-01" }), /before/);
  assert.throws(() => checkEvent({ year: "next" }), /year/);
});

test("only a festival or conference may have an event", () => {
  assert.equal(makeContact({ name: "A", types: ["influencer"] }).event, null);
  assert.throws(() => makeContact({ name: "A", types: ["influencer"], event: { year: 2027 } }), /Only a festival/);
  assert.equal(makeContact({ name: "C", types: ["conference"], topic: "podcast", event: { year: 2027 } }).event.year, 2027);
});

test("days left counts whole days and is negative when past", () => {
  assert.equal(daysLeft("2026-12-01", "2026-11-21"), 10);
  assert.equal(daysLeft("2026-11-20", "2026-11-21"), -1);
  assert.equal(daysLeft("", "2026-11-21"), null);
});
