import test from "node:test";
import assert from "node:assert/strict";
import { makeServer, makeContacts } from "../src/root.js";
import { setup, addProfiles } from "./helpers.js";

async function serve(t) {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const server = makeServer({ home: s.home, now: () => s.clock.t });
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = (p, method = "GET", body) => fetch(`http://127.0.0.1:${port}${p}`, {
    method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  }).then(async r => ({ status: r.status, body: await r.json() }));
  return { s, api };
}

test("the game routes add, list, filter, patch, comp and tag", async t => {
  const { s, api } = await serve(t);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  book.add({ name: "Ada Plays", types: ["influencer"], reach: 5000 });
  book.addGame("1", { title: "Hades", scales: "indie", kind: "played", date: "2026-11-01", source: "https://v.test/1", genres: "roguelike" });

  assert.deepEqual((await api("/api/games")).body.map(e => e.title), ["Hades"]);
  assert.equal((await api("/api/games")).body[0].coverage.count, 1);
  const added = await api("/api/games", "POST", { title: "Celeste" });
  assert.equal(added.status, 200);
  assert.equal(added.body.key, "celeste");
  assert.equal((await api("/api/games", "POST", { title: "celeste" })).status, 400);
  assert.equal((await api("/api/games", "POST", { title: " " })).status, 400);

  const patched = await api("/api/games/celeste", "PATCH", { rating: 94, genres: "platformer", stores: { steam: "https://s.test/c" }, reviews: "12k" });
  assert.equal(patched.status, 200);
  assert.deepEqual([patched.body.rating, patched.body.genres, patched.body.stores, patched.body.estimates.sales], [94, ["platformer"], { steam: "https://s.test/c" }, 360000]);
  assert.equal((await api("/api/games/celeste", "PATCH", { bogus: 1 })).status, 400);
  assert.equal((await api("/api/games/celeste", "PATCH", { rating: 101 })).status, 400);

  assert.deepEqual((await api("/api/games?rating=90")).body.map(e => e.title), ["Celeste"]);
  assert.deepEqual((await api("/api/games?genre=roguelike")).body.map(e => e.title), ["Hades"]);
  assert.deepEqual((await api("/api/games?covered=1")).body.map(e => e.title), ["Hades"]);
  assert.equal((await api("/api/games?noFacts=1")).body.length, 2);
  assert.equal((await api("/api/games?store=nope")).status, 400);
  assert.equal((await api("/api/games?comp=nope")).status, 400);
  assert.deepEqual((await api("/api/game-tags")).body, { genres: ["platformer", "roguelike"], keywords: [] });

  const shown = await api("/api/games/hades");
  assert.equal(shown.body.coveredBy[0].name, "Ada Plays");
  assert.equal(shown.body.compare.length, 2);
  assert.equal((await api("/api/games/nope")).status, 404);
  assert.equal((await api("/api/games/" + encodeURIComponent("Hades"))).status, 200);

  const comp = await api("/api/games/hades/comp", "POST", { game: "good-box", reason: "same pull" });
  assert.deepEqual(comp.body.comps, [{ game: "good-box", reason: "same pull" }]);
  assert.equal((await api("/api/games?comp=good-box")).body.length, 1);
  assert.equal((await api("/api/games/hades/comp", "POST", { game: "good-box", reason: "" })).status, 400);
  assert.equal((await api("/api/games/hades/comp/nope", "DELETE")).status, 400);
  assert.deepEqual((await api("/api/games/hades/comp/good-box", "DELETE")).body.comps, []);
  assert.equal((await api("/api/games/zzz/comp/good-box", "DELETE")).status, 404);
});
