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

test("the contact routes list, show, update, fit and touch", async t => {
  const { s, api } = await serve(t);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  book.add({ name: "Ada Plays", types: ["influencer"], reach: 5000, next: "2026-11-01" });
  book.add({ name: "Bit Blog", types: ["press"], reach: 300 });

  const all = await api("/api/contacts");
  assert.equal(all.status, 200);
  assert.deepEqual(all.body.map(c => c.name), ["Ada Plays", "Bit Blog"]);
  assert.equal(all.body[0].due, true);
  assert.equal((await api("/api/contacts?due=1")).body.length, 1);
  assert.equal((await api("/api/contacts?type=press")).body[0].name, "Bit Blog");
  assert.equal((await api("/api/contacts?reach=1000")).body.length, 1);
  assert.equal((await api("/api/contacts?status=dormant")).body.length, 0);

  assert.equal((await api("/api/contacts/1")).body.name, "Ada Plays");
  const patched = await api("/api/contacts/1", "PATCH", { status: "dormant", next: "", notes: "Quiet", channels: [{ kind: "youtube", url: "https://youtube.com/@ada" }] });
  assert.equal(patched.status, 200);
  assert.deepEqual([patched.body.status, patched.body.next, patched.body.channels.length], ["dormant", "", 1]);
  assert.equal((await api("/api/contacts?fits=bunny-bunker")).body.length, 0);
  const fit = await api("/api/contacts/1/fit", "POST", { game: "bunny-bunker", reason: "plays co-op" });
  assert.deepEqual(fit.body.fit, [{ game: "bunny-bunker", reason: "plays co-op" }]);
  assert.equal((await api("/api/contacts?fits=bunny-bunker")).body.length, 1);
  assert.equal((await api("/api/contacts/1/fit/good-box", "DELETE")).status, 400);
  const gone = await api("/api/contacts/1/fit/bunny-bunker", "DELETE");
  assert.deepEqual(gone.body.fit, []);
  assert.equal((await api("/api/contacts/9/fit/bunny-bunker", "DELETE")).status, 404);
  await api("/api/contacts/1/fit", "POST", { game: "bunny-bunker", reason: "plays co-op" });
  const touch = await api("/api/contacts/1/touch", "POST", { kind: "mail", game: "good-box", date: "2026-11-10" });
  assert.deepEqual(touch.body.touches[0], { date: "2026-11-10", kind: "mail", game: "good-box", note: "" });

  const profiles = await api("/api/profiles");
  assert.deepEqual(profiles.body.map(p => p.game), ["bunny-bunker", "good-box"]);
  assert.equal(profiles.body[0].stage, "demo");
});

test("a refused value returns 400 with the message, a missing contact 404", async t => {
  const { s, api } = await serve(t);
  makeContacts({ home: s.home }).add({ name: "Ada", types: ["influencer"] });
  for (const [path, method, body, re] of [
    ["/api/contacts/1", "PATCH", { types: ["alien"] }, /Unknown type/],
    ["/api/contacts/1", "PATCH", { reach: "Z" }, /Reach must be/],
    ["/api/contacts/1", "PATCH", { next: "soon" }, /YYYY-MM-DD/],
    ["/api/contacts/1/fit", "POST", { game: "no-game", reason: "x" }, /No profile/],
    ["/api/contacts/1/fit", "POST", { game: "good-box" }, /needs a reason/],
    ["/api/contacts/1/touch", "POST", { kind: "call" }, /Unknown touch kind/],
    ["/api/contacts/1/touch", "POST", { kind: "mail", game: "no-game" }, /No profile/],
    ["/api/contacts?type=alien", "GET", undefined, /Unknown type/],
    ["/api/contacts?reach=Z", "GET", undefined, /Reach must be/],
    ["/api/contacts/abc", "GET", undefined, /Not a contact id/],
  ]) {
    const r = await api(path, method, body);
    assert.equal(r.status, 400, `${method} ${path}`);
    assert.match(r.body.error, re);
  }
  assert.equal((await api("/api/contacts/99")).status, 404);
  assert.equal((await api("/api/contacts/99/touch", "POST", { kind: "mail" })).status, 404);
});

test("except= leaves festivals and conferences out of the contacts, and type= splits the events", async t => {
  const { s, api } = await serve(t);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  book.add({ name: "Ada Plays", types: ["influencer"] });
  book.upsertFestival("Next Fest", 2027, { types: ["festival"], event: { deadline: "2026-12-20" } });
  book.upsertFestival("GDC", 2027, { types: ["conference"], event: { deadline: "2026-12-10" } });
  assert.deepEqual((await api("/api/contacts?except=festival,conference")).body.map(c => c.name), ["Ada Plays"]);
  assert.equal((await api("/api/contacts?except=nonsense")).status, 400);
  assert.deepEqual((await api("/api/festivals?type=festival")).body.map(c => c.name), ["Next Fest"]);
  assert.deepEqual((await api("/api/festivals?type=conference")).body.map(c => c.name), ["GDC"]);
  book.source.close();
});

test("genres are patched, filtered and listed", async t => {
  const { s, api } = await serve(t);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  book.add({ name: "Ada Plays", types: ["influencer"] });
  book.add({ name: "Bit Blog", types: ["press"] });
  const r = await api("/api/contacts/1", "PATCH", { genres: ["Indie", "Horror"], about: "Plays horror." });
  assert.deepEqual([r.body.genres, r.body.about], [["Indie", "Horror"], "Plays horror."]);
  await api("/api/contacts/2", "PATCH", { genres: ["Puzzle"] });
  assert.deepEqual((await api("/api/contacts?genre=horror")).body.map(c => c.name), ["Ada Plays"]);
  assert.deepEqual((await api("/api/genres")).body, ["Horror", "Indie", "Puzzle"]);
});

test("PATCH sets and clears a contact's special reason", async t => {
  const { s, api } = await serve(t);
  makeContacts({ home: s.home }).add({ name: "Special Geek 40", types: ["influencer"] });
  assert.equal((await api("/api/contacts/1", "PATCH", { special: "Friend" })).body.special, "Friend");
  assert.equal((await api("/api/contacts")).body[0].special, "Friend");
  assert.equal((await api("/api/contacts/1", "PATCH", { special: "" })).body.special, "");
});
