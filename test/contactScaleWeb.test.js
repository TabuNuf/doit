import test from "node:test";
import assert from "node:assert/strict";
import { makeServer, makeContacts } from "../src/root.js";
import { setup, addProfiles } from "./helpers.js";
import { detailPane, editRequest } from "../web/contactDetail.js";
import { channelsBlock, channelEdit } from "../web/contactChannels.js";
import { parkedSection } from "../web/marketingView.js";
import { parkedPath } from "../web/contactFilters.js";

test("routes: parked and relevance filters, and the new fields on PATCH", async t => {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  book.add({ name: "Ada", types: ["influencer"] });
  book.add({ name: "Bo", types: ["influencer"], status: "parked", next: "2026-11-01" });
  book.add({ name: "Fest", types: ["festival"], event: { year: 2027 } });
  book.source.close();
  const server = makeServer({ home: s.home, now: () => s.clock.t });
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = (p, method = "GET", body) => fetch(`http://127.0.0.1:${port}${p}`, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
  const names = async p => (await api(p)).map(c => c.name);
  assert.deepEqual(await names("/api/contacts"), ["Ada", "Fest"]);
  assert.deepEqual(await names(parkedPath()), ["Bo"]);
  assert.deepEqual(await names("/api/contacts?all=1"), ["Bo", "Ada", "Fest"], "due parked first");
  assert.deepEqual(await names("/api/contacts?irrelevant=1"), ["Ada"]);
  assert.deepEqual(await names("/api/contacts?relevant=1"), []);
  const c = await api("/api/contacts/1", "PATCH", { scales: ["triple-i"], scaleNote: "n", checked: "2026-11-26", reddit: "https://reddit.com/r/a" });
  assert.deepEqual([c.scales, c.scaleNote, c.checked, c.reddit], [["triple-i"], "n", "2026-11-26", "https://reddit.com/r/a"]);
  assert.deepEqual(await names("/api/contacts?scale=iii"), ["Ada"]);
});

test("the pane edits the new fields and a channel's followers and last-active date", () => {
  const c = { id: 7, name: "A", types: ["influencer"], status: "parked", next: "", reach: null, special: "", genres: [], about: "", notes: "", touches: [], fit: [], scales: ["aa"], scaleNote: "x", checked: "2026-11-01", reddit: "r",
    channels: [{ kind: "kick", url: "https://kick.com/a", followers: 349800, active: "" }] };
  const html = detailPane(c, [], false, "2026-11-26");
  for (const id of ["mk-scales", "mk-scalenote", "mk-checked", "mk-reddit", "mk-chf-0", "mk-cha-0"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /<option value="parked" selected>/);
  assert.match(channelsBlock(c.channels), /<option value="rumble"/);
  assert.deepEqual(editRequest({ id: "mk-scales", value: "indie, III" }, c).body, { scales: ["indie", "III"] });
  assert.equal(editRequest({ id: "mk-scales", value: "aa" }, c), null);
  assert.deepEqual(editRequest({ id: "mk-checked", value: "2026-11-26" }, c).body, { checked: "2026-11-26" });
  const f = channelEdit({ id: "mk-chf-0", value: "400000" }, c);
  assert.deepEqual(f.body.channels, [{ kind: "kick", url: "https://kick.com/a", followers: 400000, active: "" }]);
  assert.deepEqual(channelEdit({ id: "mk-cha-0", value: "2026-11-20" }, c).body.channels[0].active, "2026-11-20");
  assert.equal(channelEdit({ id: "mk-chf-0", value: "349800" }, c), null);
  assert.equal(channelEdit({ id: "mk-cha-0", value: "" }, c), null);
});

test("the Parked section is folded until opened, shows a count and review dates, and is absent when empty", () => {
  const p = [{ id: 1, name: "Bo", types: ["influencer"], status: "parked", next: "2027-05-25", due: false, reach: 5, last: "", active: "" }];
  const closed = parkedSection(p, false, null);
  assert.match(closed, /data-mk-parked.*Parked<span class="c">1<\/span>/);
  assert.doesNotMatch(closed, /data-contact/);
  const open = parkedSection(p, true, null);
  assert.match(open, /data-contact="1"/);
  assert.match(open, /Not relevant to any game/);
  assert.equal(parkedSection([], true, null), "");
});

import { coveredBlock, gameRemove } from "../web/contactCovered.js";
test("the pane lists covered games with a source link and removes one by title", () => {
  const c = { id: 4, why: "3 covered games in our league", games: [{ title: "Tiny Quest", scales: ["solo"], kind: "reviewed", date: "2026-11-01", source: "https://youtu.be/x", genres: ["rpg"] }] };
  const html = coveredBlock(c);
  assert.match(html, /Tiny Quest/);
  assert.match(html, /<button class="link" data-gm-open="tiny quest"[^>]*><strong>Tiny Quest<\/strong><\/button>/);
  assert.match(html, /href="https:\/\/youtu.be\/x"/);
  assert.match(html, /relevant: 3 covered games/);
  assert.match(coveredBlock({ id: 1, games: [] }), /None yet/);
  assert.deepEqual(gameRemove(c, "0"), { method: "DELETE", path: "/api/contacts/4/games/Tiny%20Quest" });
});

test("routes: add and remove a covered game, now-relevant filter", async t => {
  const s = setup(); t.after(s.cleanup);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  book.add({ name: "Ada", types: ["influencer"] });
  book.source.close();
  const server = makeServer({ home: s.home, now: () => s.clock.t });
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = (p, method = "GET", body) => fetch(`http://127.0.0.1:${port}${p}`, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }).then(async r => ({ status: r.status, body: await r.json() }));
  const g = { title: "Tiny Quest", scales: ["solo"], kind: "played", date: "2026-11-01", source: "https://youtu.be/x" };
  assert.equal((await api("/api/contacts/1/games", "POST", g)).body.games.length, 1);
  assert.equal((await api("/api/contacts/1/games", "POST", { ...g, source: "" })).status, 400);
  assert.equal((await api("/api/contacts/1/games/tiny%20quest", "DELETE")).body.games.length, 0);
  assert.equal((await api("/api/contacts?nowRelevant=1")).body.length, 0);
});
