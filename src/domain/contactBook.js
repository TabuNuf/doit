// ContactBook: the contacts facade the interfaces use. It knows the rules, not the database.
//
// The ContactSource it is given (the store's port):
//   all() -> contacts, get(id) -> contact | null, insert(contact) -> id, update(id, contact) (fields and channels),
//   setFit(id, game, reason), removeFit(id, game), setGame(id, game) (by title), removeGame(id, title), addTouch(id, {date, kind, game, note, ref}) (a touch whose non-empty ref is already logged is not added again);
//   a contact carries id, fit [{game, reason}], touches [{date, kind, game, note}] newest first.
// The ProfileShelf it is given: list() -> profiles, has(game) -> bool.

import { makeContact, contactFilter, byReach, isDue, relevance, whyText, checkGame, checkDate, checkTouchKind, lastContact, lastActive, genresOf, ContactError } from "./contacts.js";
import { mapStreamers, mergeNotes } from "./contactImport.js";
import { EventMatch } from "./eventMatch.js";
import { takeIndieFit } from "./scaleNotes.js";
import { channelKind } from "./contactImport.js";
import { daysLeft, checkWatchState, checkYear, checkProfile, isPlatformEvent } from "./events.js";

const day = d => {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** The input fields of a stored contact: what `makeContact` takes, without the facts the book adds. */
const plain = ({ fit, games, touches, due, id, last, active, relevant, why, nowRelevant, ...fields }) => fields;

/** Channel kinds that name one person; a shared Discord server or a website does not. */
const PERSONAL = new Set(["youtube", "twitch", "kick", "tiktok", "bluesky", "x", "instagram", "facebook", "reddit", "patreon", "rumble", "linktree", "steam"]);

const linkKey = url => String(url).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");

export class ContactBook {
  constructor(source, shelf, now = () => new Date()) {
    this.source = source;
    this.shelf = shelf;
    this.now = now;
    this.matcher = new EventMatch();
  }

  today() { return day(this.now()); }

  /** Contacts matching the filter (see `contactFilter`; parked ones only when asked for), due ones first, then largest reach. */
  list(filter = {}) {
    const today = this.today();
    const profiles = this.shelf.list();
    const keep = contactFilter(filter, today, profiles);
    return this.source.all().filter(keep).map(c => this.#facts(c, today, profiles))
      .sort((a, b) => Number(b.due) - Number(a.due) || byReach(a, b));
  }

  get(id) {
    const c = this.source.get(this.#id(id));
    if (!c) throw new ContactError(`No contact ${id}`, 404);
    return this.#facts(c, this.today(), this.shelf.list());
  }

  /** The contact with the facts the book adds: due, last, active relevant, why (the paths, see `relevance`) and nowRelevant (parked yet relevant); a festival is never relevant. */
  #facts(c, today, profiles) {
    const paths = c.event ? [] : relevance(c, profiles);
    return { ...c, due: isDue(c, today), last: lastContact(c.touches), active: lastActive(c.touches), relevant: paths.length > 0, why: whyText(paths), nowRelevant: c.status === "parked" && paths.length > 0 };
  }

  /** Every genre in use, for the Genre filter. */
  genres() { return genresOf(this.source.all()); }

  add(input) { return this.get(this.source.insert(makeContact(input))); }

  /** Changes named fields; the result is checked as a whole contact before it is written. */
  update(id, changes) {
    const c = this.get(id);
    this.source.update(c.id, makeContact({ ...plain(c), ...changes }));
    return this.get(c.id);
  }

  /** One channel by url: a known url takes the kind, followers and last-active date given (what is empty stays); an unknown one is added. */
  setChannel(id, channel) {
    const c = this.get(id);
    const key = linkKey(channel.url);
    const known = c.channels.find(x => linkKey(x.url) === key);
    const given = { ...channel, followers: channel.followers ?? known?.followers ?? null, active: channel.active || known?.active || "" };
    const channels = known ? c.channels.map(x => (x === known ? { ...known, ...given } : x)) : [...c.channels, given];
    return this.update(c.id, { channels });
  }

  /** The `Indie fit:` first line of a contact's notes moved into scales, scale note and checked date, a website channel of a known host retyped (kick, reddit, rumble...)
   *  and a reddit link copied to the reddit field. Other note lines stay. `apply` false only reports. Returns [{id, name, scales, scaleNote, checked, retyped}]. */
  migrateScale(apply = false) {
    const out = [];
    for (const c of this.source.all()) {
      const got = takeIndieFit(c.notes);
      if (!got) continue;
      const channels = c.channels.map(ch => (ch.kind === "website" && channelKind(ch.url) !== "website" ? { ...ch, kind: channelKind(ch.url) } : ch));
      const retyped = channels.filter((ch, i) => ch.kind !== c.channels[i].kind).map(ch => `${ch.kind} ${ch.url}`);
      const reddit = c.reddit || channels.find(ch => ch.kind === "reddit")?.url || "";
      out.push({ id: c.id, name: c.name, scales: got.scales, scaleNote: got.scaleNote, checked: got.checked, retyped });
      if (apply) this.source.update(c.id, makeContact({ ...plain(c), notes: got.notes, scales: got.scales, scaleNote: got.scaleNote, checked: got.checked, channels, reddit }));
    }
    return out;
  }

  /** Adds a covered game (see `checkGame`) or updates the one with that title. */
  addGame(id, game) {
    const c = this.get(id);
    this.source.setGame(c.id, checkGame(game));
    return this.get(c.id);
  }

  removeGame(id, title) {
    const c = this.get(id);
    const t = String(title ?? "").trim().toLowerCase();
    if (!c.games.some(g => g.title.toLowerCase() === t)) throw new ContactError(`Contact ${c.id} has no covered game "${title}"`);
    this.source.removeGame(c.id, c.games.find(g => g.title.toLowerCase() === t).title);
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

  /** Drops the contact's fit for a game; a game it has no fit for is refused. */
  removeFit(id, game) {
    const c = this.get(id);
    const g = String(game ?? "").trim();
    if (!c.fit.some(f => f.game === g)) throw new ContactError(`Contact ${c.id} has no fit for "${game}"`);
    this.source.removeFit(c.id, g);
    return this.get(c.id);
  }

  /** `note` is a short text (a mail's subject), `ref` an outside id (a Message-ID) that keeps a mail from being logged twice. */
  addTouch(id, { kind, game = "", date, note = "", ref = "" } = {}) {
    const c = this.get(id);
    const g = String(game ?? "").trim();
    if (g && !this.shelf.has(g)) throw new ContactError(`No profile for game "${game}"`);
    this.source.addTouch(c.id, { date: date ? checkDate(date) : this.today(), kind: checkTouchKind(kind), game: g,
      note: String(note ?? "").replace(/\s+/g, " ").trim(), ref: String(ref ?? "").trim() });
    return this.get(c.id);
  }

  profiles() { return this.shelf.list(); }

  /** Saves the profile fields of a project with a kind (see `checkProfile`). */
  saveProfile(project, input) { return this.shelf.save(project, checkProfile(input)); }

  /** Changes named fields of a project's profile (genres, platforms, needs, stage, release, scale); the others stay. */
  setProfile(project, changes) {
    const now = this.shelf.list().find(p => p.project === project);
    if (!now) throw new ContactError(`No profile for project "${project}"; add one first`);
    return this.saveProfile(project, { ...now, ...changes });
  }

  /** A profile template in a project's own Marketing folder; `kind` defaults to the project's kind, else game. */
  addProfile(project, kind) { return this.shelf.createFor(project, kind); }

  /** Festivals and conferences by deadline (those with none last), each with `daysLeft`.
   *  `state` keeps one watching state; by default the past ones are left out.
   *  `fits` (a game) keeps the events whose criteria match that game's profile, each with `match`, and drops those past their deadline.
   *  `type` keeps the events of that type (festival or conference).
   *  `platform` true keeps the store events (where steam, epic, gog or itch), false every other one.
   *  `open` drops events past their deadline without a game (a game always does). `deadlineWithin` (days) keeps deadlines from today to that many days ahead. */
  festivals({ fits, deadlineWithin, state, type, platform, open = false } = {}) {
    const today = this.today();
    const profile = fits ? this.shelf.list().find(p => p.game === String(fits).trim()) : null;
    if (fits && !profile) throw new ContactError(`No profile for game "${fits}"`);
    const within = deadlineWithin === undefined || deadlineWithin === "" ? null : Number(deadlineWithin);
    if (within !== null && (!Number.isInteger(within) || within < 0)) throw new ContactError(`Days must be a whole number, 0 or more: ${deadlineWithin}`);
    const want = state ? checkWatchState(state) : null;
    return this.source.all().filter(c => c.event)
      .map(c => ({ ...c, due: isDue(c, today), daysLeft: daysLeft(c.event.deadline, today), match: profile ? this.matcher.check(profile, c) : null }))
      .filter(c => (want ? c.event.state === want : c.event.state !== "past")
        && (!type || c.types.includes(type))
        && (platform === undefined || isPlatformEvent(c.event) === platform)
        && (!profile || c.match.match)
        && (!(profile || open) || c.daysLeft === null || c.daysLeft >= 0)
        && (within === null || (c.daysLeft !== null && c.daysLeft >= 0 && c.daysLeft <= within)))
      .sort((a, b) => (a.event.deadline || "9999").localeCompare(b.event.deadline || "9999") || a.name.localeCompare(b.name));
  }

  /** The festival or conference of that name and year gets the fields given (event fields in `event`, criteria lists per key), or is added.
   *  Returns {contact, created}. Fields not given stay, so a rerun that knows less does not erase. */
  upsertFestival(name, year, { types, topic, notes, url, event = {} } = {}) {
    const key = String(name ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    const y = checkYear(year);
    const known = this.source.all().find(c => c.event && c.event.year === y && c.name.toLowerCase() === key);
    const given = o => Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined));
    const merged = { ...known?.event, ...given(event), year: y, criteria: { ...known?.event.criteria, ...given(event.criteria) } };
    const channels = known?.channels ?? [];
    const more = url && !channels.some(c => linkKey(c.url) === linkKey(url)) ? [{ kind: "website", url }] : [];
    if (!known) {
      const c = this.add({ name, types: types ?? ["festival"], topic, notes, channels: more, event: merged });
      return { contact: c, created: true };
    }
    const { id } = known;
    this.source.update(id, makeContact({
      ...plain(known), types: types ?? known.types, topic: topic ?? known.topic, notes: notes ?? known.notes,
      channels: [...channels, ...more], event: merged,
    }));
    return { contact: this.get(id), created: false };
  }

  /** The watching state of a festival or conference. */
  setFestivalState(id, state) {
    const c = this.get(id);
    if (!c.event) throw new ContactError(`Contact ${c.id} is not a festival or conference with an event`);
    return this.update(c.id, { event: { ...c.event, state: checkWatchState(state) } });
  }

  /** The New Streamers sheet as CSV text, imported as `import` does. */
  importCsv(text) { return this.import(mapStreamers(text)); }

  /** Rows from `mapStreamers`: a row matches a contact (see `#match`) and then updates it;
   *  a row with no name and no link is skipped. A touch is added once (see `#touchOnce`). */
  import(rows) {
    const report = { added: 0, updated: 0, skipped: 0 };
    for (const row of rows) {
      const channels = row.channels ?? [];
      const name = row.name || channels[0]?.url || "";
      if (!name) { report.skipped++; continue; }
      try {
        const input = { ...row, name };
        const known = this.#match(input);
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

  /** By email, else by a channel of one person (YouTube and the others, not Discord or a website), else by name where the emails do not clash. */
  #match({ email, channels, name }) {
    const all = this.source.all();
    const mail = String(email ?? "").trim().toLowerCase();
    const byMail = mail && all.find(c => c.email.toLowerCase() === mail);
    if (byMail) return byMail;
    const keys = channels.filter(c => PERSONAL.has(c.kind)).map(c => linkKey(c.url));
    const byLink = keys.length && all.find(c => c.channels.some(x => PERSONAL.has(x.kind) && keys.includes(linkKey(x.url))));
    if (byLink) return byLink;
    const who = name.toLowerCase();
    return all.find(c => c.name.toLowerCase() === who && (!mail || !c.email || c.email.toLowerCase() === mail) && !c.event) ?? null;
  }

  /** Fills what the row has; what it lacks stays. Channels are added by url, the sheet's own note lines replaced (see `mergeNotes`). */
  #merge(known, row) {
    const have = new Set(known.channels.map(c => linkKey(c.url)));
    const more = (row.channels ?? []).filter(c => !have.has(linkKey(c.url)));
    this.source.update(known.id, makeContact({
      ...plain(known), name: row.name, email: row.email || known.email, reach: row.reach ?? known.reach,
      genres: row.genres?.length ? row.genres : known.genres,
      notes: mergeNotes(known.notes, row.notes), types: [...new Set([...known.types, ...row.types])], channels: [...known.channels, ...more],
    }));
    return known.id;
  }

  /** The sheet's touches are logged once: a reply, a video or a game's mailing by kind, game and note whatever the date,
   *  a mail by its date too. A game is taken as given (a project id), with no profile needed. */
  #touchOnce(id, { kind, date, game = "", note = "" }) {
    const day = date ? checkDate(date) : "";
    const same = t => t.kind === kind && t.game === game && (kind !== "mail" || game ? t.note === note : t.date === (day || this.today()));
    if (this.get(id).touches.some(same)) return;
    this.source.addTouch(id, { date: day || this.today(), kind: checkTouchKind(kind), game, note, ref: "" });
  }

  #id(id) {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1) throw new ContactError(`Not a contact id: ${id}`);
    return n;
  }
}
