// T-021.12: store events under Events, other festivals under Festivals, and the event fields in the pane.
import test from "node:test";
import assert from "node:assert/strict";
import { makeServer, makeContacts } from "../src/root.js";
import { MarketingDb } from "../src/store/marketingDb.js";
import { setup } from "./helpers.js";

async function serve(t) {
  const s = setup(); t.after(s.cleanup);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  const up = (name, event, types) => book.upsertFestival(name, 2027, { types, event }).contact.id;
  const ids = {
    next: up("Steam Next Fest", { deadline: "2026-12-01", where: "steam", cost: "free", state: "watching" }),
    itch: up("Itch Jam Sale", { deadline: "2026-12-05", where: "itch" }),
    gamescom: up("Gamescom", { deadline: "2026-12-10", where: "physical" }, ["festival"]),
    gdc: up("GDC", { deadline: "2026-12-11" }, ["conference"]),
  };
  book.source.close();
  const server = makeServer({ home: s.home, now: () => s.clock.t });
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = (p, method = "GET", body) => fetch(`http://127.0.0.1:${port}${p}`, {
    method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  }).then(async r => ({ status: r.status, body: await r.json() }));
  return { s, api, ids };
}

test("platform events list under Events and every other festival under Festivals", async t => {
  const { festivalPath } = await import("../web/festivalsPane.js");
  const { api } = await serve(t);
  assert.deepEqual((await api(festivalPath("", "1"))).body.map(c => c.name), ["Steam Next Fest", "Itch Jam Sale"]);
  assert.deepEqual((await api(festivalPath("", "0"))).body.map(c => c.name), ["Gamescom", "GDC"]);
  assert.equal((await api(festivalPath(""))).body.length, 4);
});

test("Steam Next Fest shows its deadline and state in the pane, no contact fields, and its state changes from the pane into marketing.db", async t => {
  const { eventPane, eventEditRequest } = await import("../web/eventDetail.js");
  const { s, api, ids } = await serve(t);
  const c = (await api(`/api/contacts/${ids.next}`)).body;
  const html = eventPane(c);
  assert.match(html, /id="ev-deadline" value="2026-12-01"/);
  assert.match(html, /<option value="watching" selected>watching/);
  assert.match(html, /<option value="steam" selected>steam/);
  assert.match(html, /id="ev-cost" value="free"/);
  assert.doesNotMatch(html, /Reach|Email|Touches|mk-reach|mk-status/);
  assert.match(eventPane(null), /Select an event/);

  assert.equal(eventEditRequest({ id: "ev-state", value: "watching" }, c), null, "nothing new sends nothing");
  const req = eventEditRequest({ id: "ev-state", value: "applied" }, c);
  assert.equal((await api(req.path, req.method, req.body)).status, 200);
  const db = new MarketingDb(s.home).db;
  const row = db.prepare("SELECT * FROM events WHERE contact_id = ?").get(ids.next);
  assert.equal(row.state, "applied");
  assert.equal(row.deadline, "2026-12-01", "the other event fields stay");

  for (const [id, value, check] of [["ev-deadline", "2026-12-03", e => e.deadline], ["ev-where", "epic", e => e.where], ["ev-genres", "co-op, cozy", e => e.criteria.genres.join(",")], ["ev-cost", "99 USD", e => e.cost]]) {
    const cur = (await api(`/api/contacts/${ids.next}`)).body;
    const r = eventEditRequest({ id, value }, cur);
    const out = await api(r.path, r.method, r.body);
    assert.equal(String(check(out.body.event)), id === "ev-genres" ? "co-op,cozy" : value, id);
  }
  const rename = eventEditRequest({ id: "ev-name", value: "Steam Next Fest Autumn" }, (await api(`/api/contacts/${ids.next}`)).body);
  assert.equal((await api(rename.path, rename.method, rename.body)).body.name, "Steam Next Fest Autumn");
  const bad = eventEditRequest({ id: "ev-deadline", value: "tomorrow" }, (await api(`/api/contacts/${ids.next}`)).body);
  assert.equal((await api(bad.path, bad.method, bad.body)).status, 400);
});

test("the Overview opens a store event in the Events tab", async () => {
  const { festivalLine } = await import("../web/weekPane.js");
  assert.match(festivalLine({ id: 1, name: "N", year: 2027, deadline: "2026-12-01", daysLeft: 3, games: ["g"], platform: true }, null), /data-mk-to="events"/);
  assert.match(festivalLine({ id: 2, name: "G", year: 2027, deadline: "2026-12-01", daysLeft: 3, games: ["g"], platform: false }, null), /data-mk-to="festivals"/);
});
