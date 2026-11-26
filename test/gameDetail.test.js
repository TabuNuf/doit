// T-031.8: the game pane's controls, the request each edit builds, and what the server holds after it.
import test from "node:test";
import assert from "node:assert/strict";
import { makeServer, makeContacts } from "../src/root.js";
import { setup, addProfiles } from "./helpers.js";
import { gameDetailPane, gameEditRequest } from "../web/gameDetail.js";
import { linkAdd, linkRemove, coveredByBlock } from "../web/gameLinks.js";

async function serve(t) {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  book.add({ name: "Ada Plays", types: ["influencer"], reach: 5000 });
  book.addGame("1", { title: "Hades", scales: "indie", kind: "played", date: "2026-11-01", source: "https://v.test/1", genres: "roguelike" });
  book.source.close();
  const server = makeServer({ home: s.home, now: () => s.clock.t });
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = async req => { const r = await fetch(`http://127.0.0.1:${port}${req.path}`, { method: req.method, headers: { "Content-Type": "application/json" }, body: req.body === undefined ? undefined : JSON.stringify(req.body) }); return r.json(); };
  return { api };
}

test("the pane has a control for every field under the headings, and the three text areas", async t => {
  const { api } = await serve(t);
  const e = await api({ method: "GET", path: "/api/games/hades" });
  const html = gameDetailPane(e);
  for (const h of ["Identity", "Stores", "Trackers", "What it is", "Success", "Ratings", "How it got there", "Coverage", "Notes and sources"]) assert.ok(html.includes(`>${h}</div>`) || html.includes(`>${h}<`), h);
  for (const f of ["developer", "publisher", "release", "stage", "platforms", "description", "hook", "look", "genres", "keywords", "modes", "scales", "price", "launchPrice", "demo", "languages",
    "reviews", "sales", "revenue", "salesSource", "peakPlayers", "followers", "rating", "ratingLabel", "metacritic", "opencritic", "playtime", "team", "devTime", "festivals", "earlyAccess", "worked", "notes", "sources", "checked"]) {
    assert.ok(html.includes(`id="gm-f-${f}"`), f);
  }
  assert.equal([...html.matchAll(/<textarea/g)].length, 3);
  assert.match(html, /<option value="early-access" >early-access/);
});

test("each field builds its PATCH, nothing new builds none, and the server holds the change", async t => {
  const { api } = await serve(t);
  let e = await api({ method: "GET", path: "/api/games/hades" });
  assert.equal(gameEditRequest({ id: "gm-f-developer", value: "" }, e), null);
  assert.equal(gameEditRequest({ id: "gm-f-genres", value: "roguelike" }, e), null);
  assert.equal(gameEditRequest({ id: "gm-f-nope", value: "x" }, e), null);
  const req = gameEditRequest({ id: "gm-f-developer", value: " Supergiant " }, e);
  assert.deepEqual(req, { method: "PATCH", path: "/api/games/hades", body: { developer: "Supergiant" } });
  e = await api(req);
  assert.equal(e.developer, "Supergiant");
  for (const [id, value, check, want] of [["gm-f-genres", "roguelike, action", x => x.genres.join(), "roguelike,action"], ["gm-f-reviews", "12k", x => String(x.reviews), "12000"],
    ["gm-f-rating", "93", x => String(x.rating), "93"], ["gm-f-stage", "released", x => x.stage, "released"], ["gm-f-demo", "yes", x => x.demo, "yes"],
    ["gm-f-description", "Line one\nLine two", x => x.description, "Line one\nLine two"], ["gm-f-price", "24.99", x => String(x.price), "24.99"]]) {
    const r = gameEditRequest({ id, value }, e);
    assert.ok(r, id);
    e = await api(r);
    assert.equal(check(e), want, id);
  }
  e = await api(gameEditRequest({ id: "gm-f-reviews", value: "" }, e));
  assert.equal(e.reviews, null);
});

test("a store and a tracker are set and removed one at a time", async t => {
  const { api } = await serve(t);
  let e = await api({ method: "GET", path: "/api/games/hades" });
  assert.equal(linkAdd(e, "stores", "steam", "  "), null);
  e = await api(linkAdd(e, "stores", "steam", " https://s.test/h "));
  e = await api(linkAdd(e, "stores", "gog", "https://g.test/h"));
  e = await api(linkAdd(e, "trackers", "gamalytic", "https://gamalytic.test/h"));
  assert.deepEqual([e.stores, e.trackers], [{ steam: "https://s.test/h", gog: "https://g.test/h" }, { gamalytic: "https://gamalytic.test/h" }]);
  const html = gameDetailPane(e);
  assert.match(html, /<a href="https:\/\/s.test\/h" target="_blank" rel="noopener">/);
  assert.match(html, /data-gm-del="stores\/steam"/);
  e = await api(linkRemove(e, "stores", "steam"));
  e = await api(linkRemove(e, "trackers", "gamalytic"));
  assert.deepEqual([e.stores, e.trackers], [{ gog: "https://g.test/h" }, {}]);
});

test("sales show the stored figure with its source, else the estimate marked as one", async t => {
  const { api } = await serve(t);
  let e = await api({ method: "PATCH", path: "/api/games/hades", body: { reviews: 1000, price: 10 } });
  let html = gameDetailPane(e);
  assert.match(html, /<span class="pill">estimate<\/span> <span class="mono" title="From reviews x 30">~30k<\/span> <span class="muted">reviews x 30<\/span>/);
  assert.match(html, /<span class="pill">estimate<\/span> <span class="mono" title="From sales x price">~300k<\/span>/);
  e = await api({ method: "PATCH", path: "/api/games/hades", body: { sales: 5000, salesSource: "gamalytic" } });
  html = gameDetailPane(e);
  assert.match(html, /id="gm-f-sales" value="5000"[^>]*> <span class="muted">from gamalytic<\/span>/);
});

test("Covered by lists each contact with reach, kind, date, a Source link and a button that opens the contact", async t => {
  const { api } = await serve(t);
  const e = await api({ method: "GET", path: "/api/games/hades" });
  const html = coveredByBlock(e.coveredBy);
  assert.match(html, /<button data-contact="1" data-mk-to="contacts">Ada Plays<\/button>/);
  assert.match(html, /reach 5000 · played 2026-11-01/);
  assert.match(html, /<a href="https:\/\/v.test\/1" target="_blank" rel="noopener">Source<\/a>/);
  assert.match(coveredByBlock([]), /No contact covers it yet/);
});

test("a covered game opens its entry in the Games tab, and a Covered by name opens the contact in Contacts", async () => {
  const { S } = await import("../web/state.js");
  const { selectGame } = await import("../web/gamesTab.js");
  const { entryKey } = await import("../web/contactCovered.js");
  assert.equal(entryKey("  Tiny   Quest "), "tiny quest");
  S.mk.pane = "contacts"; S.gm.sel = null; S.gm.detail = { key: "old" }; S.gm.compOpen = true;
  selectGame("tiny quest", true);
  assert.deepEqual([S.mk.pane, S.gm.sel, S.gm.detail, S.gm.compOpen], ["games", "tiny quest", null, false]);
  assert.match(coveredByBlock([{ id: 7, name: "Ada", reach: null, kind: "played", date: "2026-11-01", source: "" }]), /data-contact="7" data-mk-to="contacts"/);
});
