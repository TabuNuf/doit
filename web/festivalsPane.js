// The Festivals tab of the Marketing view: pick a game, see the events that fit it by deadline.
// The server does the matching; the page shows what it sends.

import { esc, fmtDate } from "./state.js";

/** The list request: one game's matching festivals, or every open one. */
export const festivalPath = game => "/api/festivals" + (game ? `?game=${encodeURIComponent(game)}` : "");

/** The game picker column. */
export function gamePane(game, profiles) {
  const opts = [["", "Any game"], ...profiles.map(p => [p.game, p.name || p.game])];
  return `<section class="pane" aria-label="Game"><div class="pane-h">Game</div><div class="pane-b form mk-filters">
    <label for="mk-fgame">Game<select id="mk-fgame">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === game ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
    <div class="muted">Shows events that fit the game's genres, stage and platforms, by deadline. Past deadlines are left out.</div></div></section>`;
}

export function festivalRow(c, sel) {
  const e = c.event;
  const left = c.daysLeft === null || c.daysLeft === undefined ? "" : c.daysLeft === 0 ? "today" : `${c.daysLeft} days left`;
  const deadline = e.deadline ? `<span class="pill mono" title="Application deadline">${esc(fmtDate(e.deadline))}${left ? ` · ${left}` : ""}</span>` : `<span class="pill ai">no deadline</span>`;
  const unknown = c.match && c.match.criteriaUnknown ? `<span class="pill ai" title="No criteria known, so it shows for every game">criteria unknown</span>` : "";
  return `<button class="mk-row" data-contact="${esc(c.id)}" aria-pressed="${String(sel) === String(c.id)}">
    <span class="title">${esc(c.name)} ${esc(e.year)}</span>
    <span class="pills">${deadline}${e.cost ? `<span class="pill">${esc(e.cost)}</span>` : ""}${e.where ? `<span class="pill">${esc(e.where)}</span>` : ""}<span class="pill">${esc(e.state)}</span>${unknown}</span></button>`;
}

export function festivalsPane(list, sel) {
  const body = !list ? `<div class="empty">Loading…</div>` : list.length ? list.map(c => festivalRow(c, sel)).join("") : `<div class="empty">No festival matches.</div>`;
  return `<section class="pane" aria-label="Festivals"><div class="pane-h">Festivals<span class="c">${list ? list.length : ""}</span></div><div class="pane-b">${body}</div></section>`;
}
