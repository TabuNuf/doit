// The Overview tab of the Marketing view: this week's contacts to reach, festival deadlines and campaign steps,
// one pane each. The server plans the week; the page keeps the picked game's lines. A row opens its tab.

import { esc, fmtDate } from "./state.js";

const pane = (name, n, rows, none) => `<section class="pane" aria-label="${name}"><div class="pane-h">${name}<span class="c">${n}</span></div><div class="pane-b">${rows.join("") || `<div class="empty">${none}</div>`}</div></section>`;

export function contactLine(c, sel) {
  const why = c.why === "campaign" ? "campaign task" : "due";
  return `<button class="mk-row" data-contact="${esc(c.id)}" data-mk-to="contacts" aria-pressed="${String(sel) === String(c.id)}"><span class="title">${esc(c.name)}</span>
    <span class="pills">${c.game ? `<span class="pill">${esc(c.game)}</span>` : ""}<span class="pill${c.why === "due" ? " due" : ""}">${why}</span></span></button>`;
}

export function festivalLine(f, sel) {
  const left = f.daysLeft === 0 ? "today" : `${f.daysLeft} days left`;
  return `<button class="mk-row" data-contact="${esc(f.id)}" data-mk-to="festivals" aria-pressed="${String(sel) === String(f.id)}"><span class="title">${esc(f.name)} ${esc(f.year)}</span>
    <span class="pills"><span class="pill mono due">${esc(fmtDate(f.deadline))} · ${left}</span>${f.games.map(g => `<span class="pill">${esc(g)}</span>`).join("")}</span></button>`;
}

export function stepLine(s) {
  return `<div class="mk-row"><span class="title">${esc(s.title)}</span><span class="pills"><span class="pill mono">${esc(s.ref)}</span><span class="pill">${esc(s.game)}</span></span></div>`;
}

/** The week's lines for one game; "" keeps them all. */
export function forGame(plan, game) {
  if (!plan || !game) return plan;
  return { contacts: plan.contacts.filter(c => c.game === game), festivals: plan.festivals.filter(f => f.games.includes(game)), steps: plan.steps.filter(s => s.game === game) };
}

/** The three panes; `plan` is GET /api/outreach (null while loading or when it failed). */
export function overviewPanes(plan, sel, game = "") {
  if (!plan) return pane("This week", "", [], "Loading…") + pane("Festival deadlines", "", [], "Loading…") + pane("Campaign steps", "", [], "Loading…");
  const p = forGame(plan, game);
  return pane("Contacts this week", p.contacts.length, p.contacts.map(c => contactLine(c, sel)), "No one to reach out to.")
    + pane("Festival deadlines", p.festivals.length, p.festivals.map(f => festivalLine(f, sel)), "None within 14 days.")
    + pane("Campaign steps", p.steps.length, p.steps.map(stepLine), "No open steps.");
}
