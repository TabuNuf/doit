// SqliteDrafts: the drafts port on `marketing.db`. A draft's `sentAt` starts with the local day (YYYY-MM-DD),
// which `sentOn` counts.

const toDraft = r => ({
  id: r.id, contact: r.contact_id, game: r.game, template: r.template, personal: r.personal, subject: r.subject, body: r.body,
  state: r.state, created: r.created, sentAt: r.sent_at, messageId: r.message_id, error: r.error, labeled: Boolean(r.labeled),
});

export class SqliteDrafts {
  constructor(marketingDb) { this.store = marketingDb; }

  get db() { return this.store.db; }

  /** Newest first; filter {state, contact} both optional. */
  all({ state, contact } = {}) {
    return this.db.prepare("SELECT * FROM drafts ORDER BY id DESC").all().map(toDraft)
      .filter(d => (!state || d.state === state) && (!contact || d.contact === contact));
  }

  get(id) {
    const r = this.db.prepare("SELECT * FROM drafts WHERE id = ?").get(id);
    return r ? toDraft(r) : null;
  }

  insert(d) {
    const r = this.db.prepare(`INSERT INTO drafts (contact_id, game, template, personal, subject, body, state, created, sent_at, message_id, error, labeled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(d.contact, d.game, d.template, d.personal, d.subject, d.body, d.state, d.created, d.sentAt, d.messageId, d.error, d.labeled ? 1 : 0);
    return Number(r.lastInsertRowid);
  }

  update(id, d) {
    this.db.prepare(`UPDATE drafts SET game = ?, template = ?, personal = ?, subject = ?, body = ?, state = ?, created = ?,
      sent_at = ?, message_id = ?, error = ?, labeled = ? WHERE id = ?`)
      .run(d.game, d.template, d.personal, d.subject, d.body, d.state, d.created, d.sentAt, d.messageId, d.error, d.labeled ? 1 : 0, id);
  }

  remove(id) { this.db.prepare("DELETE FROM drafts WHERE id = ?").run(id); }

  /** How many drafts were sent on `day` (YYYY-MM-DD). */
  sentOn(day) {
    return this.db.prepare("SELECT COUNT(*) AS n FROM drafts WHERE state = 'sent' AND substr(sent_at, 1, 10) = ?").get(day).n;
  }
}
