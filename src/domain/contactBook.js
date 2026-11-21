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

  #id(id) {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1) throw new ContactError(`Not a contact id: ${id}`);
    return n;
  }
}
