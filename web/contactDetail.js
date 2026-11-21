// The contact detail pane: channels, fit per game, touches, the editable fields and the add-touch form.
// Pure functions: HTML from a contact, and the requests an edit sends. marketingView.js sends them.

import { esc } from "./state.js";

export const STATUSES = ["active", "dormant", "archived"];
export const TOUCH_KINDS = ["mail", "reply", "video"];

/** A channel url made safe to link: http(s) as given, a bare host gets https://, any other scheme is not linked. */
export function channelHref(url) {
  const u = String(url ?? "").trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u) && !/^[^/]*\.[^/]*:\d+/.test(u)) return "";
  return u ? `https://${u}` : "";
}

const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel === v ? "selected" : ""}>${esc(l)}</option>`;

function channels(list) {
  if (!list.length) return `<span class="muted">None.</span>`;
  return `<ul class="mk-links">${list.map(ch => {
    const href = channelHref(ch.url);
    const link = href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(ch.url)}</a>` : esc(ch.url);
    return `<li><span class="pill">${esc(ch.kind)}</span> ${link}</li>`;
  }).join("")}</ul>`;
}

function touchForm(profiles, now) {
  return `<form class="form mk-touch" id="mk-touch" aria-label="Add a touch">
    <label for="mk-tk-kind">Kind<select id="mk-tk-kind">${TOUCH_KINDS.map(k => opt(k, k, "mail")).join("")}</select></label>
    <label for="mk-tk-game">Game<select id="mk-tk-game"><option value="">None</option>${profiles.map(p => opt(p.game, p.name || p.game, "")).join("")}</select></label>
    <label for="mk-tk-date">Date<input type="date" id="mk-tk-date" value="${esc(now)}" required></label>
    <button type="submit">Add touch</button><button type="button" data-mk-touch-cancel>Cancel</button></form>`;
}

function touches(c, profiles, open, now) {
  const rows = c.touches.map(t => `<li><span class="muted">${esc(t.date)}</span> · ${esc(t.kind)}${t.game ? " · " + esc(t.game) : ""}</li>`).join("");
  return `<div class="sect">Touches<span class="muted" style="text-transform:none;letter-spacing:0"> · ${c.touches.length}</span></div>
    ${rows ? `<ul class="log mono">${rows}</ul>` : `<div class="muted">No touches yet.</div>`}
    ${open ? touchForm(profiles, now) : `<div style="margin-top:6px"><button data-mk-touch>+ Touch</button></div>`}`;
}

/** The right pane for the selected contact (null: nothing selected yet). */
export function detailPane(c, profiles, touchOpen, now) {
  const wrap = body => `<section class="pane"><div class="pane-h">Contact</div><div class="pane-b detail">${body}</div></section>`;
  if (!c) return wrap(`<div class="empty">Select a contact.</div>`);
  const fit = c.fit.length ? c.fit.map(f => `<div class="cmt"><div class="cmt-h"><span>${esc(f.game)}</span></div>${esc(f.reason)}</div>`).join("") : `<div class="muted">No fit recorded.</div>`;
  return wrap(`<div class="mono muted">${c.due ? "due · " : ""}${esc(c.types.join(", "))}${c.topic ? " · " + esc(c.topic) : ""}</div>
    <h2>${esc(c.name)}</h2>
    <dl class="kv">
      <dt>Status</dt><dd><select id="mk-status" aria-label="Status">${STATUSES.map(s => opt(s, s, c.status)).join("")}</select></dd>
      <dt>Next contact</dt><dd><input type="date" id="mk-next" value="${esc(c.next)}" aria-label="Next contact date">${c.due ? ` <span class="pill due late">due</span>` : ""}</dd>
      <dt>Reach</dt><dd>${esc(c.reach || "-")}</dd>
      <dt>Email</dt><dd>${c.email ? esc(c.email) : "-"}</dd>
    </dl>
    <div class="sect">Channels</div>${channels(c.channels)}
    <div class="sect">Fit</div>${fit}
    <div class="sect">Notes<span id="saved"></span></div>
    <textarea id="mk-notes" class="desc-in" aria-label="Notes" placeholder="No notes yet.">${esc(c.notes)}</textarea>
    ${touches(c, profiles, touchOpen, now)}`);
}

/** The request an edited field sends, or null when it holds nothing new. `el` is {id, value}. */
export function editRequest(el, c) {
  const path = `/api/contacts/${encodeURIComponent(c.id)}`;
  if (el.id === "mk-status" && el.value !== c.status) return { method: "PATCH", path, body: { status: el.value } };
  if (el.id === "mk-next" && el.value !== c.next) return { method: "PATCH", path, body: { next: el.value } };
  if (el.id === "mk-notes" && el.value !== c.notes) return { method: "PATCH", path, body: { notes: el.value } };
  return null;
}

/** The request that adds a touch; the date defaults to `now`. */
export function touchRequest(c, { kind, game, date }, now) {
  return { method: "POST", path: `/api/contacts/${encodeURIComponent(c.id)}/touch`, body: { kind, game: game || "", date: date || now } };
}
