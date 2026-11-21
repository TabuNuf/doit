// SqliteContacts: the ContactSource port on `marketing.db` in the app's data folder.
// The schema version is in `PRAGMA user_version`; the file is created on first open.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const VERSION = 1;

const SCHEMA = `
  CREATE TABLE contacts (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, types TEXT NOT NULL, topic TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '', reach TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
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

export class SqliteContacts {
  constructor(dir) {
    this.file = path.join(dir, "marketing.db");
    fs.mkdirSync(dir, { recursive: true });
    this.db = new DatabaseSync(this.file);
    this.db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000");
    this.#migrate();
  }

  close() { this.db.close(); }

  all() {
    const by = (sql, key = r => r.contact_id) => {
      const m = new Map();
      for (const r of this.db.prepare(sql).all()) (m.get(key(r)) ?? m.set(key(r), []).get(key(r))).push(r);
      return m;
    };
    const channels = by("SELECT contact_id, kind, url FROM channels ORDER BY position");
    const fit = by("SELECT contact_id, game, reason FROM fit ORDER BY game");
    const touches = by("SELECT contact_id, date, kind, game FROM touches ORDER BY date DESC, id DESC");
    return this.db.prepare("SELECT * FROM contacts ORDER BY id").all().map(r => ({
      id: r.id, name: r.name, types: r.types.split(","), topic: r.topic, email: r.email, reach: r.reach,
      notes: r.notes, status: r.status, next: r.next,
      channels: (channels.get(r.id) ?? []).map(({ kind, url }) => ({ kind, url })),
      fit: (fit.get(r.id) ?? []).map(({ game, reason }) => ({ game, reason })),
      touches: (touches.get(r.id) ?? []).map(({ date, kind, game }) => ({ date, kind, game })),
    }));
  }

  get(id) { return this.all().find(c => c.id === id) ?? null; }

  insert(c) {
    return this.#atomic(() => {
      const r = this.db.prepare("INSERT INTO contacts (name, types, topic, email, reach, notes, status, next) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(c.name, c.types.join(","), c.topic, c.email, c.reach, c.notes, c.status, c.next);
      const id = Number(r.lastInsertRowid);
      this.#channels(id, c.channels);
      return id;
    });
  }

  /** Replaces the contact's fields and channels; fit and touches stay. */
  update(id, c) {
    this.#atomic(() => {
      this.db.prepare("UPDATE contacts SET name = ?, types = ?, topic = ?, email = ?, reach = ?, notes = ?, status = ?, next = ? WHERE id = ?")
        .run(c.name, c.types.join(","), c.topic, c.email, c.reach, c.notes, c.status, c.next, id);
      this.db.prepare("DELETE FROM channels WHERE contact_id = ?").run(id);
      this.#channels(id, c.channels);
    });
  }

  setFit(id, game, reason) {
    this.db.prepare("INSERT INTO fit (contact_id, game, reason) VALUES (?, ?, ?) ON CONFLICT (contact_id, game) DO UPDATE SET reason = excluded.reason")
      .run(id, game, reason);
  }

  addTouch(id, { date, kind, game = "" }) {
    this.db.prepare("INSERT INTO touches (contact_id, date, kind, game) VALUES (?, ?, ?, ?)").run(id, date, kind, game);
  }

  #channels(id, list) {
    const add = this.db.prepare("INSERT INTO channels (contact_id, position, kind, url) VALUES (?, ?, ?, ?)");
    list.forEach((ch, i) => add.run(id, i, ch.kind, ch.url));
  }

  #atomic(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try { const out = fn(); this.db.exec("COMMIT"); return out; } catch (err) { this.db.exec("ROLLBACK"); throw err; }
  }

  #migrate() {
    const { user_version: v } = this.db.prepare("PRAGMA user_version").get();
    if (v > VERSION) throw new Error(`${this.file} is version ${v}; this Doit knows ${VERSION}`);
    if (v === VERSION) return;
    this.#atomic(() => { this.db.exec(SCHEMA); this.db.exec(`PRAGMA user_version = ${VERSION}`); });
  }
}
