// ContactBook: the contacts facade the interfaces use. It knows the rules, not the database.
//
// The ContactSource it is given (the store's port):
//   all() -> contacts, get(id) -> contact | null, insert(contact) -> id, update(id, contact) (fields and channels),
//   setFit(id, game, reason), addTouch(id, {date, kind, game}); a contact carries id, fit [{game, reason}], touches [{date, kind, game}] newest first.
// The ProfileShelf it is given: list() -> profiles, has(game) -> bool.

import { makeContact, contactFilter, byReach, isDue, checkDate, checkTouchKind, ContactError } from "./contacts.js";

const day = d => {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const linkKey = url => String(url).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");

export class ContactBook {
  constructor(source, shelf, now = () => new Date()) {
    this.source = source;
    this.shelf = shelf;
    this.now = now;
  }

  today() { return day(this.now()); }

  /** Contacts matching the filter (see `contactFilter`), due ones first, then largest reach. */
  list(filter = {}) {
    const today = this.today();
    const keep = contactFilter(filter, today);
    return this.source.all().filter(keep).map(c => ({ ...c, due: isDue(c, today) }))
      .sort((a, b) => Number(b.due) - Number(a.due) || byReach(a, b));
  }

  get(id) {
    const c = this.source.get(this.#id(id));
    if (!c) throw new ContactError(`No contact ${id}`, 404);
    return { ...c, due: isDue(c, this.today()) };
  }

  add(input) { return this.get(this.source.insert(makeContact(input))); }

  /** Changes named fields; the result is checked as a whole contact before it is written. */
  update(id, changes) {
    const c = this.get(id);
    const { fit, touches, due, id: _id, ...fields } = c;
    this.source.update(c.id, makeContact({ ...fields, ...changes }));
    return this.get(c.id);
  }

  setFit(id, game, reason) {
    const c = this.get(id);
    const g = String(game ?? "").trim();
    if (!this.shelf.has(g)) throw new ContactError(`No profile for game "${game}"`);
    const why = String(reason ?? "").replace(/\s+/g, " ").trim();
    if (!why) throw new ContactError("A fit needs a reason");
    this.source.setFit(c.id, g, why);
    return this.get(c.id);
  }

  addTouch(id, { kind, game = "", date } = {}) {
    const c = this.get(id);
    const g = String(game ?? "").trim();
    if (g && !this.shelf.has(g)) throw new ContactError(`No profile for game "${game}"`);
    this.source.addTouch(c.id, { date: date ? checkDate(date) : this.today(), kind: checkTouchKind(kind), game: g });
    return this.get(c.id);
  }

  profiles() { return this.shelf.list(); }

  /** Rows from `mapStreamers`: a row matches a contact by email, else by YouTube link, and then updates it;
   *  a row with no name and no link is skipped. A touch is added once (same kind and date; with no date, same kind). */
  import(rows) {
    const report = { added: 0, updated: 0, skipped: 0 };
    for (const row of rows) {
      const channels = row.channels ?? [];
      const name = row.name || channels[0]?.url || "";
      if (!name) { report.skipped++; continue; }
      try {
        const known = this.#match(row.email, channels);
        const input = { ...row, name };
        const id = known ? this.#merge(known, input) : this.add(input).id;
        known ? report.updated++ : report.added++;
        for (const t of row.touches ?? []) this.#touchOnce(id, t);
      } catch (e) {
        if (!(e instanceof ContactError)) throw e;
        report.skipped++;
      }
    }
    return report;
  }

  #match(email, channels) {
    const all = this.source.all();
    const mail = String(email ?? "").trim().toLowerCase();
    const byMail = mail && all.find(c => c.email.toLowerCase() === mail);
    if (byMail) return byMail;
    const yt = channels.filter(c => c.kind === "youtube").map(c => linkKey(c.url));
    return all.find(c => c.channels.some(x => x.kind === "youtube" && yt.includes(linkKey(x.url)))) ?? null;
  }

  /** Fills what the row has; what it lacks stays. Channels are added by url, notes replaced. */
  #merge(known, row) {
    const { fit, touches, id, due, ...fields } = known;
    const have = new Set(known.channels.map(c => linkKey(c.url)));
    const more = (row.channels ?? []).filter(c => !have.has(linkKey(c.url)));
    this.source.update(id, makeContact({
      ...fields, name: row.name, email: row.email || known.email, reach: row.reach ?? known.reach,
      notes: row.notes || known.notes, types: [...new Set([...known.types, ...row.types])], channels: [...known.channels, ...more],
    }));
    return id;
  }

  #touchOnce(id, { kind, date }) {
    const have = this.get(id).touches.some(t => t.kind === kind && !t.game && (!date || t.date === date));
    if (!have) this.addTouch(id, { kind, date });
  }

  #id(id) {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1) throw new ContactError(`Not a contact id: ${id}`);
    return n;
  }
}
