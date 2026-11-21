import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SqliteContacts } from "../src/store/sqliteContacts.js";
import { ContactBook } from "../src/domain/contactBook.js";

function home() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "doit-contacts-")), "home"); }

const ADA = {
  name: "Ada Plays", types: ["influencer", "blogger"], topic: "", email: "ada@example.test", reach: "B", notes: "Likes co-op.\nSecond line.",
  status: "active", next: "2026-12-01",
  channels: [{ kind: "youtube", url: "https://youtube.example.test/ada" }, { kind: "bluesky", url: "https://bsky.example.test/ada" }],
};

test("a contact with channels, fit and touches is read back after reopening", () => {
  const dir = home();
  const a = new SqliteContacts(dir);
  const id = a.insert(ADA);
  a.setFit(id, "bunny-bunker", "plays co-op");
  a.setFit(id, "good-box", "likes puzzles");
  a.addTouch(id, { date: "2026-11-01", kind: "mail", game: "bunny-bunker" });
  a.addTouch(id, { date: "2026-11-05", kind: "reply", game: "bunny-bunker" });
  a.addTouch(id, { date: "2026-11-05", kind: "video", game: "" });
  a.close();
  const b = new SqliteContacts(dir);
  const [c] = b.all();
  assert.deepEqual(c, {
    ...ADA, id,
    fit: [{ game: "bunny-bunker", reason: "plays co-op" }, { game: "good-box", reason: "likes puzzles" }],
    touches: [{ date: "2026-11-05", kind: "video", game: "" }, { date: "2026-11-05", kind: "reply", game: "bunny-bunker" }, { date: "2026-11-01", kind: "mail", game: "bunny-bunker" }],
  });
  assert.deepEqual(b.get(id), c);
  assert.equal(b.get(99), null);
  b.close();
});

test("the file and its schema version are made on first open and kept on the next", () => {
  const dir = home();
  const s = new SqliteContacts(dir);
  assert.ok(!fs.existsSync(path.join(dir, "marketing.db")), "not created before first use");
  s.all();
  s.close();
  assert.ok(fs.existsSync(path.join(dir, "marketing.db")));
  const b = new SqliteContacts(dir);
  assert.equal(b.db.prepare("PRAGMA user_version").get().user_version, 1);
  b.close();
});

test("a file from a newer schema is refused", () => {
  const dir = home();
  const a = new SqliteContacts(dir);
  a.db.exec("PRAGMA user_version = 2");
  a.close();
  assert.throws(() => new SqliteContacts(dir).all(), /version 2/);
});

test("update replaces fields and channels and keeps fit and touches; a second fit replaces the reason", () => {
  const dir = home();
  const s = new SqliteContacts(dir);
  const id = s.insert(ADA);
  s.setFit(id, "good-box", "old");
  s.addTouch(id, { date: "2026-11-01", kind: "mail" });
  s.update(id, { ...ADA, status: "dormant", channels: [{ kind: "twitch", url: "https://twitch.example.test/ada" }] });
  s.setFit(id, "good-box", "new");
  const c = s.get(id);
  assert.equal(c.status, "dormant");
  assert.deepEqual(c.channels, [{ kind: "twitch", url: "https://twitch.example.test/ada" }]);
  assert.deepEqual(c.fit, [{ game: "good-box", reason: "new" }]);
  assert.equal(c.touches.length, 1);
  s.close();
});

test("two connections see each other's writes (CLI and server share the file)", () => {
  const dir = home();
  const a = new SqliteContacts(dir);
  const b = new SqliteContacts(dir);
  a.insert(ADA);
  assert.equal(b.all().length, 1);
  a.close();
  b.close();
});

test("the ContactBook works over the store", () => {
  const dir = home();
  const store = new SqliteContacts(dir);
  const book = new ContactBook(store, { has: g => g === "good-box", list: () => [] }, () => new Date("2026-12-02T08:00:00"));
  book.add({ name: "Ada", types: ["press"], next: "2026-12-01" });
  assert.equal(book.list({ due: true }).length, 1);
  assert.throws(() => book.setFit(1, "x", "y"), /No profile/);
  store.close();
});
