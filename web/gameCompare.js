// The Compare block of the game pane: what the entry shares with each game profile, the comp marks, and the + Comparable to form. Pure.

import { esc } from "./state.js";

const path = (e, tail = "") => `/api/games/${encodeURIComponent(e.key)}/comp${tail}`;

function row(c) {
  const shared = [["tags", c.tags], ["scales", c.scales], ["platforms", c.platforms]].filter(([, l]) => l.length).map(([n, l]) => `${n}: ${esc(l.join(", "))}`);
  const mark = c.comp === null ? "" : `<div><span class="pill comp">comp</span> ${esc(c.comp)} <button data-gm-uncomp="${esc(c.game)}" aria-label="Remove the comp for ${esc(c.name || c.game)}">Remove</button></div>`;
  return `<div class="cmt"><div class="cmt-h"><span>${esc(c.name || c.game)}</span></div>
    ${shared.length ? `<div>${shared.join(" · ")}</div>` : `<div class="muted">Shares nothing.</div>`}${mark}</div>`;
}

function compForm(compare) {
  return `<form class="form mk-fit" id="gm-comp" aria-label="Mark as comparable">
    <label for="gm-comp-game">Game<select id="gm-comp-game">${compare.map(c => `<option value="${esc(c.game)}">${esc(c.name || c.game)}</option>`).join("")}</select></label>
    <label for="gm-comp-reason">Why it compares<input type="text" id="gm-comp-reason" required></label>
    <button type="submit">Save comp</button><button type="button" data-gm-comp-cancel>Cancel</button></form>`;
}

/** The section: a block per profile (`compare` from the entry), then + Comparable to (or its form while `open`). */
export function compareBlock(compare, open) {
  return `<div class="sect">Compare</div>${compare.length ? compare.map(row).join("") : `<div class="muted">No game profile yet.</div>`}
    ${compare.length ? (open ? compForm(compare) : `<div style="margin-top:6px"><button data-gm-comp-open>+ Comparable to</button></div>`) : ""}`;
}

/** The request that marks the entry comparable to a game. */
export function compRequest(e, game, reason) { return { method: "POST", path: path(e), body: { game, reason } }; }

/** The request that removes the mark. */
export function uncompRequest(e, game) { return { method: "DELETE", path: path(e, `/${encodeURIComponent(game)}`) }; }
