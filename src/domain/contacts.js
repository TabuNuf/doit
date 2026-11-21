// The Contact value, its vocabulary, validation and filters. Pure.

import { checkEvent } from "./events.js";

export const TYPES = ["influencer", "blogger", "press", "publisher", "tester", "festival", "conference"];
export const STATUSES = ["active", "dormant", "archived"];
export const CHANNEL_KINDS = ["youtube", "twitch", "bluesky", "x", "instagram", "facebook", "discord", "steam", "website", "linktree"];
export const TOUCH_KINDS = ["mail", "reply", "video"];

/** An error the interfaces turn into a status: 400 for a refused value, 404 for a missing contact. */
export class ContactError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const text = v => String(v ?? "").replace(/\s+/g, " ").trim();

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

/** Reach as a follower count: a non-negative integer, or null when empty. A numeric string may carry space or comma separators. */
export function checkReach(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? (/^\d{1,3}([ ,]\d{3})+$|^\d+$/.test(value.trim()) ? Number(value.replace(/[ ,]/g, "")) : NaN) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0) throw new ContactError(`Reach must be a whole number of followers, 0 or more: ${value}`);
  return n;
}

/** Genres as a list of tags: an array or a comma separated string; blanks dropped, repeats (any case) dropped. */
export function checkGenres(value) {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  const seen = new Set();
  return list.map(text).filter(g => g && !seen.has(g.toLowerCase()) && seen.add(g.toLowerCase()));
}

export function checkTouchKind(value) { return oneOf(value, TOUCH_KINDS, "touch kind"); }

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
  const event = input.event ? checkEvent(input.event) : null;
  if (event && !types.some(t => t === "festival" || t === "conference")) throw new ContactError("Only a festival or conference has an event");
  return {
    name,
    types: [...new Set(types)],
    topic: text(input.topic),
    email: text(input.email),
    reach: checkReach(input.reach),
    genres: checkGenres(input.genres),
    about: String(input.about ?? "").trim(),
    notes: String(input.notes ?? "").trim(),
    status: input.status ? oneOf(input.status, STATUSES, "status") : "active",
    next: input.next ? checkDate(input.next, "Next contact") : "",
    channels: checkChannels(input.channels ?? []),
    event,
  };
}

/** Due: active, with a next contact date on or before `today` (YYYY-MM-DD). */
export function isDue(contact, today) {
  return contact.status === "active" && Boolean(contact.next) && contact.next <= today;
}

/** The filter as a checked predicate: {type, fits, genre, status, reach: at least n followers, due: true} all optional; every one given must match. */
export function contactFilter(filter = {}, today) {
  const type = filter.type ? oneOf(filter.type, TYPES, "type") : null;
  const status = filter.status ? oneOf(filter.status, STATUSES, "status") : null;
  const reach = filter.reach === undefined || filter.reach === null || filter.reach === "" ? null : checkReach(filter.reach);
  const fits = filter.fits ? String(filter.fits).trim() : null;
  const genre = filter.genre ? text(filter.genre).toLowerCase() : null;
  const due = Boolean(filter.due);
  // `except` leaves out contacts of any of these types (the Contacts tab: no festivals or conferences).
  const except = String(filter.except ?? "").split(",").map(s => s.trim()).filter(Boolean).map(t => oneOf(t, TYPES, "type"));
  return c => (!type || c.types.includes(type))
    && !except.some(t => c.types.includes(t))
    && (!status || c.status === status)
    && (reach === null || (c.reach !== null && c.reach >= reach))
    && (!fits || c.fit.some(f => f.game === fits))
    && (!genre || (c.genres ?? []).some(g => g.toLowerCase() === genre))
    && (!due || isDue(c, today));
}

/** Largest reach first (empty last), then name. */
export function byReach(a, b) {
  return (b.reach ?? -1) - (a.reach ?? -1) || a.name.localeCompare(b.name);
}

/** A contact's history, newest first: every touch and every sent draft ({sentAt, game, subject}). A sent draft that its send already logged as a touch (same day, game and subject) shows once. */
export function historyOf(touches, sentDrafts) {
  const day = d => String(d.sentAt).slice(0, 10);
  const logged = d => touches.some(t => t.kind === "mail" && t.date === day(d) && t.game === d.game && t.note === d.subject);
  const drafts = sentDrafts.filter(d => !logged(d)).map(d => ({ date: day(d), kind: "mail", game: d.game, note: d.subject, draft: true }));
  return [...touches.map(t => ({ ...t, draft: false })), ...drafts].sort((a, b) => b.date.localeCompare(a.date));
}

/** The newest touch date, or "" when there is none. */
export function lastContact(touches) {
  return touches.reduce((best, t) => (t.date > best ? t.date : best), "");
}

/** Every genre in use, sorted without case. */
export function genresOf(contacts) {
  const seen = new Map();
  for (const c of contacts) for (const g of c.genres ?? []) if (!seen.has(g.toLowerCase())) seen.set(g.toLowerCase(), g);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
