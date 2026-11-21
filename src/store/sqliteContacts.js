// SqliteContacts: the ContactSource port on `marketing.db` in the app's data folder.
// The database handle and its schema come from `MarketingDb`.

export class SqliteContacts {
  constructor(marketingDb) { this.store = marketingDb; }

  get db() { return this.store.db; }

  close() { this.store.close(); }

  all() {
    const by = (sql, key = r => r.contact_id) => {
      const m = new Map();
      for (const r of this.db.prepare(sql).all()) (m.get(key(r)) ?? m.set(key(r), []).get(key(r))).push(r);
      return m;
    };
    const channels = by("SELECT contact_id, kind, url FROM channels ORDER BY position");
    const fit = by("SELECT contact_id, game, reason FROM fit ORDER BY game");
    const touches = by("SELECT contact_id, date, kind, game, note FROM touches ORDER BY date DESC, id DESC");
    return this.db.prepare("SELECT * FROM contacts ORDER BY id").all().map(r => ({
      id: r.id, name: r.name, types: r.types.split(","), topic: r.topic, email: r.email, reach: r.reach,
      notes: r.notes, status: r.status, next: r.next,
      channels: (channels.get(r.id) ?? []).map(({ kind, url }) => ({ kind, url })),
      fit: (fit.get(r.id) ?? []).map(({ game, reason }) => ({ game, reason })),
      touches: (touches.get(r.id) ?? []).map(({ date, kind, game, note }) => ({ date, kind, game, note })),
    }));
  }

  get(id) { return this.all().find(c => c.id === id) ?? null; }

  insert(c) {
    return this.store.atomic(() => {
      const r = this.db.prepare("INSERT INTO contacts (name, types, topic, email, reach, notes, status, next) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(c.name, c.types.join(","), c.topic, c.email, c.reach, c.notes, c.status, c.next);
      const id = Number(r.lastInsertRowid);
      this.#channels(id, c.channels);
      return id;
    });
  }

  /** Replaces the contact's fields and channels; fit and touches stay. */
  update(id, c) {
    this.store.atomic(() => {
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

  /** A touch whose non-empty `ref` is already logged is not added again. */
  addTouch(id, { date, kind, game = "", note = "", ref = "" }) {
    this.db.prepare("INSERT OR IGNORE INTO touches (contact_id, date, kind, game, note, ref) VALUES (?, ?, ?, ?, ?, ?)").run(id, date, kind, game, note, ref);
  }

  #channels(id, list) {
    const add = this.db.prepare("INSERT INTO channels (contact_id, position, kind, url) VALUES (?, ?, ?, ?)");
    list.forEach((ch, i) => add.run(id, i, ch.kind, ch.url));
  }
}
