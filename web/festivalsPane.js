// The Festivals and Events tabs of the Marketing view: festivals or conferences that fit the picked game, by deadline.
// The server does the matching; the page shows what it sends.

import { esc, fmtDate } from "./state.js";

/** The list request: one game's matching events of a type (festival or conference), or every open one. */
export function festivalPath(game, type = "") {
  const q = new URLSearchParams();
  if (game) q.set("game", game);
  if (type) q.set("type", type);
  const s = q.toString();
  return "/api/festivals" + (s ? "?" + s : "");
}

/** The left column: what the list shows, for the game picked in the top bar. */
export function eventsInfoPane(title, game, profiles) {
  const p = profiles.find(x => x.game === game);
  const what = p ? `that fit ${esc(p.name || p.game)}'s genres, stage and platforms` : "for every game; pick a game in the top bar to see the ones that fit it";
  return `<section class="pane" aria-label="About"><div class="pane-h">${esc(title)}</div><div class="pane-b"><div class="muted">Shows ${esc(title.toLowerCase())} ${what}, by deadline. Past deadlines are left out.</div></div></section>`;
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

export function festivalsPane(list, sel, title = "Festivals") {
  const body = !list ? `<div class="empty">Loading…</div>` : list.length ? list.map(c => festivalRow(c, sel)).join("") : `<div class="empty">Nothing matches.</div>`;
  return `<section class="pane" aria-label="${esc(title)}"><div class="pane-h">${esc(title)}<span class="c">${list ? list.length : ""}</span></div><div class="pane-b">${body}</div></section>`;
}
