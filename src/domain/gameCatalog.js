// GameCatalog: the Games facade the interfaces use. It knows the rules, not the database.
//
// The GameSource it is given (the store's port):
//   all() -> entries (each with comps [{game, reason}]), get(key) -> entry | null, insert(entry), update(key, entry),
//   setComp(key, game, reason), removeComp(key, game).
// The ContactBook gives the contacts' covered games (`list({all: true})`, rows title, kind, date, source) and the profiles.

import { ContactError } from "./contacts.js";
import { makeEntry, checkEntry, entryKey, entryFilter, estimates, compare } from "./gameEntries.js";

const line = v => String(v ?? "").replace(/\s+/g, " ").trim();

export class GameCatalog {
  constructor(source, book) {
    this.source = source;
    this.book = book;
  }

  /** Entries matching the filter (see `entryFilter`, plus covered: at least n contacts, comp: marked for a game profile, similar: shares a tag with a profile or is marked for it,
   *  each then with `shared`). Most covered first, then title; `similar` puts the most shared first. */
  list(filter = {}) {
    const keep = entryFilter(filter);
    const covered = this.#count(filter.covered);
    const comp = this.#profile(filter.comp);
    const similar = this.#profile(filter.similar);
    const by = this.#coverage();
    return this.source.all().filter(keep).map(e => {
      const rows = by.get(e.key) ?? [];
      const out = { ...e, coverage: coverageOf(rows), estimates: estimates(e) };
      return similar ? { ...out, shared: compare(e, similar).tags.length } : out;
    }).filter(e => (covered === null || e.coverage.count >= covered)
      && (!comp || e.comps.some(c => c.game === comp.game))
      && (!similar || e.shared > 0 || e.comps.some(c => c.game === similar.game)))
      .sort((a, b) => (b.shared ?? 0) - (a.shared ?? 0) || b.coverage.count - a.coverage.count || a.title.localeCompare(b.title));
  }

  /** The entry as in `list`, plus `coveredBy` (newest first) and `compare` (one per profile, with `comp`: the reason or null). */
  get(title) {
    const e = this.#entry(title);
    const rows = this.#coverage().get(e.key) ?? [];
    const profiles = this.book.profiles();
    return {
      ...e, coverage: coverageOf(rows), estimates: estimates(e),
      coveredBy: [...rows].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name)),
      compare: profiles.map(p => ({ ...compare(e, p), comp: e.comps.find(c => c.game === p.game)?.reason ?? null })),
    };
  }

  add(title) {
    const entry = makeEntry(title);
    if (this.source.get(entry.key)) throw new ContactError(`Game "${entry.title}" already has an entry`);
    this.source.insert(entry);
    return this.get(entry.key);
  }

  /** Changes named fields (see `checkEntry`); the result is checked as a whole entry before it is written. */
  set(title, changes) {
    const { comps, ...current } = this.#entry(title);
    this.source.update(current.key, checkEntry(changes, current));
    return this.get(current.key);
  }

  setComp(title, game, reason) {
    const e = this.#entry(title);
    const g = line(game);
    if (!this.book.profiles().some(p => p.game === g)) throw new ContactError(`No profile for game "${game}"`);
    const why = line(reason);
    if (!why) throw new ContactError("A comp needs a reason");
    this.source.setComp(e.key, g, why);
    return this.get(e.key);
  }

  removeComp(title, game) {
    const e = this.#entry(title);
    const g = line(game);
    if (!e.comps.some(c => c.game === g)) throw new ContactError(`"${e.title}" is not marked for "${game}"`);
    this.source.removeComp(e.key, g);
    return this.get(e.key);
  }

  /** The genres and keywords in use, each sorted without case. */
  tags() {
    const all = this.source.all();
    const used = field => {
      const seen = new Map();
      for (const e of all) for (const t of e[field]) if (!seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
      return [...seen.values()].sort((a, b) => a.localeCompare(b));
    };
    return { genres: used("genres"), keywords: used("keywords") };
  }

  #entry(title) {
    const e = this.source.get(entryKey(title));
    if (!e) throw new ContactError(`No game "${title}"`, 404);
    return e;
  }

  /** Each entry key to the contacts that covered it: [{id, name, reach, kind, date, source}]. */
  #coverage() {
    const by = new Map();
    for (const c of this.book.list({ all: true })) {
      for (const g of c.games ?? []) {
        const k = entryKey(g.title);
        (by.get(k) ?? by.set(k, []).get(k)).push({ id: c.id, name: c.name, reach: c.reach, kind: g.kind, date: g.date, source: g.source });
      }
    }
    return by;
  }

  #profile(game) {
    if (game === undefined || game === null || game === "") return null;
    const g = line(game);
    const p = this.book.profiles().find(x => x.game === g);
    if (!p) throw new ContactError(`No profile for game "${game}"`);
    return p;
  }

  #count(v) {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) throw new ContactError(`Covered must be a whole number, 0 or more: ${v}`);
    return n;
  }
}

const coverageOf = rows => ({ count: rows.length, reach: rows.reduce((s, r) => s + (r.reach ?? 0), 0), newest: rows.reduce((n, r) => (r.date > n ? r.date : n), "") });
