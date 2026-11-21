// The Contact value, its vocabulary, validation and filters. Pure.

export const TYPES = ["influencer", "blogger", "press", "publisher", "tester", "festival", "conference"];
export const STATUSES = ["active", "dormant", "archived"];
export const CHANNEL_KINDS = ["youtube", "twitch", "bluesky", "x", "instagram", "facebook", "discord", "steam", "website", "linktree"];
export const TOUCH_KINDS = ["mail", "reply", "video"];

/** Reach bands, largest first, with the audience each stands for (A over 10 000 down to E over 50). */
export const REACH = [
  { band: "A", over: 10000, label: "Huge" },
  { band: "B", over: 5000, label: "Large" },
  { band: "C", over: 1000, label: "Medium" },
  { band: "D", over: 200, label: "Small" },
  { band: "E", over: 50, label: "Tiny" },
];
export const BANDS = REACH.map(r => r.band);

/** An error the interfaces turn into a status: 400 for a refused value, 404 for a missing contact. */
export class ContactError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function checkDate(value, what = "Date") {
  const s = String(value ?? "").trim();
  const d = new Date(s + "T00:00:00Z");
  if (!DATE.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new ContactError(`${what} must be YYYY-MM-DD: ${value}`);
  return s;
}

function oneOf(value, list, what) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!list.includes(v)) throw new ContactError(`Unknown ${what} "${value}"; use ${list.join(", ")}`);
  return v;
}

export function checkReach(value) {
  const v = String(value ?? "").trim().toUpperCase();
  if (!BANDS.includes(v)) throw new ContactError(`Unknown reach band "${value}"; use ${BANDS.join(", ")}`);
  return v;
}

export function checkTouchKind(value) { return oneOf(value, TOUCH_KINDS, "touch kind"); }

const text = v => String(v ?? "").replace(/\s+/g, " ").trim();

function checkChannels(list) {
  if (!Array.isArray(list)) throw new ContactError("Channels must be a list");
  return list.map(c => {
    const url = text(c?.url);
    if (!url) throw new ContactError("A channel needs a url");
    return { kind: oneOf(c?.kind, CHANNEL_KINDS, "channel kind"), url };
  });
}

/** A whole contact from input, with defaults; throws ContactError on a refused value. Fit and touches are not part of the input. */
export function makeContact(input = {}) {
  const name = text(input.name);
  if (!name) throw new ContactError("A contact needs a name");
  const types = (Array.isArray(input.types) ? input.types : []).map(t => oneOf(t, TYPES, "type"));
  if (!types.length) throw new ContactError("A contact needs at least one type");
  return {
    name,
    types: [...new Set(types)],
    topic: text(input.topic),
    email: text(input.email),
    reach: input.reach ? checkReach(input.reach) : "",
    notes: String(input.notes ?? "").trim(),
    status: input.status ? oneOf(input.status, STATUSES, "status") : "active",
    next: input.next ? checkDate(input.next, "Next contact") : "",
    channels: checkChannels(input.channels ?? []),
  };
}

/** A reach filter as a set of bands: "C" is C only, "C+" is C or larger. */
export function reachBands(filter) {
  const s = String(filter).trim().toUpperCase();
  const plus = s.endsWith("+");
  const band = checkReach(plus ? s.slice(0, -1) : s);
  return plus ? BANDS.slice(0, BANDS.indexOf(band) + 1) : [band];
}

/** Due: active, with a next contact date on or before `today` (YYYY-MM-DD). */
export function isDue(contact, today) {
  return contact.status === "active" && Boolean(contact.next) && contact.next <= today;
}

/** The filter as a checked predicate: {type, fits, status, reach, due: true} all optional; every one given must match. */
export function contactFilter(filter = {}, today) {
  const type = filter.type ? oneOf(filter.type, TYPES, "type") : null;
  const status = filter.status ? oneOf(filter.status, STATUSES, "status") : null;
  const bands = filter.reach ? reachBands(filter.reach) : null;
  const fits = filter.fits ? String(filter.fits).trim() : null;
  const due = Boolean(filter.due);
  return c => (!type || c.types.includes(type))
    && (!status || c.status === status)
    && (!bands || bands.includes(c.reach))
    && (!fits || c.fit.some(f => f.game === fits))
    && (!due || isDue(c, today));
}

/** Largest reach first (no band last), then name. */
export function byReach(a, b) {
  const ra = a.reach ? BANDS.indexOf(a.reach) : BANDS.length;
  const rb = b.reach ? BANDS.indexOf(b.reach) : BANDS.length;
  return ra - rb || a.name.localeCompare(b.name);
}
