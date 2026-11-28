// MarketingDb: the one handle on `marketing.db` in the app's data folder, shared by the contact and draft stores.
// The schema version is in `PRAGMA user_version`; a fresh file is created straight at the current version.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { takeGenreLines } from "../domain/contactImport.js";
import { SCALES } from "../domain/contacts.js";
import { entryKey } from "../domain/gameEntries.js";

const VERSION = 9;

const SCHEMA_V1 = `
  CREATE TABLE contacts (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, types TEXT NOT NULL, topic TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '', reach INTEGER, notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active', next TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE channels (
    contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    position INTEGER NOT NULL, kind TEXT NOT NULL, url TEXT NOT NULL
  );
  CREATE TABLE fit (
    contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    game TEXT NOT NULL, reason TEXT NOT NULL, PRIMARY KEY (contact_id, game)
  );
  CREATE TABLE touches (
    id INTEGER PRIMARY KEY, contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    date TEXT NOT NULL, kind TEXT NOT NULL, game TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX touches_contact ON touches(contact_id);
`;

// v2: mail drafts, and a note (mail subject) and ref (Message-ID, logged once) on a touch.
const V2 = `
  ALTER TABLE touches ADD COLUMN note TEXT NOT NULL DEFAULT '';
  ALTER TABLE touches ADD COLUMN ref TEXT NOT NULL DEFAULT '';
  CREATE UNIQUE INDEX touches_ref ON touches(ref) WHERE ref <> '';
  CREATE TABLE drafts (
    id INTEGER PRIMARY KEY, contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    game TEXT NOT NULL, template TEXT NOT NULL, personal TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL, body TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'draft',
    created TEXT NOT NULL, sent_at TEXT NOT NULL DEFAULT '', message_id TEXT NOT NULL DEFAULT '',
    error TEXT NOT NULL DEFAULT '', labeled INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX drafts_contact ON drafts(contact_id);
`;

// v3: the event of a festival or conference contact (one row per contact; lists are comma separated).
const V3 = `
  CREATE TABLE events (
    contact_id INTEGER PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
    year INTEGER NOT NULL, starts TEXT NOT NULL DEFAULT '', ends TEXT NOT NULL DEFAULT '', deadline TEXT NOT NULL DEFAULT '',
    cost TEXT NOT NULL DEFAULT '', place TEXT NOT NULL DEFAULT '', genres TEXT NOT NULL DEFAULT '', stages TEXT NOT NULL DEFAULT '',
    platforms TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT 'watching'
  );
  CREATE INDEX events_deadline ON events(deadline);
`;

// v4: genres (comma separated tags) and about on a contact; a `Genre: x` line the old import left in the notes moves to genres.
const V4 = `
  ALTER TABLE contacts ADD COLUMN genres TEXT NOT NULL DEFAULT '';
  ALTER TABLE contacts ADD COLUMN about TEXT NOT NULL DEFAULT '';
`;

// v5: a special relationship on a contact, a one-line reason (empty: none).
const V5 = `ALTER TABLE contacts ADD COLUMN special TEXT NOT NULL DEFAULT '';`;

// v6: reddit, scales (comma separated labels), a scale note and a checked date on a contact; followers and a last-active date on a channel. Rows keep their values.
const V6 = `
  ALTER TABLE contacts ADD COLUMN reddit TEXT NOT NULL DEFAULT '';
  ALTER TABLE contacts ADD COLUMN scales TEXT NOT NULL DEFAULT '';
  ALTER TABLE contacts ADD COLUMN scale_note TEXT NOT NULL DEFAULT '';
  ALTER TABLE contacts ADD COLUMN checked TEXT NOT NULL DEFAULT '';
  ALTER TABLE channels ADD COLUMN followers INTEGER;
  ALTER TABLE channels ADD COLUMN active TEXT NOT NULL DEFAULT '';
`;

// v7: the games a creator played, reviewed or streamed (one row per contact and title, any case).
const V7 = `
  CREATE TABLE games (
    contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    title TEXT NOT NULL COLLATE NOCASE, scales TEXT NOT NULL, kind TEXT NOT NULL, date TEXT NOT NULL,
    source TEXT NOT NULL, genres TEXT NOT NULL DEFAULT '', PRIMARY KEY (contact_id, title)
  );
`;

// v8: the date a channel was seen dead (suspended, deleted); empty: alive.
const V8 = `ALTER TABLE channels ADD COLUMN dead TEXT NOT NULL DEFAULT '';`;

// v9: one entry per covered game (key: the title trimmed, lower case) owning its scale and genres, and comps: an entry marked as comparable to a game profile.
// Lists are comma separated; stores, trackers and sources are JSON text; numbers are nullable.
const V9 = `
  CREATE TABLE game_entries (
    key TEXT PRIMARY KEY, title TEXT NOT NULL,
    developer TEXT NOT NULL DEFAULT '', publisher TEXT NOT NULL DEFAULT '', "release" TEXT NOT NULL DEFAULT '', stage TEXT NOT NULL DEFAULT '',
    platforms TEXT NOT NULL DEFAULT '', stores TEXT NOT NULL DEFAULT '{}', trackers TEXT NOT NULL DEFAULT '{}',
    description TEXT NOT NULL DEFAULT '', hook TEXT NOT NULL DEFAULT '', look TEXT NOT NULL DEFAULT '', team TEXT NOT NULL DEFAULT '',
    dev_time TEXT NOT NULL DEFAULT '', festivals TEXT NOT NULL DEFAULT '', early_access TEXT NOT NULL DEFAULT '', rating_label TEXT NOT NULL DEFAULT '',
    worked TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', genres TEXT NOT NULL DEFAULT '', keywords TEXT NOT NULL DEFAULT '',
    modes TEXT NOT NULL DEFAULT '', scales TEXT NOT NULL DEFAULT '',
    price REAL, launch_price REAL, reviews INTEGER, sales INTEGER, revenue INTEGER, peak_players INTEGER, followers INTEGER, languages INTEGER,
    rating INTEGER, metacritic INTEGER, opencritic INTEGER, playtime REAL,
    sales_source TEXT NOT NULL DEFAULT '', demo TEXT NOT NULL DEFAULT '', sources TEXT NOT NULL DEFAULT '[]', checked TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE comps (
    entry_key TEXT NOT NULL REFERENCES game_entries(key) ON DELETE CASCADE,
    game TEXT NOT NULL, reason TEXT NOT NULL, PRIMARY KEY (entry_key, game)
  );
`;

export class MarketingDb {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, "marketing.db");
    this.handle = null;
  }

  /** Opened on first use, so a command that never touches contacts leaves no file behind. */
  get db() {
    if (!this.handle) {
      fs.mkdirSync(this.dir, { recursive: true });
      const db = new DatabaseSync(this.file);
      db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000");
      this.handle = db;
      try { this.#migrate(); } catch (e) { this.close(); throw e; }
    }
    return this.handle;
  }

  close() { this.handle?.close(); this.handle = null; }

  atomic(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try { const out = fn(); this.db.exec("COMMIT"); return out; } catch (err) { this.db.exec("ROLLBACK"); throw err; }
  }

  #migrate() {
    const { user_version: v } = this.db.prepare("PRAGMA user_version").get();
    if (v > VERSION) throw new Error(`${this.file} is version ${v}; this Doit knows ${VERSION}`);
    if (v === VERSION) return;
    this.atomic(() => {
      if (v < 1) this.db.exec(SCHEMA_V1);
      if (v < 2) this.db.exec(V2);
      if (v < 3) this.db.exec(V3);
      if (v < 4) this.#genresFromNotes();
      if (v < 5) this.db.exec(V5);
      if (v < 6) this.db.exec(V6);
      if (v < 7) this.db.exec(V7);
      if (v < 8) this.db.exec(V8);
      if (v < 9) this.#entriesFromGames();
      this.db.exec(`PRAGMA user_version = ${VERSION}`);
    });
  }

  #genresFromNotes() {
    this.db.exec(V4);
    const set = this.db.prepare("UPDATE contacts SET genres = ?, notes = ? WHERE id = ?");
    for (const r of this.db.prepare("SELECT id, notes FROM contacts WHERE notes LIKE '%Genre: %'").all()) {
      const { genres, notes } = takeGenreLines(r.notes);
      if (genres.length) set.run(genres.join(","), notes, r.id);
    }
  }

  /** One entry per distinct title of `games` (any case): the title as first written, scales and genres the union of its rows. */
  #entriesFromGames() {
    this.db.exec(V9);
    const entries = new Map();
    for (const r of this.db.prepare("SELECT title, scales, genres FROM games ORDER BY rowid").all()) {
      const e = entries.get(entryKey(r.title)) ?? entries.set(entryKey(r.title), { title: r.title, scales: new Set(), genres: new Map() }).get(entryKey(r.title));
      for (const x of r.scales.split(",")) if (x) e.scales.add(x);
      for (const g of r.genres.split(",")) if (g && !e.genres.has(g.toLowerCase())) e.genres.set(g.toLowerCase(), g);
    }
    const add = this.db.prepare("INSERT INTO game_entries (key, title, scales, genres) VALUES (?, ?, ?, ?)");
    for (const [key, e] of entries) add.run(key, e.title, SCALES.filter(x => e.scales.has(x)).join(","), [...e.genres.values()].join(","));
  }
}
