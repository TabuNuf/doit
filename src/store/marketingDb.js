// MarketingDb: the one handle on `marketing.db` in the app's data folder, shared by the contact and draft stores.
// The schema version is in `PRAGMA user_version`; a fresh file is created straight at the current version.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const VERSION = 2;

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
      this.db.exec(`PRAGMA user_version = ${VERSION}`);
    });
  }
}
