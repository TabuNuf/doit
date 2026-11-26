import test from "node:test";
import assert from "node:assert/strict";
import { makeMarketing } from "../src/root.js";
import { ContactError } from "../src/domain/contacts.js";
import { setup, addProfiles } from "./helpers.js";

function world(t) {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const { book, games } = makeMarketing({ home: s.home, now: () => s.clock.t });
  t.after(() => book.source.close());
  const cover = (name, reach, title, date, scales = ["indie"], genres = []) => {
    const id = book.list({ all: true }).find(c => c.name === name)?.id ?? book.add({ name, types: ["influencer"], reach }).id;
    book.addGame(id, { title, scales, kind: "played", date, source: `https://y.example/${name}/${date}`, genres });
    return id;
  };
  return { s, book, games, cover };
}

test("list gives coverage, estimates and comps, most covered first", t => {
  const { games, cover } = world(t);
  cover("Ada", 5000, "Hades", "2026-10-01", ["indie"], ["Action"]);
  cover("Bit", null, "hades", "2026-11-01");
  cover("Bit", null, "Tunic", "2026-09-01", ["solo"]);
  games.add("Quiet");
  games.set("Hades", { reviews: "1000", price: "10" });
  const list = games.list();
  assert.deepEqual(list.map(e => e.title), ["Hades", "Tunic", "Quiet"]);
  assert.deepEqual(list[0].coverage, { count: 2, reach: 5000, newest: "2026-11-01" });
  assert.deepEqual(list[0].estimates, { sales: 30000, salesFrom: "reviews x 30", revenue: 300000, revenueFrom: "sales x price" });
  assert.deepEqual([list[0].scales, list[0].genres, list[0].comps], [["indie"], ["Action"], []]);
  assert.deepEqual(list[2].coverage, { count: 0, reach: 0, newest: "" });
});

test("each filter narrows", t => {
  const { games, cover } = world(t);
  cover("Ada", 100, "Hades", "2026-10-01", ["indie"], ["Action", "Co-op"]);
  cover("Bit", 100, "Hades", "2026-10-02");
  cover("Bit", 100, "Tunic", "2026-10-03", ["solo"], ["Puzzle"]);
  games.set("Hades", { keywords: "cozy", stage: "released", store: "steam=https://s.example", rating: "90", reviews: "5000", checked: "2026-11-01" });
  const titles = f => games.list(f).map(e => e.title);
  assert.deepEqual([titles({ genre: "action" }), titles({ keyword: "cozy" }), titles({ scale: "solo" }), titles({ stage: "released" }), titles({ store: "steam" })],
    [["Hades"], ["Hades"], ["Tunic"], ["Hades"], ["Hades"]]);
  assert.deepEqual([titles({ rating: "80" }), titles({ reviews: "6k" }), titles({ covered: "2" }), titles({ covered: 3 }), titles({ noFacts: "1" })], [["Hades"], [], ["Hades"], [], ["Tunic"]]);
  games.setComp("Tunic", "good-box", "same size");
  assert.deepEqual([titles({ comp: "good-box" }), titles({ comp: "bunny-bunker" })], [["Tunic"], []]);
  assert.deepEqual(games.list({ comp: "good-box" })[0].comps, [{ game: "good-box", reason: "same size" }]);
  assert.throws(() => games.list({ comp: "nope" }), /No profile/);
  assert.throws(() => games.list({ similar: "nope" }), /No profile/);
  assert.throws(() => games.list({ stage: "beta" }), ContactError);
});

test("similar keeps entries sharing a tag or marked, most shared first", t => {
  const { games, cover } = world(t);
  cover("Ada", 1, "One", "2026-10-01", ["indie"], ["Co-op"]);
  cover("Ada", 1, "Two", "2026-10-02", ["indie"], ["co-op", "Cozy"]);
  cover("Ada", 1, "Three", "2026-10-03", ["indie"], ["Puzzle"]);
  cover("Ada", 1, "Four", "2026-10-04", ["indie"], ["Racing"]);
  games.setComp("Four", "bunny-bunker", "feels alike");
  const got = games.list({ similar: "bunny-bunker" });
  assert.deepEqual(got.map(e => [e.title, e.shared]), [["Two", 2], ["One", 1], ["Four", 0]]);
});

test("get gives coveredBy newest first and a compare per profile; any case finds it; a missing one is 404", t => {
  const { games, cover } = world(t);
  cover("Ada", 5000, "Hades", "2026-10-01", ["indie"], ["Co-op", "Action"]);
  cover("Bit", 10, "Hades", "2026-11-01");
  games.setComp("hades", "bunny-bunker", "same loop");
  const g = games.get("  HADES ");
  assert.deepEqual(g.coveredBy.map(c => [c.name, c.reach, c.kind, c.date]), [["Bit", 10, "played", "2026-11-01"], ["Ada", 5000, "played", "2026-10-01"]]);
  assert.match(g.coveredBy[0].source, /^https:/);
  assert.deepEqual(g.compare.map(c => [c.game, c.tags, c.comp]), [["bunny-bunker", ["Co-op"], "same loop"], ["good-box", [], null]]);
  assert.throws(() => games.get("Nope"), e => e instanceof ContactError && e.status === 404);
});

test("add refuses an existing key, set checks the whole entry, comps need a reason and a profile", t => {
  const { games } = world(t);
  games.add("Hades");
  assert.throws(() => games.add(" hades "), /already/);
  assert.equal(games.set("Hades", { developer: "Supergiant", dev_time: "2y" }).devTime, "2y");
  assert.throws(() => games.set("Hades", { sales: "10" }), /sales_source/);
  assert.throws(() => games.set("Hades", { nope: "x" }), /Unknown game field/);
  assert.throws(() => games.setComp("Hades", "nope", "why"), /No profile/);
  assert.throws(() => games.setComp("Hades", "good-box", "  "), /reason/);
  assert.throws(() => games.setComp("Missing", "good-box", "why"), /No game/);
  assert.deepEqual(games.setComp("Hades", "good-box", "why").comps, [{ game: "good-box", reason: "why" }]);
  assert.deepEqual(games.removeComp("Hades", "good-box").comps, []);
  assert.throws(() => games.removeComp("Hades", "good-box"), /not marked/);
});

test("tags lists the genres and keywords in use, sorted without case", t => {
  const { games } = world(t);
  games.add("A"); games.add("B");
  games.set("A", { genres: "Zen, action", keywords: "cozy" });
  games.set("B", { genres: "Action, Co-op", keywords: "Cozy, roguelike" });
  assert.deepEqual(games.tags(), { genres: ["action", "Co-op", "Zen"], keywords: ["cozy", "roguelike"] });
});
