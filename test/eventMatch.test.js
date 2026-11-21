import test from "node:test";
import assert from "node:assert/strict";
import { EventMatch } from "../src/domain/eventMatch.js";
import { makeContact } from "../src/domain/contacts.js";

const game = { game: "bunny-bunker", genres: ["Co-op", "Puzzle"], platforms: ["Windows", "Steam Deck"], stage: "demo" };
const fest = criteria => makeContact({ name: "Fest", types: ["festival"], event: { year: 2027, criteria } });
const check = criteria => new EventMatch().check(game, fest(criteria));

test("matches on a genre in common", () => {
  assert.deepEqual(check({ genres: ["puzzle", "rpg"] }), { match: true });
});

test("refuses on a genre not shared", () => {
  const r = check({ genres: ["horror"] });
  assert.equal(r.match, false);
  assert.match(r.reason, /genre/);
});

test("refuses on stage", () => {
  const r = new EventMatch().check({ ...game, stage: "released" }, fest({ stages: ["demo", "in development"] }));
  assert.equal(r.match, false);
  assert.match(r.reason, /stage: released/);
  assert.deepEqual(check({ stages: ["demo"] }), { match: true });
});

test("refuses on platform", () => {
  const r = check({ platforms: ["switch"] });
  assert.equal(r.match, false);
  assert.match(r.reason, /platform/);
  assert.deepEqual(check({ platforms: ["windows"] }), { match: true });
});

test("marks a festival without criteria as unknown", () => {
  assert.deepEqual(check({}), { match: true, criteriaUnknown: true });
});

test("checks only the criteria given, and all of them", () => {
  assert.deepEqual(check({ genres: ["co-op"], stages: ["demo"], platforms: ["steam deck"] }), { match: true });
  assert.equal(check({ genres: ["co-op"], stages: ["released"] }).match, false);
});

test("refuses a contact that is not an event", () => {
  const c = makeContact({ name: "Ada", types: ["influencer"] });
  assert.equal(new EventMatch().check(game, c).match, false);
});
