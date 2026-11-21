// T-025.7: the campaign routes: brief edit, suggestions, add one contact.
import test from "node:test";
import assert from "node:assert/strict";
import { makeServer, makeContacts } from "../src/root.js";
import { setup, addProfiles } from "./helpers.js";

const M = "polyspice-marketing";

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

test("POST takes occasion, PATCH saves the brief and games, a bad value is a 400", async t => {
  const { s, api } = await serve(t);
  const made = await api("/api/campaigns", "POST", { projects: ["bunny-bunker"], name: "Demo", occasion: "demo" });
  assert.equal(made.status, 200);
  const epic = made.body.id;
  const brief = () => s.board.view({ project: M }).epics.find(e => e.id === epic);
  assert.equal(brief().brief.occasion, "demo");
  assert.equal((await api("/api/campaigns", "POST", { projects: ["bunny-bunker"], name: "Bad", occasion: "party" })).status, 400);

  const ok = await api(`/api/campaigns/${M}/${epic}`, "PATCH", { measure: "wishlists", goal: "Reach", game: ["bunny-bunker", "good-box"], ends: "2026-12-07" });
  assert.equal(ok.status, 200);
  assert.deepEqual([brief().brief.measure, brief().brief.goal, brief().games], ["wishlists", "Reach", ["bunny-bunker", "good-box"]]);
  assert.equal((await api(`/api/campaigns/${M}/${epic}`, "PATCH", { game: "a, nope" })).status, 400);
  assert.equal((await api(`/api/campaigns/${M}/${epic}`, "PATCH", { occasion: "party" })).status, 400);
  assert.equal((await api(`/api/campaigns/${M}/${epic}`, "PATCH", { starts: "2026-12-09" })).status, 400);
  assert.equal((await api(`/api/campaigns/${M}/EPIC-999`, "PATCH", { ask: "x" })).status, 400);
  assert.equal(brief().brief.starts, "", "a refused change writes nothing");
});

test("suggest returns contacts and festivals; contact adds one task and refuses a repeat or an unknown id", async t => {
  const { s, api } = await serve(t);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  const a = book.add({ name: "Ada", types: ["influencer"], reach: 900 });
  book.setFit(a.id, "bunny-bunker", "co-op");
  book.upsertFestival("Steam Next Fest", 2027, { event: { deadline: "2026-12-01" }, topic: "co-op" });
  const epic = (await api("/api/campaigns", "POST", { projects: ["bunny-bunker"], name: "Push" })).body.id;

  const found = await api(`/api/campaigns/${M}/${epic}/suggest`);
  assert.equal(found.status, 200);
  assert.deepEqual(found.body.contacts.map(c => [c.id, c.game, c.reason]), [[a.id, "bunny-bunker", "co-op"]]);
  assert.ok(Array.isArray(found.body.festivals));
  assert.equal((await api(`/api/campaigns/${M}/${epic}/suggest?limit=0`)).status, 400);

  const added = await api(`/api/campaigns/${M}/${epic}/contact`, "POST", { contact: a.id });
  assert.equal(added.status, 200);
  assert.match(s.board.get(added.body.ref).title, /^Reach out to Ada$/);
  assert.equal((await api(`/api/campaigns/${M}/${epic}/contact`, "POST", { contact: a.id })).status, 400);
  assert.ok((await api(`/api/campaigns/${M}/${epic}/contact`, "POST", { contact: 999 })).status >= 400);
  assert.deepEqual((await api(`/api/campaigns/${M}/${epic}/suggest`)).body.contacts, []);
});
