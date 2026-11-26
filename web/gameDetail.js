// The game pane: every field of an entry as a control under its heading, and the request an edit sends. Pure.

import { esc, compactCount } from "./state.js";
import { linksBlock, coveredByBlock, TRACKER_KINDS } from "./gameLinks.js";
import { compareBlock } from "./gameCompare.js";
import { GM_STAGES } from "./gameFilters.js";

// [field, label, kind, hint]: kinds line, date, list, num, text (a text area), stage, demo, source.
const IDENTITY = [["developer", "Developer", "line"], ["publisher", "Publisher", "line"], ["release", "Release", "date"], ["stage", "Stage", "stage"], ["platforms", "Platforms", "list", "PC, Switch"]];
const WHAT = [["description", "Description", "text"], ["hook", "Hook", "line"], ["look", "Look", "line"], ["genres", "Genres", "list", "Roguelike, Action"], ["keywords", "Keywords", "list", "fast, co-op"],
  ["modes", "Modes", "list", "single-player, co-op"], ["scales", "Scales", "list", "indie, aa"], ["price", "Price", "num", "19.99"], ["launchPrice", "Launch price", "num", "19.99"], ["demo", "Demo", "demo"], ["languages", "Languages", "num", "number of languages"]];
const SUCCESS = [["reviews", "Reviews", "num"], ["sales", "Sales", "num"], ["revenue", "Revenue", "num"], ["salesSource", "Sales source", "source"], ["peakPlayers", "Peak players", "num"], ["followers", "Followers", "num"]];
const RATINGS = [["rating", "Rating %", "num"], ["ratingLabel", "Rating label", "line", "Very Positive"], ["metacritic", "Metacritic", "num"], ["opencritic", "OpenCritic", "num"], ["playtime", "Playtime (hours)", "num"]];
const HOW = [["team", "Team", "line"], ["devTime", "Dev time", "line"], ["festivals", "Festivals", "line"], ["earlyAccess", "Early access", "line"], ["worked", "What worked", "text"]];
const NOTES = [["notes", "Notes", "text"], ["sources", "Sources", "list", "https://..."], ["checked", "Checked", "date"]];
const ALL = [IDENTITY, WHAT, SUCCESS, RATINGS, HOW, NOTES].flat();

const id = f => `gm-f-${f}`;
const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel === v ? "selected" : ""}>${esc(l)}</option>`;
const asList = v => String(v).split(",").map(s => s.trim()).filter(Boolean);

/** What the field holds as the control shows it. */
const shown = (e, f, kind) => kind === "list" ? (e[f] ?? []).join(", ") : String(e[f] ?? "");

/** The stored figure's source or the estimate with how it was reached; sales and revenue only. */
function figureNote(e, f) {
  const est = e.estimates ?? {}, from = f === "sales" ? est.salesFrom : f === "revenue" ? est.revenueFrom : null;
  if (f !== "sales" && f !== "revenue") return "";
  const value = est[f];
  if (e[f] !== null && e[f] !== undefined) return from ? ` <span class="muted">from ${esc(from)}</span>` : "";
  return value === null || value === undefined ? "" : ` <span class="pill">estimate</span> <span class="mono" title="From ${esc(from)}">~${esc(compactCount(value))}</span> <span class="muted">${esc(from)}</span>`;
}

function control(e, [f, label, kind, hint = ""]) {
  const v = shown(e, f, kind), name = `aria-label="${esc(label)}"`;
  if (kind === "text") return `<div class="sect">${label}</div><textarea id="${id(f)}" class="desc-in" ${name} placeholder="${esc(label)}">${esc(v)}</textarea>`;
  let input;
  if (kind === "date") input = `<input type="date" id="${id(f)}" value="${esc(v)}" ${name}>`;
  else if (kind === "stage") input = `<select id="${id(f)}" ${name}>${opt("", "-", v)}${GM_STAGES.map(s => opt(s, s, v)).join("")}</select>`;
  else if (kind === "demo") input = `<select id="${id(f)}" ${name}>${opt("", "-", v)}${opt("yes", "yes", v)}${opt("no", "no", v)}</select>`;
  else if (kind === "source") input = `<select id="${id(f)}" ${name}>${opt("", "-", v)}${TRACKER_KINDS.map(k => opt(k, k, v)).join("")}${v && !TRACKER_KINDS.includes(v) ? opt(v, v, v) : ""}</select>`;
  else input = `<input type="text" id="${id(f)}" value="${esc(v)}" ${name} placeholder="${esc(hint)}">`;
  return `<dt>${label}</dt><dd>${input}${figureNote(e, f)}</dd>`;
}

const group = (heading, fields, e) => {
  const rows = fields.filter(f => f[2] !== "text").map(f => control(e, f)).join("");
  return `<div class="sect">${heading}</div>${rows ? `<dl class="kv">${rows}</dl>` : ""}${fields.filter(f => f[2] === "text").map(f => control(e, f)).join("")}`;
};

/** The right pane for the selected game (null: none picked). */
export function gameDetailPane(e, compOpen = false) {
  const wrap = body => `<section class="pane" aria-label="Game"><div class="pane-h">${e ? esc(e.title) : "Game"}</div><div class="pane-b detail">${body}</div></section>`;
  if (!e) return wrap(`<div class="empty">Pick a game.</div>`);
  return wrap(group("Identity", IDENTITY, e) + linksBlock("Stores", "stores", e.stores) + linksBlock("Trackers", "trackers", e.trackers)
    + group("What it is", WHAT, e) + group("Success", SUCCESS, e) + group("Ratings", RATINGS, e) + group("How it got there", HOW, e)
    + `<div class="sect">Coverage</div><div class="muted">${e.coverage.count} contact${e.coverage.count === 1 ? "" : "s"}, reach ${esc(e.coverage.reach)}${e.coverage.newest ? `, newest ${esc(e.coverage.newest)}` : ""}</div>`
    + coveredByBlock(e.coveredBy ?? []) + compareBlock(e.compare ?? [], compOpen)
    + group("Notes and sources", NOTES, e));
}

/** The request an edited field sends, or null when it holds nothing new. `el` is {id, value}. */
export function gameEditRequest(el, e) {
  const def = ALL.find(d => id(d[0]) === el.id);
  if (!def) return null;
  const [f, , kind] = def;
  const path = `/api/games/${encodeURIComponent(e.key)}`;
  let value;
  if (kind === "list") { value = asList(el.value); if (value.join(",") === (e[f] ?? []).join(",")) return null; }
  else if (kind === "text") { value = el.value; if (value === (e[f] ?? "")) return null; }
  else { value = el.value.trim(); if (value === shown(e, f, kind)) return null; }
  return { method: "PATCH", path, body: { [f]: value } };
}
