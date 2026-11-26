// T-031.9: the Compare block, the + Comparable to form's requests and the comp pill on a list row.
import test from "node:test";
import assert from "node:assert/strict";
import { makeServer, makeContacts } from "../src/root.js";
import { setup, addProfiles } from "./helpers.js";
import { compareBlock, compRequest, uncompRequest } from "../web/gameCompare.js";
import { gameCells } from "../web/gameColumns.js";
import { gameDetailPane } from "../web/gameDetail.js";

const compare = [
  { game: "bunny-bunker", name: "Bunny Bunker", tags: ["roguelike"], scales: ["indie"], platforms: ["steam"], comp: "same loop, same price" },
  { game: "good-box", name: "Good Box", tags: [], scales: [], platforms: [], comp: null },
];

test("the block lists what each profile shares, the comp reason with Remove, and one muted line when nothing is shared", () => {
  const html = compareBlock(compare, false);
  assert.match(html, /tags: roguelike · scales: indie · platforms: steam/);
  assert.match(html, /<span class="pill comp">comp<\/span> same loop, same price <button data-gm-uncomp="bunny-bunker"/);
  assert.equal([...html.matchAll(/data-gm-uncomp/g)].length, 1);
  assert.match(html, /<div class="muted">Shares nothing\.<\/div>/);
  assert.match(html, /data-gm-comp-open>\+ Comparable to/);
  assert.ok(!html.includes('id="gm-comp"'));
});

test("the form offers each profile and a reason; the requests are a POST and a DELETE", () => {
  const html = compareBlock(compare, true);
  assert.match(html, /<form class="form mk-fit" id="gm-comp"/);
  assert.match(html, /<option value="good-box">Good Box<\/option>/);
  assert.match(html, /id="gm-comp-reason" required/);
  assert.match(html, /data-gm-comp-cancel/);
  const e = { key: "hades <1>" };
  assert.deepEqual(compRequest(e, "good-box", "same hook"), { method: "POST", path: "/api/games/hades%20%3C1%3E/comp", body: { game: "good-box", reason: "same hook" } });
  assert.deepEqual(uncompRequest({ key: "hades" }, "good-box"), { method: "DELETE", path: "/api/games/hades/comp/good-box" });
  assert.match(gameDetailPane({ key: "h", title: "H", stores: {}, trackers: {}, coverage: { count: 0, reach: 0, newest: "" }, estimates: {}, compare }, true), /id="gm-comp"/);
});

test("the requests mark and unmark a comp on the server, and a row shows a comp pill when the filter names the game", async t => {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  book.add({ name: "Ada Plays", types: ["influencer"] });
  book.addGame("1", { title: "Hades", scales: "indie", kind: "played", date: "2026-11-01", source: "https://v.test/1", genres: "roguelike" });
  book.source.close();
  const server = makeServer({ home: s.home, now: () => s.clock.t });
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = async req => (await fetch(`http://127.0.0.1:${port}${req.path}`, { method: req.method, headers: { "Content-Type": "application/json" }, body: req.body === undefined ? undefined : JSON.stringify(req.body) })).json();
  const game = (await api({ method: "GET", path: "/api/games/hades" })).compare[0].game;
  let e = await api(compRequest({ key: "hades" }, game, "same loop"));
  assert.equal(e.compare.find(c => c.game === game).comp, "same loop");
  assert.match(compareBlock(e.compare, false), /same loop/);
  const row = (await api({ method: "GET", path: `/api/games?comp=${game}` }))[0];
  assert.match(gameCells(row, game), /<span class="pill comp"[^>]*>comp<\/span>/);
  assert.ok(!gameCells(row, "").includes("comp</span>"));
  e = await api(uncompRequest({ key: "hades" }, game));
  assert.equal(e.compare.find(c => c.game === game).comp, null);
});
