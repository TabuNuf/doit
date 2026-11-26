import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MarketingDb } from "../src/store/marketingDb.js";
import { DatabaseSync } from "node:sqlite";
import { SqliteDrafts } from "../src/store/sqliteDrafts.js";
import { SqliteContacts } from "../src/store/sqliteContacts.js";
import { ContactBook } from "../src/domain/contactBook.js";

const open = dir => { const m = new MarketingDb(dir); return Object.assign(new SqliteContacts(m), { close: () => m.close() }); };
function home() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "doit-contacts-")), "home"); }

const ADA = {
  name: "Ada Plays", types: ["influencer", "blogger"], topic: "", email: "ada@example.test", reach: 12400, genres: ["Co-op"], about: "Cozy co-op streamer.", notes: "Likes co-op.\nSecond line.",
  status: "active", next: "2026-12-01", special: "", reddit: "https://www.reddit.com/r/ada", scales: ["indie", "aa"], scaleNote: "5 of 20 indie", checked: "2026-11-20",
  channels: [{ kind: "youtube", url: "https://youtube.example.test/ada", followers: 12400, active: "2026-11-19" }, { kind: "bluesky", url: "https://bsky.example.test/ada", followers: null, active: "" }],
  event: null,
};

// What a version 5 file lacks.
const DOWN6 = "DROP TABLE games; ALTER TABLE contacts DROP COLUMN reddit; ALTER TABLE contacts DROP COLUMN scales; ALTER TABLE contacts DROP COLUMN scale_note; ALTER TABLE contacts DROP COLUMN checked; ALTER TABLE channels DROP COLUMN followers; ALTER TABLE channels DROP COLUMN active; ";

test("a contact with channels, fit and touches is read back after reopening", () => {
  const dir = home();
  const a = open(dir);
  const id = a.insert(ADA);
  a.setFit(id, "bunny-bunker", "plays co-op");
  a.setFit(id, "good-box", "likes puzzles");
  const G = { title: "Tiny Quest", scales: ["solo"], kind: "reviewed", date: "2026-11-02", source: "https://youtu.be/x", genres: ["rpg"] };
  a.setGame(id, G);
  a.setGame(id, { ...G, title: "tiny quest", kind: "played" });
  a.addTouch(id, { date: "2026-11-01", kind: "mail", game: "bunny-bunker" });
  a.addTouch(id, { date: "2026-11-05", kind: "reply", game: "bunny-bunker" });
  a.addTouch(id, { date: "2026-11-05", kind: "video", game: "" });
  a.close();
  const b = open(dir);
  const [c] = b.all();
  assert.deepEqual(c, {
    ...ADA, id,
    fit: [{ game: "bunny-bunker", reason: "plays co-op" }, { game: "good-box", reason: "likes puzzles" }],
    games: [{ ...G, title: "tiny quest", kind: "played" }],
    touches: [{ date: "2026-11-05", kind: "video", game: "", note: "" }, { date: "2026-11-05", kind: "reply", game: "bunny-bunker", note: "" }, { date: "2026-11-01", kind: "mail", game: "bunny-bunker", note: "" }],
  });
  assert.deepEqual(b.get(id), c);
  assert.equal(b.get(99), null);
  b.close();
});

test("the file and its schema version are made on first open and kept on the next", () => {
  const dir = home();
  const s = open(dir);
  assert.ok(!fs.existsSync(path.join(dir, "marketing.db")), "not created before first use");
  s.all();
  s.close();
  assert.ok(fs.existsSync(path.join(dir, "marketing.db")));
  const b = open(dir);
  assert.equal(b.db.prepare("PRAGMA user_version").get().user_version, 7);
  b.close();
});

test("a file from a newer schema is refused", () => {
  const dir = home();
  const a = open(dir);
  a.db.exec("PRAGMA user_version = 8");
  a.close();
  assert.throws(() => open(dir).all(), /version 8/);
});

test("update replaces fields and channels and keeps fit and touches; a second fit replaces the reason", () => {
  const dir = home();
  const s = open(dir);
  const id = s.insert(ADA);
  s.setFit(id, "good-box", "old");
  s.addTouch(id, { date: "2026-11-01", kind: "mail" });
  s.update(id, { ...ADA, status: "dormant", channels: [{ kind: "twitch", url: "https://twitch.example.test/ada" }] });
  s.setFit(id, "good-box", "new");
  const c = s.get(id);
  assert.equal(c.status, "dormant");
  assert.deepEqual(c.channels, [{ kind: "twitch", url: "https://twitch.example.test/ada", followers: null, active: "" }]);
  assert.deepEqual(c.fit, [{ game: "good-box", reason: "new" }]);
  assert.equal(c.touches.length, 1);
  s.close();
});

test("two connections see each other's writes (CLI and server share the file)", () => {
  const dir = home();
  const a = open(dir);
  const b = open(dir);
  a.insert(ADA);
  assert.equal(b.all().length, 1);
  a.close();
  b.close();
});

test("the ContactBook works over the store", () => {
  const dir = home();
  const store = open(dir);
  const book = new ContactBook(store, { has: g => g === "good-box", list: () => [] }, () => new Date("2026-12-02T08:00:00"));
  book.add({ name: "Ada", types: ["press"], next: "2026-12-01" });
  assert.equal(book.list({ due: true }).length, 1);
  assert.throws(() => book.setFit(1, "x", "y"), /No profile/);
  store.close();
});

test("a touch keeps its note, and one whose ref is already logged is not added again", () => {
  const s = open(home());
  const id = s.insert(ADA);
  s.addTouch(id, { date: "2026-11-01", kind: "mail", game: "good-box", note: "Hello", ref: "<a@example.com>" });
  s.addTouch(id, { date: "2026-11-02", kind: "mail", game: "good-box", note: "Hello", ref: "<a@example.com>" });
  s.addTouch(id, { date: "2026-11-02", kind: "video" });
  s.addTouch(id, { date: "2026-11-02", kind: "video" });
  assert.deepEqual(s.get(id).touches.map(t => [t.kind, t.note]), [["video", ""], ["video", ""], ["mail", "Hello"]]);
  s.close();
});

test("a version 1 file is migrated in place and keeps its contacts and touches", () => {
  const dir = home();
  fs.mkdirSync(dir, { recursive: true });
  const old = new DatabaseSync(path.join(dir, "marketing.db"));
  old.exec(`
    CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, types TEXT NOT NULL, topic TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '', reach INTEGER, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', next TEXT NOT NULL DEFAULT '');
    CREATE TABLE channels (contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE, position INTEGER NOT NULL, kind TEXT NOT NULL, url TEXT NOT NULL);
    CREATE TABLE fit (contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE, game TEXT NOT NULL, reason TEXT NOT NULL, PRIMARY KEY (contact_id, game));
    CREATE TABLE touches (id INTEGER PRIMARY KEY, contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      date TEXT NOT NULL, kind TEXT NOT NULL, game TEXT NOT NULL DEFAULT '');
    CREATE INDEX touches_contact ON touches(contact_id);
    INSERT INTO contacts (name, types) VALUES ('Old Contact', 'press');
    INSERT INTO touches (contact_id, date, kind, game) VALUES (1, '2026-10-01', 'mail', 'good-box');
    PRAGMA user_version = 1;
  `);
  old.close();
  const m = new MarketingDb(dir);
  const store = new SqliteContacts(m);
  assert.deepEqual(store.get(1).touches, [{ date: "2026-10-01", kind: "mail", game: "good-box", note: "" }]);
  assert.equal(m.db.prepare("PRAGMA user_version").get().user_version, 7);
  assert.equal(new SqliteDrafts(m).all().length, 0);
  store.addTouch(1, { date: "2026-11-01", kind: "mail", note: "S", ref: "<x@example.com>" });
  assert.equal(store.get(1).touches.length, 2);
  m.close();
});

test("a version 2 file is migrated, keeps its contacts and drafts, and reads an event back", () => {
  const dir = home();
  fs.mkdirSync(dir, { recursive: true });
  // The schema as EPIC-013 left it: version 1 plus the drafts table and the touch note and ref.
  const old = new DatabaseSync(path.join(dir, "marketing.db"));
  old.exec(`
    CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, types TEXT NOT NULL, topic TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '', reach INTEGER, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', next TEXT NOT NULL DEFAULT '');
    CREATE TABLE channels (contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE, position INTEGER NOT NULL, kind TEXT NOT NULL, url TEXT NOT NULL);
    CREATE TABLE fit (contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE, game TEXT NOT NULL, reason TEXT NOT NULL, PRIMARY KEY (contact_id, game));
    CREATE TABLE touches (id INTEGER PRIMARY KEY, contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      date TEXT NOT NULL, kind TEXT NOT NULL, game TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', ref TEXT NOT NULL DEFAULT '');
    CREATE UNIQUE INDEX touches_ref ON touches(ref) WHERE ref <> '';
    CREATE TABLE drafts (id INTEGER PRIMARY KEY, contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      game TEXT NOT NULL, template TEXT NOT NULL, personal TEXT NOT NULL DEFAULT '', subject TEXT NOT NULL, body TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'draft', created TEXT NOT NULL, sent_at TEXT NOT NULL DEFAULT '', message_id TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT '', labeled INTEGER NOT NULL DEFAULT 0);
    INSERT INTO contacts (name, types) VALUES ('Old Contact', 'press');
    INSERT INTO drafts (contact_id, game, template, subject, body, created) VALUES (1, 'good-box', 'pitch', 'S', 'B', '2026-11-01');
    PRAGMA user_version = 2;
  `);
  old.close();
  const m = new MarketingDb(dir);
  const store = new SqliteContacts(m);
  assert.equal(store.get(1).event, null);
  assert.equal(m.db.prepare("PRAGMA user_version").get().user_version, 7);
  assert.equal(new SqliteDrafts(m).all().length, 1);
  const event = {
    year: 2027, starts: "2027-02-23", ends: "2027-03-02", deadline: "2027-01-15", cost: "free", where: "steam",
    criteria: { genres: ["puzzle", "co-op"], stages: ["demo"], platforms: [] }, state: "watching",
  };
  const fest = { ...ADA, name: "Next Fest", types: ["festival"] };
  const id = store.insert({ ...fest, event });
  assert.deepEqual(store.get(id).event, event);
  store.update(id, { ...fest, event: { ...event, state: "applied" } });
  assert.equal(store.get(id).event.state, "applied");
  store.update(id, { ...fest, event: null });
  assert.equal(store.get(id).event, null);
  m.close();
  assert.equal(open(dir).get(1).name, "Old Contact");
});

test("a version 3 file is migrated: genres and about appear, a Genre line leaves the notes", () => {
  const dir = home();
  const first = new MarketingDb(dir);
  first.db.exec("DROP TABLE IF EXISTS contacts_old");
  first.db.exec(DOWN6 + "ALTER TABLE contacts DROP COLUMN genres; ALTER TABLE contacts DROP COLUMN about; ALTER TABLE contacts DROP COLUMN special; PRAGMA user_version = 3");
  first.db.exec("INSERT INTO contacts (name, types, notes) VALUES ('Old', 'influencer', 'Hi\nGenre: Indie, Horror\nPlatform: PC'), ('Plain', 'press', 'Genre-less')");
  first.close();
  const store = new SqliteContacts(new MarketingDb(dir));
  const [old, plain] = store.all();
  assert.deepEqual([old.genres, old.notes, old.about], [["Indie", "Horror"], "Hi\nPlatform: PC", ""]);
  assert.deepEqual([plain.genres, plain.notes], [[], "Genre-less"]);
  store.close();
});

test("a version 4 file is migrated: special appears empty, contacts stay, and a reason is stored and cleared", () => {
  const dir = home();
  const first = new MarketingDb(dir);
  first.db.exec(DOWN6 + "ALTER TABLE contacts DROP COLUMN special; PRAGMA user_version = 4");
  first.db.exec("INSERT INTO contacts (name, types) VALUES ('Old', 'influencer')");
  first.close();
  const store = new SqliteContacts(new MarketingDb(dir));
  assert.equal(store.get(1).special, "");
  assert.equal(store.db.prepare("PRAGMA user_version").get().user_version, 7);
  store.update(1, { ...ADA, special: "Friend since 2019" });
  assert.equal(store.get(1).special, "Friend since 2019");
  store.update(1, { ...ADA, special: "" });
  assert.equal(store.get(1).special, "");
  store.close();
});
