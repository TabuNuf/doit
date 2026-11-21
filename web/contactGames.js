// The contact pane's Games block: one block per game the contact fits or was contacted about, and the + Fit form. Pure.

import { esc } from "./state.js";

/** The games of a contact, by name: {game, name, reason (null: no fit), contacted (newest touch date for it, or "")}. */
export function gamesOf(c, profiles = []) {
  const by = new Map();
  const entry = game => by.get(game) ?? by.set(game, { game, name: profiles.find(p => p.game === game)?.name || game, reason: null, contacted: "" }).get(game);
  for (const f of c.fit ?? []) entry(f.game).reason = f.reason;
  for (const t of c.touches ?? []) if (t.game) { const e = entry(t.game); if (t.date > e.contacted) e.contacted = t.date; }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const opt = p => `<option value="${esc(p.game)}">${esc(p.name || p.game)}</option>`;

function fitForm(profiles) {
  return `<form class="form mk-fit" id="mk-fit" aria-label="Add a fit">
    <label for="mk-fit-game">Game<select id="mk-fit-game">${profiles.map(opt).join("")}</select></label>
    <label for="mk-fit-reason">Why it fits<input type="text" id="mk-fit-reason" required></label>
    <button type="submit">Save fit</button><button type="button" data-mk-fit-cancel>Cancel</button></form>`;
}

/** The Games section: a block per game, then + Fit (or its form while `open`). */
export function gamesBlock(c, profiles, open) {
  const block = g => `<div class="cmt"><div class="cmt-h"><span>${esc(g.name)}</span>${g.reason === null ? "" : `<button data-mk-unfit="${esc(g.game)}" aria-label="Remove the fit for ${esc(g.name)}">Remove</button>`}</div>
    ${g.reason === null ? `<span class="muted">no fit</span>` : esc(g.reason)}
    <div class="muted">${g.contacted ? `contacted ${esc(g.contacted)}` : "not contacted yet"}</div></div>`;
  const games = gamesOf(c, profiles);
  return `<div class="sect">Games</div>${games.length ? games.map(block).join("") : `<div class="muted">No game yet.</div>`}
    ${open ? fitForm(profiles) : `<div style="margin-top:6px"><button data-mk-fit>+ Fit</button></div>`}`;
}

/** The request that records a fit. */
export function fitRequest(c, game, reason) {
  return { method: "POST", path: `/api/contacts/${encodeURIComponent(c.id)}/fit`, body: { game, reason } };
}

/** The request that removes a fit. */
export function unfitRequest(c, game) {
  return { method: "DELETE", path: `/api/contacts/${encodeURIComponent(c.id)}/fit/${encodeURIComponent(game)}` };
}
