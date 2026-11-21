// MarketingDb: the one handle on `marketing.db` in the app's data folder, shared by the contact and draft stores.
// The schema version is in `PRAGMA user_version`; a fresh file is created straight at the current version.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { takeGenreLines } from "../domain/contactImport.js";

const VERSION = 5;

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
}
