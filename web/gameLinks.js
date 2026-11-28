// The link blocks of the game pane: Stores and Trackers (one row per link, with an add row) and Covered by. Pure.

import { esc } from "./state.js";
import { channelHref } from "./contactChannels.js";

export const STORE_KINDS = ["steam", "epic", "gog", "itch", "playstation", "xbox", "switch", "appstore", "googleplay", "humble", "other"];
export const TRACKER_KINDS = ["gamalytic", "steamdb", "vgchartz", "steamspy", "steamcharts", "metacritic", "opencritic", "howlongtobeat", "igdb", "other"];
const KINDS = { stores: STORE_KINDS, trackers: TRACKER_KINDS };
/** The PATCH key that changes one link; the plural key would replace them all. */
const ONE = { stores: "store", trackers: "tracker" };

const path = e => `/api/games/${encodeURIComponent(e.key)}`;

/** A Stores or Trackers section: a row per link (kind, URL opening in a new tab, Remove) and the add row. */
export function linksBlock(heading, field, links) {
  const rows = Object.entries(links ?? {}).map(([kind, url]) => {
    const href = channelHref(url);
    return `<li><span class="pill">${esc(kind)}</span> ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(url)}</a>` : esc(url)}
      <button data-gm-del="${field}/${esc(kind)}" aria-label="Remove the ${esc(kind)} link">Remove</button></li>`;
  }).join("");
  return `<div class="sect">${heading}</div>
    ${rows ? `<ul class="mk-links">${rows}</ul>` : `<div class="muted">None yet. Add one below.</div>`}
    <div class="mk-ch"><select id="gm-lk-${field}" aria-label="Kind of the new ${ONE[field]} link">${KINDS[field].map(k => `<option value="${k}">${k}</option>`).join("")}</select>
      <input type="text" id="gm-lu-${field}" placeholder="https://..." aria-label="URL of the new ${ONE[field]} link">
      <button data-gm-add="${field}">Add link</button></div>`;
}

/** The request that sets the link of `kind` to `url` (an existing kind is replaced); null when the URL is empty. */
export function linkAdd(entry, field, kind, url) {
  const u = String(url ?? "").trim();
  return u ? { method: "PATCH", path: path(entry), body: { [ONE[field]]: { [kind]: u } } } : null;
}

/** The request that removes the link of `kind` (an empty URL removes it on the server). */
export function linkRemove(entry, field, kind) {
  return { method: "PATCH", path: path(entry), body: { [ONE[field]]: { [kind]: "" } } };
}

/** The Covered by section: each contact with reach, kind, date and a Source link; a name opens the contact. */
export function coveredByBlock(list) {
  const rows = list.map(c => {
    const href = channelHref(c.source);
    return `<li><button data-contact="${esc(c.id)}" data-mk-to="contacts">${esc(c.name)}</button> <span class="mono muted">${c.reach === null || c.reach === undefined ? "" : `reach ${esc(c.reach)} · `}${esc(c.kind)} ${esc(c.date)}</span>
      ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">Source</a>` : ""}</li>`;
  }).join("");
  return `<div class="sect">Covered by<span class="muted" style="text-transform:none;letter-spacing:0"> · ${list.length}</span></div>
    ${rows ? `<ul class="mk-links">${rows}</ul>` : `<div class="muted">No contact covers it yet.</div>`}`;
}
