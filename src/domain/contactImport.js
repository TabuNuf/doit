// The sheet import, pure: CSV text in, contact rows out. The New Streamers tab is the first source.

import { CHANNEL_KINDS } from "./contacts.js";

/** CSV text to rows of cells: quotes, doubled quotes, commas and newlines inside quotes, CRLF, a leading BOM. */
export function parseCsv(input) {
  const s = String(input).replace(/^﻿/, "");
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ""));
}

// Header name (lower case) to field. `Contact` is the sheet's email column. A column of a channel kind gives channels of that kind.
const ALIASES = {
  name: ["name", "channel", "streamer"],
  links: ["link", "links", "url", "channel link"],
  reach: ["reach", "size", "subs", "subscribers"],
  genre: ["genre", "genres"],
  email: ["contact", "email", "e-mail", "mail"],
  notes: ["notes", "note"],
  platform: ["platform", "platforms"],
  replied: ["replied", "reply"],
  video: ["posted video", "video posted", "video"],
  last: ["last contact", "last contacted"],
  bb1: ["bb1"],
  bb2: ["bb2"],
};
const FIELD_OF = Object.fromEntries(Object.entries(ALIASES).flatMap(([f, names]) => names.map(n => [n, f])));
// Channel columns: header (lower case) to channel kind.
const KIND_OF = { linktree: "linktree", youtube: "youtube", twitch: "twitch", steam: "steam", discord: "discord", bluesky: "bluesky", x: "x", instagram: "instagram", facebook: "facebook", www: "website" };
// A bare @handle on these columns becomes a profile link.
const HANDLE_URL = { bluesky: h => `https://bsky.app/profile/${h}`, x: h => `https://x.com/${h}`, instagram: h => `https://instagram.com/${h}`, twitch: h => `https://twitch.tv/${h}`, youtube: h => `https://youtube.com/@${h}` };
/** The game the sheet's BB1 and BB2 mailings were for (a project id). */
export const BB_GAME = "bunny-bunker";

/** The channel kind of a URL, by host; an unknown host is a website. */
export function channelKind(url) {
  const host = (url.match(/^(?:https?:\/\/)?([^/?#]+)/i)?.[1] || "").toLowerCase().replace(/^www\./, "");
  const hit = { "youtu.be": "youtube", "t.co": "x", "twitter.com": "x", "bsky.app": "bluesky", "linktr.ee": "linktree", "store.steampowered.com": "steam", "steamcommunity.com": "steam", "discord.gg": "discord" }[host]
    || CHANNEL_KINDS.find(k => host === k + ".com" || host.endsWith("." + k + ".com") || host === k + ".tv");
  return hit || "website";
}

/** A reach cell as a count: "12400", "12,400", "12 400", "12k", "1.2M"; a sheet bucket ("D - Big >5.000") as its lower bound ("." and "," are thousands separators there); null for empty or anything else (a bare letter). */
export function reachOf(cell) {
  const text = String(cell).trim();
  const bucket = text.match(/^[A-Za-z]\s*-.*>\s*(\d[\d.,]*)$/);
  if (bucket) return Number(bucket[1].replace(/[.,]/g, ""));
  const m = text.replace(/(\d)[ ,](?=\d{3}\b)/g, "$1").match(/^(\d+(?:\.\d+)?)\s*([kKmM]?)$/);
  if (!m) return null;
  const n = Math.round(Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2].toLowerCase()] || 1));
  return Number.isSafeInteger(n) ? n : null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** A date cell as YYYY-MM-DD: ISO, or "16-Sep-2025"; "" for anything else. */
export function dateOf(cell) {
  const s = String(cell).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[a-z]*[-\s,]+(\d{4})$/);
  const mon = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
  return mon < 0 ? "" : `${m[3]}-${String(mon + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

const YES = new Set(["yes", "y", "x", "true", "1", "✓"]);
const isYes = v => YES.has(String(v ?? "").toLowerCase());
const unmark = s => s.replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, "").trim();

/** One channel cell as channels: links split on space, comma or semicolon; a bare @handle becomes a link where the kind has one. `kind` null: by host. */
function channelsOf(cell, kind) {
  return unmark(cell).split(/[\s,;]+/).filter(Boolean).flatMap(part => {
    const handle = part.match(/^@([\w.-]+)$/)?.[1];
    if (handle) return HANDLE_URL[kind] ? [{ kind, url: HANDLE_URL[kind](handle) }] : [];
    return [{ kind: kind || channelKind(part), url: part }];
  });
}

/** Genre cell to a list: "Indie, Horror" gives ["Indie", "Horror"]. */
const genresOf = cell => [...new Set(String(cell ?? "").split(/[,;]/).map(g => g.trim()).filter(Boolean))];

/** Notes written by the old import: a `Genre: x, y` line moves out of the notes into genres. */
export function takeGenreLines(notes) {
  const lines = String(notes ?? "").split("\n");
  const genres = lines.filter(l => /^Genre: /.test(l)).flatMap(l => genresOf(l.slice(7)));
  return { genres: [...new Set(genres)], notes: lines.filter(l => !/^Genre: /.test(l)).join("\n").trim() };
}

/** The lines the import writes into notes itself; a re-import replaces these and keeps the rest. */
const OWN_LINE = /^(Sheet reach|Genre|Platform): /;

/** Notes after a re-import: the lines a person wrote stay, the sheet's own lines come from the row; nothing repeats. */
export function mergeNotes(known, fresh) {
  const mine = String(known ?? "").split("\n").filter(l => !OWN_LINE.test(l));
  const have = new Set(mine.map(l => l.trim()).filter(Boolean));
  const add = String(fresh ?? "").split("\n").filter(l => l.trim() && !have.has(l.trim()));
  return [...mine, ...add].join("\n").trim();
}

/** The New Streamers CSV as contact rows: {name, email, reach, genres, notes, types, channels, touches [{kind, date, game?, note?}]}; date "" means the import day.
 *  Last Contact is a mail touch; BB1 and BB2 are mail touches for `BB_GAME`, dated by Last Contact (the cells only say yes or no). Rows with no name and no link are left out by the caller as skipped. */
export function mapStreamers(text) {
  const [head = [], ...body] = parseCsv(text);
  const cols = head.map(h => { const k = h.trim().toLowerCase(); return FIELD_OF[k] ? { field: FIELD_OF[k] } : KIND_OF[k] ? { kind: KIND_OF[k] } : null; });
  return body.map(cells => {
    const f = {}, channels = [];
    cols.forEach((col, i) => {
      const cell = (cells[i] ?? "").trim();
      if (col?.kind) channels.push(...channelsOf(cell, col.kind));
      else if (col && f[col.field] === undefined) f[col.field] = cell;
    });
    channels.push(...channelsOf(f.links || "", null));
    const seen = new Set();
    const uniq = channels.filter(c => { const k = c.url.toLowerCase(); return seen.has(k) ? false : (seen.add(k), true); });
    const when = dateOf(f.last || "");
    const touches = [];
    if (when) touches.push({ kind: "mail", date: when });
    if (isYes(f.replied)) touches.push({ kind: "reply", date: when });
    if (isYes(f.video)) touches.push({ kind: "video", date: when });
    if (isYes(f.bb1)) touches.push({ kind: "mail", date: when, game: BB_GAME, note: "BB1" });
    if (isYes(f.bb2)) touches.push({ kind: "mail", date: when, game: BB_GAME, note: "BB2" });
    const reach = reachOf(f.reach || "");
    const sheetReach = reach === null && f.reach ? `Sheet reach: ${f.reach}` : "";
    const notes = [f.notes, sheetReach, f.platform && `Platform: ${f.platform}`].filter(Boolean).join("\n");
    return { name: f.name || "", email: f.email || "", reach, genres: genresOf(f.genre), notes, types: ["influencer"], channels: uniq, touches };
  });
}
