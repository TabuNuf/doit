// T-023.6: the Contacts list as columns with sortable headers; Last active is the newest reply or video.
import test from "node:test";
import assert from "node:assert/strict";
import { ContactBook } from "../src/domain/contactBook.js";
import { MemoryContacts } from "./memoryContacts.js";

const shelf = { list: () => [{ game: "bunny-bunker" }], has: g => g === "bunny-bunker" };

test("Last active is the newest reply or video touch, Last contact the newest touch of any kind", () => {
  const b = new ContactBook(new MemoryContacts(), shelf, () => new Date("2026-11-21T10:00:00"));
  b.add({ name: "Ada", types: ["influencer"] });
  b.addTouch(1, { kind: "reply", date: "2026-09-01" });
  b.addTouch(1, { kind: "video", date: "2026-10-01", game: "bunny-bunker" });
  b.addTouch(1, { kind: "mail", date: "2026-11-01", game: "bunny-bunker" });
  const c = b.list()[0];
  assert.deepEqual([c.last, c.active], ["2026-11-01", "2026-10-01"]);
  b.add({ name: "Bit", types: ["press"] });
  b.addTouch(2, { kind: "mail", date: "2026-11-02" });
  assert.equal(b.get(2).active, "");
});

test("the list has six headers; a click sorts by Last contact newest first, then Last active, again reverses, and the choice is the saved state", async () => {
  const { listPane } = await import("../web/marketingView.js");
  const { clickSort, orderContacts } = await import("../web/contactColumns.js");
  const mk = (id, name, last, active) => ({ id, name, types: ["influencer"], reach: id * 100, status: "active", next: "", due: false, last, active, fit: [] });
  const list = [mk(1, "Ada", "2026-10-01", "2026-11-05"), mk(2, "Bit", "2026-11-10", ""), mk(3, "Cog", "2026-09-01", "2026-08-01")];
  const heads = listPane(list, null).match(/data-mk-sort="(\w+)"/g).map(s => s.slice(14, -1));
  assert.deepEqual(heads, ["name", "type", "reach", "status", "last", "active"]);
  for (const h of ["Name", "Type", "Reach", "Status", "Last contact", "Last active"]) assert.ok(listPane(list, null).includes(`>${h}</button>`), h);

  let sort = clickSort(null, "last");
  assert.deepEqual(orderContacts(list, sort).map(c => c.id), [2, 1, 3]);
  const order = html => [...html.matchAll(/data-contact="(\d)"/g)].map(m => Number(m[1]));
  assert.deepEqual(order(listPane(list, null, null, null, false, sort)), [2, 1, 3]);
  sort = clickSort(sort, "active");
  assert.deepEqual(orderContacts(list, sort).map(c => c.id), [1, 3, 2]);
  sort = clickSort(sort, "active");
  assert.deepEqual(orderContacts(list, sort).map(c => c.id), [2, 3, 1]);
  assert.match(listPane(list, null, null, null, false, sort), /data-mk-sort="active" aria-sort="ascending"/);
  assert.deepEqual(orderContacts(list, clickSort(null, "name")).map(c => c.id), [1, 2, 3]);
});

test("a header click saves the sort in the browser and redraws", async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const { S } = await import("../web/state.js");
  const { marketingClick } = await import("../web/marketingView.js");
  assert.equal(marketingClick({ mkSort: "last" }), true);
  assert.deepEqual(S.mk.sort, { key: "last", dir: "desc" });
  assert.deepEqual(JSON.parse(store.get("doit.contacts.sort")), { key: "last", dir: "desc" });
  S.mk.sort = null;
  delete globalThis.localStorage;
});
