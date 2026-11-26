// The Contact value, its vocabulary, validation and filters. Pure.

import { checkEvent } from "./events.js";

export const TYPES = ["influencer", "blogger", "press", "publisher", "tester", "festival", "conference"];
export const STATUSES = ["active", "dormant", "parked", "archived"];
// Production scale: loose labels for funding, ownership and team structure, never quality; one game or creator may carry several.
export const SCALES = ["solo", "indie", "triple-i", "aa", "aaa"];
export const CHANNEL_KINDS = ["youtube", "twitch", "kick", "tiktok", "bluesky", "x", "instagram", "facebook", "reddit", "discord", "steam", "patreon", "podcast", "rumble", "website", "linktree"];
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

/** Scale labels as a list in vocabulary order; an array or a comma separated string; `iii` is triple-i. */
export function checkScales(value) {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  const got = list.map(text).filter(Boolean).map(v => oneOf(v.toLowerCase() === "iii" ? "triple-i" : v, SCALES, "scale"));
  return SCALES.filter(s => got.includes(s));
}

function checkChannels(list) {
  if (!Array.isArray(list)) throw new ContactError("Channels must be a list");
  return list.map(c => {
    const url = text(c?.url);
    if (!url) throw new ContactError("A channel needs a url");
    const active = c?.active ? checkDate(c.active, "Channel last active date") : "";
    return { kind: oneOf(c?.kind, CHANNEL_KINDS, "channel kind"), url, followers: checkReach(c?.followers), active };
  });
}

/** Followers as a short label: 4770000 is 4.77M, 349800 is 349.8K, 900 stays 900; "-" when unknown. */
export function countLabel(n) {
  if (n === null || n === undefined) return "-";
  const f = (v, u) => `${Number(v.toFixed(2))}${u}`;
  return n >= 1e6 ? f(n / 1e6, "M") : n >= 1e4 ? f(n / 1e3, "K") : String(n);
}

/** True when the contact suits at least one game: it has a fit, or its scales share a label with a profile's `scale`. */
export function isRelevant(contact, profiles = []) {
  if (contact.fit?.length) return true;
  const mine = contact.scales ?? [];
  return profiles.some(p => (p.scale ?? []).some(s => mine.includes(s)));
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
    special: text(input.special),
    reddit: text(input.reddit),
    scales: checkScales(input.scales),
    scaleNote: text(input.scaleNote),
    checked: input.checked ? checkDate(input.checked, "Checked date") : "",
    status: input.status ? oneOf(input.status, STATUSES, "status") : "active",
    next: input.next ? checkDate(input.next, "Next contact") : "",
    channels: checkChannels(input.channels ?? []),
    event,
  };
}

/** Due: active, or parked (its review date), with a next date on or before `today` (YYYY-MM-DD). */
export function isDue(contact, today) {
  return (contact.status === "active" || contact.status === "parked") && Boolean(contact.next) && contact.next <= today;
}

/** The filter as a checked predicate: {type, fits, contacted, notContacted (games: a touch for / none for that game), noAbout: true, genre, status, reach: at least n followers, due: true,
 *  scale (a label the contact covers), relevant / irrelevant: true (see `isRelevant`, against `profiles`; events are neither), parked: true (only parked), all: true (parked too)} all optional; every one given must match.
 *  With no status, parked and all, parked contacts are left out. */
export function contactFilter(filter = {}, today, profiles = []) {
  const type = filter.type ? oneOf(filter.type, TYPES, "type") : null;
  const status = filter.status ? oneOf(filter.status, STATUSES, "status") : null;
  const reach = filter.reach === undefined || filter.reach === null || filter.reach === "" ? null : checkReach(filter.reach);
  const fits = filter.fits ? String(filter.fits).trim() : null;
  const contacted = filter.contacted ? String(filter.contacted).trim() : null;
  const notContacted = filter.notContacted ? String(filter.notContacted).trim() : null;
  const noAbout = Boolean(filter.noAbout);
  const genre = filter.genre ? text(filter.genre).toLowerCase() : null;
  const due = Boolean(filter.due);
  const scale = filter.scale ? checkScales(filter.scale)[0] : null;
  if (filter.scale && !scale) throw new ContactError(`Unknown scale "${filter.scale}"; use ${SCALES.join(", ")}`);
  const parked = Boolean(filter.parked);
  const hideParked = !status && !parked && !filter.all;
  const relevant = Boolean(filter.relevant);
  const irrelevant = Boolean(filter.irrelevant);
  // `except` leaves out contacts of any of these types (the Contacts tab: no festivals or conferences).
  const except = String(filter.except ?? "").split(",").map(s => s.trim()).filter(Boolean).map(t => oneOf(t, TYPES, "type"));
  return c => (!type || c.types.includes(type))
    && !except.some(t => c.types.includes(t))
    && (!status || c.status === status)
    && (!parked || c.status === "parked")
    && (!hideParked || c.status !== "parked")
    && (!scale || (c.scales ?? []).includes(scale))
    && (!relevant || (!c.event && isRelevant(c, profiles)))
    && (!irrelevant || (!c.event && !isRelevant(c, profiles)))
    && (reach === null || (c.reach !== null && c.reach >= reach))
    && (!fits || c.fit.some(f => f.game === fits))
    && (!contacted || c.touches.some(t => t.game === contacted))
    && (!notContacted || !c.touches.some(t => t.game === notContacted))
    && (!noAbout || !String(c.about ?? "").trim())
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

/** The newest date of a touch of kind reply or video (what the contact did), or "" when there is none. */
export function lastActive(touches) {
  return lastContact(touches.filter(t => t.kind === "reply" || t.kind === "video"));
}

/** Every genre in use, sorted without case. */
export function genresOf(contacts) {
  const seen = new Map();
  for (const c of contacts) for (const g of c.genres ?? []) if (!seen.has(g.toLowerCase())) seen.set(g.toLowerCase(), g);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
