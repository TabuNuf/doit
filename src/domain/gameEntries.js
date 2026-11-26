// The covered-game entry: what is true of a game itself, its vocabulary, checks, estimates and comparison. Pure.

import { ContactError, SCALES, checkDate, checkGenres, checkScales, oneOf } from "./contacts.js";

export const STORES = ["steam", "epic", "gog", "itch", "playstation", "xbox", "switch", "appstore", "googleplay", "humble", "other"];
export const TRACKERS = ["gamalytic", "steamdb", "vgchartz", "steamspy", "steamcharts", "metacritic", "opencritic", "howlongtobeat", "igdb", "other"];
export const GAME_STAGES = ["unreleased", "demo", "early-access", "released"];
/** Copies sold per Steam review: a rule of thumb, to check against current figures. */
export const SALES_PER_REVIEW = 30;

const LINE = ["developer", "publisher", "hook", "look", "team", "devTime", "festivals", "earlyAccess", "ratingLabel"];
const BLOCK = ["description", "worked", "notes"];
const TAGS = ["platforms", "genres", "keywords", "modes"];
const MONEY = ["price", "launchPrice"];
const COUNTS = ["reviews", "sales", "revenue", "peakPlayers", "followers", "languages"];
const PERCENT = ["rating", "metacritic", "opencritic"];
const URL = /^https?:\/\/\S+$/i;

const FIELDS = ["title", ...LINE, ...BLOCK, "release", "stage", ...TAGS, "stores", "trackers", "scales", ...MONEY, ...COUNTS, ...PERCENT, "playtime", "salesSource", "demo", "sources", "checked"];
const ALIAS = { scale: "scales", store: "stores", tracker: "trackers" };
const BY_LOWER = new Map(FIELDS.map(f => [f.toLowerCase(), f]));

const line = v => String(v ?? "").replace(/\s+/g, " ").trim();
const empty = v => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

/** The lookup key of a title: trimmed, lower case. */
export function entryKey(title) { return line(title).toLowerCase(); }

/** An entry with every field empty. */
export function makeEntry(title) {
  const t = line(title);
  if (!t) throw new ContactError("A game needs a title");
  const e = { key: entryKey(t), title: t };
  for (const f of [...LINE, ...BLOCK, "release", "stage", "salesSource", "demo", "checked"]) e[f] = "";
  for (const f of TAGS) e[f] = [];
  e.stores = {}; e.trackers = {}; e.scales = []; e.sources = [];
  for (const f of [...MONEY, ...COUNTS, ...PERCENT, "playtime"]) e[f] = null;
  return e;
}

function number(value, what) {
  const n = typeof value === "number" ? value : Number(String(value).trim().replace(/,/g, "."));
  if (!Number.isFinite(n) || n < 0) throw new ContactError(`${what} must be a number, 0 or more: ${value}`);
  return n;
}

function money(value, what) {
  const n = number(value, what);
  if (Number(n.toFixed(2)) !== n) throw new ContactError(`${what} takes at most 2 decimals: ${value}`);
  return n;
}

/** A whole count: 12400, "12 400", "12,400", "12k" or "1.2M". */
function count(value, what) {
  let n = value;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    const m = /^(\d+(?:\.\d+)?)\s*([km])$/.exec(s);
    n = m ? Math.round(Number(m[1]) * (m[2] === "k" ? 1e3 : 1e6))
      : /^\d{1,3}([ ,]\d{3})+$|^\d+$/.test(s) ? Number(s.replace(/[ ,]/g, "")) : NaN;
  }
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0) throw new ContactError(`${what} must be a whole number, 0 or more (12400, 12k, 1.2M): ${value}`);
  return n;
}

function percent(value, what) {
  const n = typeof value === "string" ? Number(value.trim()) : value;
  if (!Number.isInteger(n) || n < 0 || n > 100) throw new ContactError(`${what} must be a whole number from 0 to 100: ${value}`);
  return n;
}

/** `kind=url` pairs (a string "a=u,b=v", an array of such strings, or an object) as [[kind, url]]. */
function pairs(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return Object.entries(value);
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  return list.map(s => String(s).trim()).filter(Boolean).map(s => {
    const i = s.indexOf("=");
    if (i < 1) throw new ContactError(`Expected kind=url: ${s}`);
    return [s.slice(0, i), s.slice(i + 1)];
  });
}

/** Links per kind, applied over `base`: an empty url removes the kind. */
function links(base, value, kinds, what) {
  const out = { ...base };
  for (const [k, u] of pairs(value)) {
    const kind = oneOf(k, kinds, what);
    const url = String(u ?? "").trim();
    if (!url) delete out[kind];
    else if (!URL.test(url)) throw new ContactError(`The ${what} link must be an http(s) URL: ${url}`);
    else out[kind] = url;
  }
  return out;
}

function urlList(value) {
  const list = (Array.isArray(value) ? value : String(value ?? "").split(",")).map(s => String(s).trim()).filter(Boolean);
  for (const u of list) if (!URL.test(u)) throw new ContactError(`A source must be an http(s) URL: ${u}`);
  return [...new Set(list)];
}

const NAMES = { devTime: "dev_time", earlyAccess: "early_access", ratingLabel: "rating_label", launchPrice: "launch_price", peakPlayers: "peak_players", salesSource: "sales_source" };

/** The field a key names, in snake or camel spelling; an unknown key is refused. */
function fieldOf(key) {
  const k = String(key).trim().replace(/_([a-z])/gi, (_, c) => c.toUpperCase()).toLowerCase();
  const f = BY_LOWER.get(k) ?? ALIAS[k];
  if (!f) throw new ContactError(`Unknown game field "${key}"`);
  return f;
}

function apply(entry, field, value) {
  const what = NAMES[field] ?? field;
  if (field === "stores") return links(entry.stores, value, STORES, "store");
  if (field === "trackers") return links(entry.trackers, value, TRACKERS, "tracker");
  if (field === "title") {
    const t = line(value);
    if (!t) throw new ContactError("A game needs a title");
    if (entryKey(t) !== entry.key) throw new ContactError(`A game's title cannot change to another key: ${value}`);
    return t;
  }
  if (TAGS.includes(field)) return checkGenres(value);
  if (field === "scales") return checkScales(value);
  if (field === "sources") return urlList(value);
  if (BLOCK.includes(field)) return String(value ?? "").trim();
  if (LINE.includes(field)) return line(value);
  if (empty(value)) return makeEntry("x")[field];
  if (field === "release" || field === "checked") return checkDate(value, field === "release" ? "Release date" : "Checked date");
  if (field === "stage") return oneOf(value, GAME_STAGES, "stage");
  if (MONEY.includes(field)) return money(value, what);
  if (COUNTS.includes(field)) return count(value, what);
  if (PERCENT.includes(field)) return percent(value, what);
  if (field === "playtime") return number(value, what);
  if (field === "demo") return oneOf(typeof value === "boolean" ? (value ? "yes" : "no") : value, ["yes", "no"], "demo value");
  if (field === "salesSource") {
    const s = line(value);
    return URL.test(s) ? s : oneOf(s, TRACKERS, "sales source");
  }
  throw new ContactError(`Unknown game field "${field}"`);
}

/** The whole new entry from `current` with `changes` (keys in snake or camel spelling) applied; an empty value clears a field. Throws ContactError. */
export function checkEntry(changes = {}, current = makeEntry(changes.title ?? "")) {
  const next = { ...current };
  // `stores` replaces all, `store` adds to what is there: the replace starts from nothing.
  for (const [key, value] of Object.entries(changes)) {
    const field = fieldOf(key);
    const plural = key.trim().toLowerCase();
    const base = (plural === "stores" || plural === "trackers") ? { ...next, [field]: {} } : next;
    next[field] = apply(base, field, value);
  }
  if ((next.sales !== null || next.revenue !== null) && !next.salesSource) throw new ContactError("sales and revenue need sales_source: the tracker they came from, or its URL");
  return next;
}

/** `{sales, salesFrom, revenue, revenueFrom}`: the entry's own figures with their source, else reviews x SALES_PER_REVIEW and sales x price; null where neither can be had. */
export function estimates(entry) {
  let sales = null, salesFrom = null, revenue = null, revenueFrom = null;
  if (entry.sales !== null && entry.sales !== undefined) { sales = entry.sales; salesFrom = entry.salesSource || null; }
  else if (entry.reviews !== null && entry.reviews !== undefined) { sales = entry.reviews * SALES_PER_REVIEW; salesFrom = `reviews x ${SALES_PER_REVIEW}`; }
  if (entry.revenue !== null && entry.revenue !== undefined) { revenue = entry.revenue; revenueFrom = entry.salesSource || null; }
  else if (sales !== null && entry.price !== null && entry.price !== undefined) { revenue = Math.round(sales * entry.price); revenueFrom = "sales x price"; }
  return { sales, salesFrom, revenue, revenueFrom };
}

/** What an entry shares with a game profile: tags (genres and keywords in the profile's genres), scale labels, and platforms (platforms and store kinds), without case. */
export function compare(entry, profile) {
  const lower = list => new Set((list ?? []).map(s => String(s).toLowerCase()));
  const both = (mine, theirs) => { const t = lower(theirs); return [...new Map(mine.filter(s => t.has(String(s).toLowerCase())).map(s => [String(s).toLowerCase(), s])).values()]; };
  return {
    game: profile.game, name: profile.name ?? profile.game,
    tags: both([...entry.genres, ...entry.keywords], profile.genres),
    scales: both(entry.scales, profile.scale),
    platforms: both([...entry.platforms, ...Object.keys(entry.stores)], profile.platforms),
  };
}

const flag = v => v === true || /^(1|true|yes)$/i.test(String(v ?? "").trim());
const least = (v, what) => (empty(v) ? null : what === "rating" ? percent(typeof v === "string" ? Number(v.trim().replace(/%$/, "")) : v, "rating") : count(v, what));

/** The entry-only filters as a predicate: {genre, keyword, scale, stage, store, rating (at least), reviews (at least), noFacts}; all given must match. */
export function entryFilter(filter = {}) {
  const has = (list, v) => list.some(x => x.toLowerCase() === v);
  const genre = empty(filter.genre) ? null : line(filter.genre).toLowerCase();
  const keyword = empty(filter.keyword) ? null : line(filter.keyword).toLowerCase();
  const scale = empty(filter.scale) ? null : checkScales(filter.scale)[0];
  if (!empty(filter.scale) && !scale) throw new ContactError(`Unknown scale "${filter.scale}"; use ${SCALES.join(", ")}`);
  const stage = empty(filter.stage) ? null : oneOf(filter.stage, GAME_STAGES, "stage");
  const store = empty(filter.store) ? null : oneOf(filter.store, STORES, "store");
  const rating = least(filter.rating, "rating");
  const reviews = least(filter.reviews, "reviews");
  const noFacts = flag(filter.noFacts);
  return e => (!genre || has(e.genres, genre))
    && (!keyword || has(e.keywords, keyword))
    && (!scale || e.scales.includes(scale))
    && (!stage || e.stage === stage)
    && (!store || Boolean(e.stores[store]))
    && (rating === null || (e.rating !== null && e.rating >= rating))
    && (reviews === null || (e.reviews !== null && e.reviews >= reviews))
    && (!noFacts || !e.checked);
}
