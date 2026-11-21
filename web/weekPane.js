// The This week pane at the top of the Marketing view: contacts to reach, festival deadlines and campaign steps.
// The server plans the week; the page shows it. A contact or festival row opens its detail.

import { esc, fmtDate } from "./state.js";

const group = (name, n, rows, none) => `<div class="week-col"><div class="sec-h">${name}<span class="c">${n}</span></div>${rows.join("") || `<div class="empty">${none}</div>`}</div>`;

export function contactLine(c, sel) {
  const why = c.why === "campaign" ? "campaign task" : "due";
  return `<button class="mk-row" data-contact="${esc(c.id)}" aria-pressed="${String(sel) === String(c.id)}"><span class="title">${esc(c.name)}</span>
    <span class="pills">${c.game ? `<span class="pill">${esc(c.game)}</span>` : ""}<span class="pill${c.why === "due" ? " due" : ""}">${why}</span></span></button>`;
}

export function festivalLine(f, sel) {
  const left = f.daysLeft === 0 ? "today" : `${f.daysLeft} days left`;
  return `<button class="mk-row" data-contact="${esc(f.id)}" aria-pressed="${String(sel) === String(f.id)}"><span class="title">${esc(f.name)} ${esc(f.year)}</span>
    <span class="pills"><span class="pill mono due">${esc(fmtDate(f.deadline))} · ${left}</span>${f.games.map(g => `<span class="pill">${esc(g)}</span>`).join("")}</span></button>`;
}

export function stepLine(s) {
  return `<div class="mk-row"><span class="title">${esc(s.title)}</span><span class="pills"><span class="pill mono">${esc(s.ref)}</span><span class="pill">${esc(s.game)}</span></span></div>`;
}

/** The pane; `plan` is GET /api/outreach (null while loading or when it failed). */
export function weekPane(plan, sel) {
  if (!plan) return `<section class="pane week-pane" aria-label="This week"><div class="pane-h">This week</div><div class="pane-b"><div class="empty">Loading…</div></div></section>`;
  const body = group("Contacts", plan.contacts.length, plan.contacts.map(c => contactLine(c, sel)), "No one to reach out to.")
    + group("Festival deadlines", plan.festivals.length, plan.festivals.map(f => festivalLine(f, sel)), "None within 14 days.")
    + group("Campaign steps", plan.steps.length, plan.steps.map(stepLine), "No open steps.");
  return `<section class="pane week-pane" aria-label="This week"><div class="pane-h">This week</div><div class="pane-b week-cols">${body}</div></section>`;
}
