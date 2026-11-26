import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MarketingDb } from "../src/store/marketingDb.js";
import { SqliteContacts } from "../src/store/sqliteContacts.js";
import { SqliteGames } from "../src/store/sqliteGames.js";
import { makeEntry, checkEntry } from "../src/domain/gameEntries.js";

const home = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "doit-games-")), "home");
const ADA = { name: "Ada", types: ["press"], topic: "", email: "", reach: null, genres: [], about: "", notes: "", status: "active", next: "", channels: [], event: null };
const game = (title, over = {}) => ({ title, scales: ["indie"], kind: "played", date: "2026-11-01", source: "https://x.example/v", genres: [], ...over });

test("an entry round-trips every field, and a comp is set, reworded and removed", () => {
  const m = new MarketingDb(home());
  const games = new SqliteGames(m);
  const e = checkEntry({ genres: "Action, Co-op", scale: "indie,aa", store: "steam=https://s.example", tracker: "gamalytic=https://g.example", price: "19.99", reviews: "12k",
    sales: "400000", sales_source: "gamalytic", rating: "91", playtime: "7.5", demo: "yes", sources: "https://a.example", release: "2025-01-02", description: "a\nb", dev_time: "2y" }, makeEntry("Hades"));
  games.insert(e);
  assert.deepEqual(games.get("hades"), { ...e, comps: [] });
  assert.equal(games.get("nope"), null);
  games.update("hades", { ...e, price: null, genres: [], stores: {} });
  assert.deepEqual([games.get("hades").price, games.get("hades").genres, games.get("hades").stores], [null, [], {}]);
  games.setComp("hades", "bb", "same pace");
  games.setComp("hades", "gb", "same look");
  games.setComp("hades", "bb", "closer");
  assert.deepEqual(games.get("hades").comps, [{ game: "bb", reason: "closer" }, { game: "gb", reason: "same look" }]);
  games.removeComp("hades", "bb");
  assert.deepEqual(games.get("hades").comps.map(c => c.game), ["gb"]);
  m.close();
});

test("a covered game creates its entry; scales are replaced, genres only when given, the title and the entry stay", () => {
  const m = new MarketingDb(home());
  const contacts = new SqliteContacts(m);
  const games = new SqliteGames(m);
  const id = contacts.insert(ADA);
  contacts.setGame(id, game("Hades", { genres: ["Action"] }));
  assert.deepEqual([games.get("hades").title, games.get("hades").scales, games.get("hades").genres], ["Hades", ["indie"], ["Action"]]);
  contacts.setGame(id, game("HADES", { scales: ["aa"] }));
  const e = games.get("hades");
  assert.deepEqual([e.title, e.scales, e.genres], ["Hades", ["aa"], ["Action"]]);
  assert.deepEqual(contacts.get(id).games.map(g => [g.title, g.scales, g.genres]), [["HADES", ["aa"], ["Action"]]]);
  games.update("hades", { ...e, genres: ["Roguelike"] });
  assert.deepEqual(contacts.get(id).games[0].genres, ["Roguelike"], "the entry owns the genres");
  contacts.removeGame(id, "HADES");
  assert.equal(games.all().length, 1, "removing the last coverage leaves the entry");
  assert.deepEqual(contacts.get(id).games, []);
  m.close();
});

test("a rolled-back setGame leaves no entry", () => {
  const m = new MarketingDb(home());
  const contacts = new SqliteContacts(m);
  assert.throws(() => contacts.setGame(99, game("Ghost")));
  assert.equal(new SqliteGames(m).all().length, 0);
  m.close();
});
