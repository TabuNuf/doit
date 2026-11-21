// The middle pane of the Campaigns tab: the selected campaign's brief as editable fields, Open on Board,
// Add contacts and the suggestions. Pure HTML builders and the PATCH an edited field sends.

import { esc, fmtDate, compactCount } from "./state.js";

export const OCCASIONS = ["release", "demo", "festival", "update", "sale", "announcement", "other"];
const STORE = ["steam", "epic", "gog", "itch"];
const gamesOf = e => e.games ?? (e.game ? [e.game] : []);

const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel === v ? "selected" : ""}>${esc(l)}</option>`;
const row = (label, control) => `<dt>${label}</dt><dd>${control}</dd>`;
const field = (key, label, value, area) => row(label, area
  ? `<textarea id="cb-${key}" rows="2" aria-label="${label}">${esc(value)}</textarea>`
  : `<input type="${key === "starts" || key === "ends" ? "date" : "text"}" id="cb-${key}" value="${esc(value)}" aria-label="${label}">`);

/** The For checkboxes: every project with a kind, ticked when the campaign's Game line names it, each with a Settings button. */
function forBlock(e, profiles) {
  const on = gamesOf(e);
  const ps = profiles.filter(p => p.project);
  // Settings only on the chosen projects, so the list stays one wrapping row.
  return ps.map(p => `<span class="mk-for"><label><input type="checkbox" id="cb-game-${esc(p.game)}" ${on.includes(p.game) ? "checked" : ""}> ${esc(p.name || p.game)}</label>${on.includes(p.game) ? `<button data-mk-settings="${esc(p.game)}" title="Open ${esc(p.name || p.game)}'s profile settings">Settings</button>` : ""}</span>`).join("");
}

/** The event select: the open events, plus the campaign's own when it is a date or no longer open. */
function eventSelect(e, events) {
  const cur = e.event ? String(e.event) : "";
  const known = (events || []).some(x => String(x.id) === cur);
  return `<select id="cb-event" aria-label="Event">${opt("", "No event", cur)}${cur && !known ? opt(cur, cur, cur) : ""}${(events || []).map(x => opt(String(x.id), `${x.name} ${x.event.year}`, cur)).join("")}</select>`;
}

/** One fitting contact: its row opens the contact, Add makes the Reach out task. */
export function contactSuggestion(c, sel) {
  const about = c.lastAbout ? `contacted ${esc(fmtDate(c.lastAbout))}` : `not contacted about ${esc(c.game)}`;
  return `<div class="mk-sug"><button class="mk-row" data-contact="${esc(c.id)}" aria-pressed="${String(sel) === String(c.id)}"><span class="title">${esc(c.name)}</span>
    <span class="pills"><span class="pill mono">${esc(compactCount(c.reach || 0))}</span><span class="pill">${esc(c.game)}</span><span class="pill fit" title="Why it fits">${esc(c.reason)}</span><span class="pill ai">${about}</span></span></button>
    <button data-mk-cadd="${esc(c.id)}" title="Make a Reach out task for ${esc(c.name)}">Add</button></div>`;
}

/** One fitting festival or event: a click opens it in its own tab. */
export function festivalSuggestion(f, events) {
  const full = (events || []).find(x => String(x.id) === String(f.id));
  const tab = full && STORE.includes(full.event.where) ? "events" : "festivals";
  return `<button class="mk-row" data-contact="${esc(f.id)}" data-mk-to="${tab}"><span class="title">${esc(f.name)} ${esc(f.year)}</span>
    <span class="pills">${f.deadline ? `<span class="pill mono">deadline ${esc(fmtDate(f.deadline))}</span>` : `<span class="pill ai">no deadline</span>`}</span></button>`;
}

function suggestions(s, sel, events) {
  if (!s) return `<div class="empty">Loading…</div>`;
  const cs = s.contacts.length ? s.contacts.map(c => contactSuggestion(c, sel)).join("") : `<div class="empty">No more contacts fit this campaign. Contacts fit a game when you give them a fit on their pane.</div>`;
  const fs = s.festivals.length ? s.festivals.map(f => festivalSuggestion(f, events)).join("") : `<div class="empty">No open festival or event fits this campaign.</div>`;
  return `<div class="sect">Contacts that fit<span class="c">${s.contacts.length}</span></div>${cs}<div class="sect">Festivals and events that fit<span class="c">${s.festivals.length}</span></div>${fs}`;
}

/** The middle pane; `e` is the selected campaign epic (null: none), `s` its suggestions (null while loading). An open + Campaign `form` takes the pane, which is wider than the list. */
export function briefPane(e, profiles, events, s, sel, form = "") {
  const wrap = body => `<section class="pane" aria-label="Campaign"><div class="pane-h">${form ? "New campaign" : "Campaign"}</div><div class="pane-b detail">${body}</div></section>`;
  if (form) return wrap(form);
  if (!e) return wrap(`<div class="empty">Select a campaign to see and edit its brief. <button data-mk-newcamp>+ Campaign</button></div>`);
  const b = e.brief || {};
  const v = k => b[k] || "";
  return wrap(`<div class="mono muted">${esc(e.id)} · ${esc(e.status)} · ${e.done}/${e.total}</div><h2>${esc(e.name)}</h2>
    <div class="mk-acts"><button data-campaign="${esc(e.project)}/${esc(e.id)}">Open on Board</button><button data-mk-caddall="10" title="Make a Reach out task for each of the ten best-reaching fitting contacts">Add contacts (10)</button></div>
    <div class="sect">For</div><div class="mk-games mk-for-row">${forBlock(e, profiles) || `<div class="empty">No project has a kind yet, so no campaign can name one. On the Board, click the gear beside a project's name and set its kind.</div>`}</div>
    <dl class="kv">
      ${row("Occasion", `<select id="cb-occasion" aria-label="Occasion">${opt("", "not set", v("occasion"))}${OCCASIONS.map(o => opt(o, o, v("occasion"))).join("")}</select>`)}
      ${row("Event", eventSelect(e, events))}
      ${field("starts", "Starts", v("starts"))}${field("ends", "Ends", v("ends"))}
      ${field("goal", "Goal", v("goal"), true)}${field("change", "Change", v("change"), true)}
      ${field("measure", "Measure", v("measure"))}${field("audience", "Audience", v("audience"), true)}
      ${field("message", "Message", v("message"), true)}${field("ask", "Ask", v("ask"))}
      ${field("channels", "Channels", v("channels"))}${field("budget", "Budget", v("budget"))}
    </dl>
    <div class="sect">Suggestions</div>${suggestions(s, sel, events)}`);
}

const BRIEF = ["occasion", "goal", "change", "measure", "audience", "message", "ask", "channels", "starts", "ends", "budget"];

/** The PATCH an edited brief field sends, or null when it holds nothing new. `el` is {id, value, checked}; `e` the campaign epic. */
export function briefRequest(el, e) {
  const path = `/api/campaigns/${encodeURIComponent(e.project)}/${encodeURIComponent(e.id)}`;
  const send = body => ({ method: "PATCH", path, body });
  if (el.id.startsWith("cb-game-")) {
    const game = el.id.slice("cb-game-".length), cur = gamesOf(e);
    const next = el.checked ? [...cur.filter(g => g !== game), game] : cur.filter(g => g !== game);
    return next.length ? send({ game: next }) : null;
  }
  if (el.id === "cb-event") return el.value !== (e.event ? String(e.event) : "") ? send({ event: el.value }) : null;
  const key = el.id.replace(/^cb-/, "");
  if (!BRIEF.includes(key)) return null;
  const was = (e.brief || {})[key] || "";
  return el.value.replace(/\s+/g, " ").trim() !== was ? send({ [key]: el.value }) : null;
}
