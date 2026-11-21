// The left pane of the Campaigns tab: the campaign epics (open first) and the + Campaign form.
// Campaigns are epics with a Game line; a click selects one, its brief is in campaignBrief.js.

import { esc } from "./state.js";
import { OCCASIONS } from "./campaignBrief.js";

/** The projects an epic's Game line names. */
const gamesOf = e => e.games ?? [e.game];

/** Campaign epics for one game ("" for all): Active first, then the rest, each by project and id. */
export function campaignsFor(epics, game = "") {
  const later = e => (e.status === "Active" ? 0 : 1);
  return epics.filter(e => e.game && (!game || gamesOf(e).includes(game)))
    .sort((a, b) => later(a) - later(b) || a.project.localeCompare(b.project) || a.id.localeCompare(b.id, "en", { numeric: true }));
}

export function campaignRow(e, sel = "") {
  const key = `${e.project}/${e.id}`;
  return `<button class="mk-row" data-mk-campaign="${esc(key)}" aria-pressed="${sel === key}" title="Show its brief">
    <span class="title"><span class="mono muted">${esc(e.id)}</span> ${esc(e.name)}</span>
    <span class="pills">${gamesOf(e).map(g => `<span class="pill">${esc(g)}</span>`).join("")}<span class="pill mono">${e.done}/${e.total}</span><span class="pill${e.status === "Active" ? "" : " ai"}">${esc(e.status)}</span></span></button>`;
}

/** The projects a campaign can be for: those with a kind (a game, application or podcast). */
export const campaignProjects = profiles => profiles.filter(p => p.project);

/** The + Campaign form: the project, a name and an optional event; `events` are the open festivals and events. */
export function campaignForm(profiles, game, events, event = "") {
  const ps = campaignProjects(profiles);
  if (!ps.length) return `<div class="empty">No project has a kind yet, so no campaign can be started. On the Board, click the gear beside a project's name and set its kind.</div>`;
  const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel ? "selected" : ""}>${esc(l)}</option>`;
  return `<form class="form" id="mk-campaign" aria-label="New campaign">
    <fieldset id="mk-cp-project" class="mk-games"><legend>For (one or more)</legend>${ps.map(p => `<label class="mk-check"><input type="checkbox" name="mk-cp-game" value="${esc(p.game)}" ${p.game === game ? "checked" : ""}> ${esc(p.name || p.game)} (${esc(p.kind)})</label>`).join("")}</fieldset>
    <label for="mk-cp-name">Name<input id="mk-cp-name" required placeholder="Next Fest push"></label>
    <label for="mk-cp-event">Event, if any<select id="mk-cp-event">${opt("", "No event", !event)}${(events || []).map(e => opt(e.id, `${e.name} ${e.event.year}`, String(e.id) === String(event))).join("")}</select></label>
    <label for="mk-cp-occasion">Occasion<select id="mk-cp-occasion">${opt("", "not set", true)}${OCCASIONS.map(o => opt(o, o, false)).join("")}</select></label>
    <button type="submit">Start campaign</button><button type="button" data-mk-newcamp>Cancel</button></form>`;
}

/** The request that starts a campaign for the picked projects; `v` is {projects (a list), name, event}. */
export const campaignRequest = v => ({ method: "POST", path: "/api/campaigns", body: { projects: [].concat(v.projects ?? v.project), name: v.name.trim(), event: v.event || "", occasion: v.occasion || "" } });

/** The list column; `list` is null while loading. `form` is the open + Campaign form's HTML, or "". */
export function campaignsPane(list, form = "", sel = "") {
  const add = `<button data-mk-newcamp>+ Campaign</button>`;
  const none = `<div class="empty">No campaign yet. A campaign reaches out to the contacts that fit a game, application or podcast. ${add}</div>`;
  const body = !list ? `<div class="empty">Loading…</div>` : list.length ? list.map(e => campaignRow(e, sel)).join("") : none;
  return `<section class="pane" aria-label="Campaigns"><div class="pane-h">Campaigns<span class="c">${list ? list.length : ""}</span><button class="pane-close" data-mk-newcamp>+ Campaign</button></div><div class="pane-b">${form}${body}</div></section>`;
}

/** Every campaign, open first. */
export const campaignsList = epics => campaignsFor(epics, "");
