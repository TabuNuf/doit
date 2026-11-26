// The Covered games block of the contact pane: the games the creator played, reviewed or streamed, each with its scale, kind, date and source link. Pure.

import { esc } from "./state.js";
import { channelHref } from "./contactChannels.js";

/** The block; a contact with none shows a line saying how one is added. */
export function coveredBlock(c) {
  const games = c.games ?? [];
  const rows = games.map((g, i) => {
    const href = channelHref(g.source);
    return `<li><strong>${esc(g.title)}</strong> <span class="pill">${esc(g.scales.join("+"))}</span> <span class="mono muted">${esc(g.kind)} ${esc(g.date)}</span>${g.genres.length ? ` <span class="muted">${esc(g.genres.join(", "))}</span>` : ""}
      ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">Source</a>` : ""} <button data-mk-game-del="${i}" aria-label="Remove ${esc(g.title)}">Remove</button></li>`;
  }).join("");
  return `<div class="sect">Covered games<span class="muted" style="text-transform:none;letter-spacing:0"> · ${games.length}${c.why ? " · relevant: " + esc(c.why) : ""}</span></div>
    ${rows ? `<ul class="mk-links">${rows}</ul>` : `<div class="muted">None yet. Claude adds them, each with a date and a source link.</div>`}`;
}

/** The request that removes covered game number `i`. */
export function gameRemove(c, i) {
  return { method: "DELETE", path: `/api/contacts/${encodeURIComponent(c.id)}/games/${encodeURIComponent(c.games[Number(i)].title)}` };
}
