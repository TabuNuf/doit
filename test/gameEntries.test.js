import test from "node:test";
import assert from "node:assert/strict";
import { makeEntry, checkEntry, estimates, compare, entryFilter, entryKey, SALES_PER_REVIEW } from "../src/domain/gameEntries.js";

const base = () => makeEntry("  Hades ");
const set = (changes, cur = base()) => checkEntry(changes, cur);

test("an entry is keyed by its trimmed lower-case title and starts empty", () => {
  const e = base();
  assert.deepEqual([e.key, e.title, entryKey(" Hades II ")], ["hades", "Hades", "hades ii"]);
  assert.deepEqual([e.genres, e.stores, e.price, e.stage, e.checked], [[], {}, null, "", ""]);
  assert.throws(() => makeEntry("  "), /title/);
});

test("an unknown key, store kind, tracker kind or stage is refused", () => {
  assert.throws(() => set({ colour: "red" }), /Unknown game field/);
  assert.throws(() => set({ store: "ps9=https://x.example" }), /Unknown store/);
  assert.throws(() => set({ tracker: "foo=https://x.example" }), /Unknown tracker/);
  assert.throws(() => set({ stage: "beta" }), /Unknown stage/);
  assert.throws(() => set({ store: "steam=ftp://x" }), /http/);
  assert.throws(() => set({ release: "2026-13-01" }), /YYYY-MM-DD/);
  assert.throws(() => set({ title: "Other" }), /title/);
  assert.equal(set({ title: "HADES" }).title, "HADES");
});

test("keys are read in snake or camel spelling and scale is scales", () => {
  const e = set({ dev_time: "2 years", earlyAccess: "1 year", rating_label: "Very Positive", launch_price: "24.99", scale: "iii, indie", peak_players: "1.2M" });
  assert.deepEqual([e.devTime, e.earlyAccess, e.ratingLabel, e.launchPrice, e.scales, e.peakPlayers], ["2 years", "1 year", "Very Positive", 24.99, ["indie", "triple-i"], 1200000]);
});

test("counts read 12400, 12 400, 12k and 1.2M; bad numbers are refused; empty clears", () => {
  assert.deepEqual(["12400", "12 400", "12k", 12400, "1.2M"].map(v => set({ reviews: v }).reviews), [12400, 12400, 12000, 12400, 1200000]);
  assert.throws(() => set({ reviews: "-1" }), /whole number/);
  assert.throws(() => set({ reviews: "1.5" }), /whole number/);
  assert.throws(() => set({ rating: "101" }), /0 to 100/);
  assert.throws(() => set({ price: "1.999" }), /2 decimals/);
  assert.throws(() => set({ price: "-1" }), /0 or more/);
  assert.equal(set({ price: "0" }).price, 0);
  assert.equal(set({ reviews: "" }, set({ reviews: 5 })).reviews, null);
  assert.equal(set({ playtime: "12.5" }).playtime, 12.5);
});

test("stores and trackers: store adds one kind, stores replaces all, an empty url removes", () => {
  let e = set({ store: "steam=https://s.example/1" });
  e = set({ store: "itch=https://i.example" }, e);
  assert.deepEqual(e.stores, { steam: "https://s.example/1", itch: "https://i.example" });
  assert.deepEqual(set({ store: "steam=" }, e).stores, { itch: "https://i.example" });
  assert.deepEqual(set({ stores: "gog=https://g.example,epic=https://e.example?a=b" }, e).stores, { gog: "https://g.example", epic: "https://e.example?a=b" });
  assert.deepEqual(set({ trackers: { steamdb: "https://db.example" } }).trackers, { steamdb: "https://db.example" });
});

test("sales or revenue without a sales source is refused", () => {
  assert.throws(() => set({ sales: "1000" }), /sales_source/);
  assert.throws(() => set({ revenue: "1000" }), /sales_source/);
  const e = set({ sales: "1000", sales_source: "gamalytic" });
  assert.equal(e.sales, 1000);
  assert.equal(set({ salesSource: "https://gamalytic.example/g" }, e).salesSource, "https://gamalytic.example/g");
  assert.throws(() => set({ salesSource: "nowhere" }), /Unknown sales source/);
  assert.throws(() => set({ salesSource: "" }, e), /sales_source/);
});

test("demo, sources, lists and text fields", () => {
  const e = set({ demo: "Yes", sources: "https://a.example, https://b.example,https://a.example", genres: "Action, action, Roguelike", description: "a\nb" });
  assert.deepEqual([e.demo, e.sources, e.genres, e.description], ["yes", ["https://a.example", "https://b.example"], ["Action", "Roguelike"], "a\nb"]);
  assert.throws(() => set({ demo: "maybe" }), /demo/);
  assert.throws(() => set({ sources: "not a url" }), /http/);
  assert.equal(set({ checked: "2026-11-26" }).checked, "2026-11-26");
});

test("estimates fall back to reviews x 30, then sales x price", () => {
  assert.equal(SALES_PER_REVIEW, 30);
  assert.deepEqual(estimates(base()), { sales: null, salesFrom: null, revenue: null, revenueFrom: null });
  const r = set({ reviews: "1000", price: "10" });
  assert.deepEqual(estimates(r), { sales: 30000, salesFrom: "reviews x 30", revenue: 300000, revenueFrom: "sales x price" });
  const t = set({ reviews: "1000", price: "10", sales: "5000", revenue: "40000", sales_source: "gamalytic" });
  assert.deepEqual(estimates(t), { sales: 5000, salesFrom: "gamalytic", revenue: 40000, revenueFrom: "gamalytic" });
  assert.deepEqual(estimates(set({ sales: "5000", sales_source: "vgchartz", price: "9.99" })), { sales: 5000, salesFrom: "vgchartz", revenue: 49950, revenueFrom: "sales x price" });
});

test("compare lists what the entry shares with a profile, without case", () => {
  const e = set({ genres: "Co-op, Action", keywords: "Cozy, roguelike", scale: "indie,solo", platforms: "PC", store: "switch=https://n.example" });
  const p = { game: "bb", name: "Bunny Bunker", genres: ["co-op", "COZY", "puzzle"], scale: ["indie", "aa"], platforms: ["pc", "Switch", "mac"] };
  assert.deepEqual(compare(e, p), { game: "bb", name: "Bunny Bunker", tags: ["Co-op", "Cozy"], scales: ["indie"], platforms: ["PC", "switch"] });
  assert.deepEqual(compare(base(), p), { game: "bb", name: "Bunny Bunker", tags: [], scales: [], platforms: [] });
});

test("entryFilter narrows by each entry field and refuses bad values", () => {
  const a = set({ genres: "action", keywords: "cozy", scale: "indie", stage: "released", store: "steam=https://s.example", rating: "90", reviews: "5k", checked: "2026-11-01" });
  const b = set({ title: "Hades" });
  const hit = f => [a, b].filter(entryFilter(f)).length;
  assert.deepEqual([hit({}), hit({ genre: "ACTION" }), hit({ keyword: "cozy" }), hit({ scale: "indie" }), hit({ stage: "released" }), hit({ store: "steam" })], [2, 1, 1, 1, 1, 1]);
  assert.deepEqual([hit({ rating: "85" }), hit({ rating: "95" }), hit({ reviews: "5k" }), hit({ reviews: 6000 }), hit({ noFacts: true }), hit({ noFacts: "1" }), hit({ noFacts: "0" })], [1, 0, 1, 0, 1, 1, 2]);
  assert.throws(() => entryFilter({ stage: "x" }), /Unknown stage/);
  assert.throws(() => entryFilter({ store: "x" }), /Unknown store/);
  assert.throws(() => entryFilter({ scale: "x" }), /Unknown scale/);
});
