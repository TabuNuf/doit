// The detail pane of a festival or event: its event fields, all editable, and nothing about reach or mail.
// Pure functions: HTML from a contact with an event, and the PATCH an edited field sends. marketingView.js sends it.

import { esc } from "./state.js";

export const WHERES = ["steam", "epic", "gog", "itch", "physical", "online"];
export const WATCH_STATES = ["watching", "applied", "accepted", "declined", "past"];
export const GAME_STAGES = ["in development", "demo", "released"];

const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel === v ? "selected" : ""}>${esc(l)}</option>`;
const words = v => v.split(",").map(s => s.trim()).filter(Boolean);
const row = (label, control) => `<dt>${label}</dt><dd>${control}</dd>`;
const text = (id, label, value, extra = "") => row(label, `<input type="text" id="${id}" value="${esc(value)}" aria-label="${label}" ${extra}>`);
const date = (id, label, value) => row(label, `<input type="date" id="${id}" value="${esc(value)}" aria-label="${label}">`);

/** The right pane for the selected festival or event (null: nothing selected yet). */
export function eventPane(c, title = "Event") {
  const wrap = body => `<section class="pane" aria-label="${esc(title)}"><div class="pane-h">${esc(title)}</div><div class="pane-b detail">${body}</div></section>`;
  if (!c) return wrap(`<div class="empty">Select an event to see its dates, deadline and state.</div>`);
  const e = c.event, k = e.criteria;
  return wrap(`<div class="mono muted">${esc(c.types.join(", "))}${c.topic ? " · " + esc(c.topic) : ""}</div>
    <h2>${esc(c.name)} ${esc(e.year)}</h2>
    <dl class="kv">
      ${text("ev-name", "Name", c.name)}
      ${row("Year", `<input type="number" id="ev-year" min="2000" max="2100" step="1" value="${esc(e.year)}" aria-label="Year">`)}
      ${date("ev-starts", "Starts", e.starts)}${date("ev-ends", "Ends", e.ends)}
      ${date("ev-deadline", "Deadline", e.deadline)}
      ${text("ev-cost", "Cost", e.cost, 'placeholder="free"')}
      ${row("Where", `<select id="ev-where" aria-label="Where"><option value="">not set</option>${WHERES.map(w => opt(w, w, e.where)).join("")}</select>`)}
      ${row("State", `<select id="ev-state" aria-label="State">${WATCH_STATES.map(s => opt(s, s, e.state)).join("")}</select>`)}
    </dl>
    <div class="sect">Criteria</div>
    <dl class="kv">
      ${text("ev-genres", "Genres", k.genres.join(", "), 'placeholder="any"')}
      ${text("ev-stages", "Stages", k.stages.join(", "), 'placeholder="any of in development, demo, released"')}
      ${text("ev-platforms", "Platforms", k.platforms.join(", "), 'placeholder="any"')}
    </dl>
    <div class="muted">${k.genres.length || k.stages.length || k.platforms.length ? "A game fits when it meets every criterion listed." : "No criteria known, so it shows for every game."}</div>`);
}

const FIELDS = { "ev-starts": "starts", "ev-ends": "ends", "ev-deadline": "deadline", "ev-cost": "cost", "ev-where": "where", "ev-state": "state", "ev-year": "year" };
const CRITERIA = { "ev-genres": "genres", "ev-stages": "stages", "ev-platforms": "platforms" };

/** The request an edited event field sends, or null when it holds nothing new. `el` is {id, value}. */
export function eventEditRequest(el, c) {
  const path = `/api/contacts/${encodeURIComponent(c.id)}`;
  const e = c.event;
  if (el.id === "ev-name") return el.value.trim() && el.value.trim() !== c.name ? { method: "PATCH", path, body: { name: el.value } } : null;
  if (FIELDS[el.id]) {
    const key = FIELDS[el.id], value = key === "year" ? Number(el.value) : el.value;
    return value !== e[key] ? { method: "PATCH", path, body: { event: { ...e, [key]: value } } } : null;
  }
  if (CRITERIA[el.id]) {
    const key = CRITERIA[el.id], list = words(el.value);
    return list.join(",") !== e.criteria[key].join(",") ? { method: "PATCH", path, body: { event: { ...e, criteria: { ...e.criteria, [key]: list } } } } : null;
  }
  return null;
}
