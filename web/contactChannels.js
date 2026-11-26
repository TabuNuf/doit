// The channels block of the contact pane: each channel's kind and URL edited in place, removed, and a row to add one.
// Pure: HTML from a contact's channels, and the request each change sends (the whole list, as the API takes it).

import { esc } from "./state.js";

export const CHANNEL_KINDS = ["youtube", "twitch", "kick", "tiktok", "bluesky", "x", "instagram", "facebook", "reddit", "discord", "steam", "patreon", "podcast", "rumble", "website", "linktree"];

/** A channel url made safe to link: http(s) as given, a bare host gets https://, any other scheme is not linked. */
export function channelHref(url) {
  const u = String(url ?? "").trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u) && !/^[^/]*\.[^/]*:\d+/.test(u)) return "";
  return u ? `https://${u}` : "";
}

const kindSelect = (id, kind, label) => `<select id="${id}" aria-label="${label}">${CHANNEL_KINDS.map(k => `<option value="${k}" ${k === kind ? "selected" : ""}>${k}</option>`).join("")}</select>`;

/** The Channels section: a row per channel (kind, URL, open link, Remove) and the add row. */
export function channelsBlock(list) {
  const rows = list.map((ch, i) => {
    const href = channelHref(ch.url);
    return `<li class="mk-ch">${kindSelect(`mk-chk-${i}`, ch.kind, "Channel kind")}
      <input type="text" id="mk-chu-${i}" value="${esc(ch.url)}" aria-label="Channel URL">
      <input type="number" min="0" step="1" id="mk-chf-${i}" value="${esc(ch.followers ?? "")}" aria-label="Followers" placeholder="followers" class="mk-chn">
      <input type="date" id="mk-cha-${i}" value="${esc(ch.active ?? "")}" aria-label="Last active date">
      ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener" title="Open ${esc(ch.url)}">Open</a>` : ""}
      <button data-mk-ch-del="${i}" aria-label="Remove ${esc(ch.kind)} channel">Remove</button></li>`;
  }).join("");
  return `<div class="sect">Channels</div>
    ${rows ? `<ul class="mk-links">${rows}</ul>` : `<div class="muted">No channels yet. Add one below.</div>`}
    <div class="mk-ch">${kindSelect("mk-chk-new", "youtube", "Kind of the new channel")}
      <input type="text" id="mk-chu-new" placeholder="URL or link" aria-label="URL of the new channel">
      <button data-mk-ch-add>Add channel</button></div>`;
}

const save = (c, channels) => ({ method: "PATCH", path: `/api/contacts/${encodeURIComponent(c.id)}`, body: { channels } });

/** The request an edited channel field sends (`el` is {id, value}), or null when it holds nothing new. */
export function channelEdit(el, c) {
  const m = /^mk-ch([kufa])-(\d+)$/.exec(el.id);
  const i = m ? Number(m[2]) : -1;
  if (!c.channels[i]) return null;
  const field = { k: "kind", u: "url", f: "followers", a: "active" }[m[1]];
  const value = field === "url" ? el.value.trim() : field === "followers" ? (el.value === "" ? null : Number(el.value)) : el.value;
  if (value === (c.channels[i][field] ?? (field === "active" ? "" : null))) return null;
  return save(c, c.channels.map((ch, j) => (j === i ? { ...ch, [field]: value } : ch)));
}

/** The request that removes channel number `i`. */
export function channelRemove(c, i) { return save(c, c.channels.filter((_, j) => j !== Number(i))); }

/** The request that adds a channel of `kind` at `url`; null when the URL is empty. */
export function channelAdd(c, kind, url) {
  const u = String(url ?? "").trim();
  return u ? save(c, [...c.channels, { kind, url: u }]) : null;
}
