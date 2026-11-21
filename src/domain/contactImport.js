// The sheet import, pure: CSV text in, contact rows out. The New Streamers tab is the first source.

import { REACH, CHANNEL_KINDS } from "./contacts.js";

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

// Header name (lower case) to field. BB1 and BB2 are not listed: they are ignored.
const ALIASES = {
  name: ["name", "channel", "streamer"],
  links: ["youtube", "link", "links", "url", "channel link"],
  reach: ["reach", "size", "subs", "subscribers"],
  genre: ["genre", "genres"],
  email: ["email", "e-mail", "mail"],
  notes: ["notes", "note"],
  platform: ["platform", "platforms"],
  replied: ["replied", "reply"],
  video: ["posted video", "video posted", "video"],
  last: ["last contact", "last contacted"],
};
const FIELD_OF = Object.fromEntries(Object.entries(ALIASES).flatMap(([f, names]) => names.map(n => [n, f])));

/** The channel kind of a URL, by host; an unknown host is a website. */
export function channelKind(url) {
  const host = (url.match(/^(?:https?:\/\/)?([^/?#]+)/i)?.[1] || "").toLowerCase().replace(/^www\./, "");
  const hit = { "youtu.be": "youtube", "t.co": "x", "twitter.com": "x", "bsky.app": "bluesky", "linktr.ee": "linktree", "store.steampowered.com": "steam", "steamcommunity.com": "steam", "discord.gg": "discord" }[host]
    || CHANNEL_KINDS.find(k => host === k + ".com" || host.endsWith("." + k + ".com") || host === k + ".tv");
  return hit || "website";
}

/** A reach cell: a band letter, or a follower count mapped through the band floors; "" when below the smallest band. */
export function reachOf(cell) {
  const s = cell.trim().toUpperCase();
  if (REACH.some(r => r.band === s)) return s;
  const n = Number(s.replace(/[\s,]/g, "").replace(/K$/, "000"));
  return REACH.find(r => n > r.over)?.band || "";
}

const YES = new Set(["yes", "y", "x", "true", "1", "✓"]);
const date = cell => (/^\d{4}-\d{2}-\d{2}$/.test(cell.trim()) ? cell.trim() : "");

/** The New Streamers CSV as contact rows: {name, email, reach, notes, types, channels, touches [{kind, date}]}; date "" means the import day. Rows with no name and no link are left out here and counted by the caller as skipped via `blank`. */
export function mapStreamers(text) {
  const [head = [], ...body] = parseCsv(text);
  const cols = head.map(h => FIELD_OF[h.trim().toLowerCase()] || null);
  return body.map(cells => {
    const f = {};
    cols.forEach((field, i) => { if (field && f[field] === undefined) f[field] = (cells[i] ?? "").trim(); });
    const urls = (f.links || "").split(/[\s,;]+/).filter(Boolean);
    const when = date(f.last || "");
    const touches = [];
    if (YES.has((f.replied || "").toLowerCase())) touches.push({ kind: "reply", date: when });
    if (YES.has((f.video || "").toLowerCase())) touches.push({ kind: "video", date: when });
    const notes = [f.notes, f.genre && `Genre: ${f.genre}`, f.platform && `Platform: ${f.platform}`].filter(Boolean).join("\n");
    return {
      name: f.name || "", email: f.email || "", reach: reachOf(f.reach || ""), notes,
      types: ["influencer"], channels: urls.map(url => ({ kind: channelKind(url), url })), touches,
    };
  });
}
