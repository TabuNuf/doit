// A contact's history in the pane: every touch and every sent draft, newest first, and the Last contact date.
// Pure: HTML and values from the entries the server sends ({date, kind, game, note, draft}).

import { esc } from "./state.js";

/** The newest date among the contact's `last` (from its touches) and the history (which also holds sent drafts); "" when none. */
export function lastContactOf(c, history) {
  return [c.last ?? "", ...(history ?? []).map(h => h.date)].reduce((a, b) => (b > a ? b : a), "");
}

/** The History list; `entries` falls back to the contact's touches while the history loads. */
export function historyList(c, history) {
  const entries = history ?? c.touches.map(t => ({ ...t, draft: false }));
  if (!entries.length) return `<div class="muted">No contact yet: no mail, reply or video is logged for this contact.</div>`;
  return `<ul class="log mono">${entries.map(h => `<li><span class="muted">${esc(h.date)}</span> · ${esc(h.kind)}${h.game ? " · " + esc(h.game) : ""}${h.note ? " · " + esc(h.note) : ""}${h.draft ? ` <span class="pill" title="A draft sent from Doit">sent draft</span>` : ""}</li>`).join("")}</ul>`;
}

/** The pill on a list row: the last contact date, with the full date and its meaning in the title. */
export function lastPill(c) {
  return c.last ? `<span class="pill mono" title="Last contact ${esc(c.last)}: the newest mail, reply or video logged for this contact">last ${esc(c.last)}</span>` : "";
}
