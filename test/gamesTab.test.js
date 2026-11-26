// The Games tab: its place in the top bar, the list request, the seven columns and the detail pane.
import test from "node:test";
import assert from "node:assert/strict";

const entry = (key, over = {}) => ({
  key, title: key[0].toUpperCase() + key.slice(1), genres: ["roguelike"], scales: ["indie"], stores: { steam: "https://s.test" }, rating: null, ratingLabel: "", reviews: null,
  description: "", estimates: { sales: null, salesFrom: null }, coverage: { count: 0, reach: 0, newest: "" }, comps: [], ...over,
});

test("the tab sits right after Contacts", async () => {
  const { MK_TABS, marketingTabs } = await import("../web/marketingView.js");
  const ids = MK_TABS.map(t => t[0]);
  assert.equal(ids[ids.indexOf("contacts") + 1], "games");
  assert.match(marketingTabs("games"), /data-mk-pane="games" aria-pressed="true">Games</);
});

test("each filter is in the list request, and none adds nothing", async () => {
  const { gamePath, EMPTY_GM_FILTERS } = await import("../web/gameFilters.js");
  assert.equal(gamePath(EMPTY_GM_FILTERS), "/api/games");
  for (const k of Object.keys(EMPTY_GM_FILTERS)) {
    const path = gamePath({ ...EMPTY_GM_FILTERS, [k]: k === "noFacts" ? "1" : "x y" });
    assert.equal(path, `/api/games?${k}=${k === "noFacts" ? "1" : "x+y"}`, k);
  }
  assert.equal(gamePath({ ...EMPTY_GM_FILTERS, genre: "co-op", rating: "80" }), "/api/games?genre=co-op&rating=80");
});

test("the filter column has a control for each filter, with the tags and profiles offered", async () => {
  const { filterPane, GM_FILTERS } = await import("../web/gameFilters.js");
  const html = filterPane({ genre: "action", noFacts: "1" }, { genres: ["action", "puzzle"], keywords: ["fast"] }, [{ game: "good-box", name: "Good Box" }]);
  for (const id of [...Object.keys(GM_FILTERS), "gm-nofacts"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /<option value="action" selected>/);
  assert.match(html, /<option value="good-box" >Good Box/);
  assert.match(html, /id="gm-nofacts" checked/);
  assert.match(html, /data-gm-clear/);
});

test("the list has seven sortable headers and a row per game with its cells", async () => {
  const { gameListPane } = await import("../web/gamesTab.js");
  const hades = entry("hades", { rating: 93, ratingLabel: "Overwhelmingly Positive", reviews: 12400, estimates: { sales: 372000, salesFrom: "reviews x 30" }, coverage: { count: 2, reach: 5300, newest: "2026-11-01" } });
  const html = gameListPane([hades, entry("celeste", { stores: {} })], "hades");
  const heads = html.match(/data-gm-sort="(\w+)"/g).map(s => s.slice(14, -1));
  assert.deepEqual(heads, ["title", "genre", "scale", "rating", "reviews", "sales", "covered"]);
  for (const h of ["Title", "Genre", "Scale", "Rating", "Reviews", "Est. sales", "Covered by"]) assert.ok(html.includes(`>${h}</button>`), h);
  assert.match(html, /<button class="mk-row gm-cols" data-game="hades" aria-pressed="true">/);
  assert.match(html, /<span class="pill">steam<\/span>/);
  assert.match(html, /title="Overwhelmingly Positive">93%</);
  assert.match(html, />12k</);
  assert.match(html, /title="From reviews x 30">~372k</);
  assert.match(html, /title="Covered by 2 contacts, reach 5300">2</);
  assert.match(html, /data-game="celeste" aria-pressed="false"/);
});

test("a figure from the entry's own source has no tilde, and the empty states say so in plain text", async () => {
  const { gameCells } = await import("../web/gameColumns.js");
  assert.match(gameCells(entry("a", { estimates: { sales: 5000, salesFrom: "gamalytic" } })), /title="From gamalytic">5k</);
  const { gameListPane } = await import("../web/gamesTab.js");
  assert.match(gameListPane(null, null), /Loading/);
  assert.match(gameListPane([], null), /No games yet/);
  assert.match(gameListPane([], null, null, true), /No game matches these filters\. <button data-gm-clear>/);
});

test("a header click sorts, again reverses; empty figures stay last; the choice is the saved state", async () => {
  const { clickGameSort, orderGames } = await import("../web/gameColumns.js");
  const list = [entry("b", { rating: 70 }), entry("a", { rating: 90 }), entry("c")];
  let sort = clickGameSort(null, "rating");
  assert.deepEqual(sort, { key: "rating", dir: "desc" });
  assert.deepEqual(orderGames(list, sort).map(e => e.key), ["a", "b", "c"]);
  sort = clickGameSort(sort, "rating");
  assert.deepEqual(orderGames(list, sort).map(e => e.key), ["b", "a", "c"]);
  assert.deepEqual(clickGameSort(sort, "title"), { key: "title", dir: "asc" });
  assert.deepEqual(orderGames(list, null).map(e => e.key), ["b", "a", "c"]);

  const { S } = await import("../web/state.js");
  const { gamesClick } = await import("../web/gamesTab.js");
  const saved = {};
  globalThis.localStorage = { setItem: (k, v) => { saved[k] = v; }, getItem: () => null };
  try { S.gm.sort = null; gamesClick({ gmSort: "covered" }); } catch { /* redraw needs a page */ }
  delete globalThis.localStorage;
  assert.equal(saved["doit.games.sort"], JSON.stringify({ key: "covered", dir: "desc" }));
});

test("arrow keys move the selection, the first when none, the same at either end", async () => {
  const { nextGame } = await import("../web/gameColumns.js");
  const keys = ["a", "b", "c"];
  assert.equal(nextGame(keys, null, "ArrowDown"), "a");
  assert.equal(nextGame(keys, "a", "ArrowDown"), "b");
  assert.equal(nextGame(keys, "c", "ArrowDown"), "c");
  assert.equal(nextGame(keys, "a", "ArrowUp"), "a");
  assert.equal(nextGame([], null, "ArrowDown"), null);
});

test("the detail pane shows the title and description, escaped", async () => {
  const { gameDetailPane, gamesPanes } = await import("../web/gamesTab.js");
  assert.match(gameDetailPane(null), /Pick a game/);
  const html = gameDetailPane(entry("hades", { title: "Hades <1>", description: "Line one\nLine <two>" }));
  assert.match(html, /Hades &lt;1&gt;/);
  assert.match(html, /Line one\nLine &lt;two&gt;/);
  assert.match(gameDetailPane(entry("x")), /No description yet/);
  const { S } = await import("../web/state.js");
  S.gm.list = [entry("hades")]; S.gm.detail = null; S.mk.profiles = [];
  assert.match(gamesPanes(), /aria-label="Game filters"[\s\S]*aria-label="Games"[\s\S]*aria-label="Game"/);
});
