// The contact detail pane: channels, fit per game, touches, the editable fields and the add-touch form.
// Pure functions: HTML from a contact, and the requests an edit sends. marketingView.js sends them.

import { esc } from "./state.js";
import { channelsBlock, channelEdit } from "./contactChannels.js";
import { historyList, lastContactOf } from "./contactHistory.js";
import { specialMark } from "./contactColumns.js";
import { gamesBlock } from "./contactGames.js";
import { coveredBlock } from "./contactCovered.js";

export { channelHref } from "./contactChannels.js";

export const STATUSES = ["active", "dormant", "parked", "archived"];
export const TOUCH_KINDS = ["mail", "reply", "video"];

const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel === v ? "selected" : ""}>${esc(l)}</option>`;

function touchForm(profiles, now) {
  return `<form class="form mk-touch" id="mk-touch" aria-label="Add a touch">
    <label for="mk-tk-kind">Kind<select id="mk-tk-kind">${TOUCH_KINDS.map(k => opt(k, k, "mail")).join("")}</select></label>
    <label for="mk-tk-game">Game<select id="mk-tk-game"><option value="">None</option>${profiles.map(p => opt(p.game, p.name || p.game, "")).join("")}</select></label>
    <label for="mk-tk-date">Date<input type="date" id="mk-tk-date" value="${esc(now)}" required></label>
    <button type="submit">Add touch</button><button type="button" data-mk-touch-cancel>Cancel</button></form>`;
}

function history(c, history, profiles, open, now) {
  return `<div class="sect">History<span class="muted" style="text-transform:none;letter-spacing:0"> · ${(history ?? c.touches).length}</span></div>
    ${historyList(c, history)}
    ${open ? touchForm(profiles, now) : `<div style="margin-top:6px"><button data-mk-touch>+ Touch</button></div>`}`;
}

/** The right pane for the selected contact (null: nothing selected yet). */
export function detailPane(c, profiles, touchOpen, now, log = null, fitOpen = false) {
  const wrap = body => `<section class="pane"><div class="pane-h">Contact</div><div class="pane-b detail">${body}</div></section>`;
  if (!c) return wrap(`<div class="empty">Select a contact.</div>`);
  return wrap(`<div class="mono muted">${c.due ? "due · " : ""}${esc(c.types.join(", "))}${c.topic ? " · " + esc(c.topic) : ""}</div>
    <h2>${esc(c.name)}${specialMark(c)}</h2>
    <dl class="kv">
      <dt>Status</dt><dd><select id="mk-status" aria-label="Status">${STATUSES.map(s => opt(s, s, c.status)).join("")}</select></dd>
      <dt>Next contact</dt><dd><input type="date" id="mk-next" value="${esc(c.next)}" aria-label="Next contact date">${c.due ? ` <span class="pill due late">due</span>` : ""}</dd>
      <dt>Reach</dt><dd><input type="number" id="mk-reach-n" min="0" step="1" value="${esc(c.reach ?? "")}" aria-label="Reach in followers" placeholder="-"></dd>
      <dt>Last contact</dt><dd>${lastContactOf(c, log) || "No contact yet"}</dd>
      <dt>Special</dt><dd><input type="text" id="mk-special" value="${esc(c.special ?? "")}" aria-label="Special relationship: a one-line reason" placeholder="A friend, a past collaborator"></dd>
      <dt>Email</dt><dd>${c.email ? esc(c.email) : "-"}</dd>
      <dt>Scales</dt><dd><input type="text" id="mk-scales" value="${esc((c.scales ?? []).join(", "))}" aria-label="Scales the creator covers: solo, indie, triple-i, aa, aaa" placeholder="indie, aa"></dd>
      <dt>Scale note</dt><dd><input type="text" id="mk-scalenote" value="${esc(c.scaleNote ?? "")}" aria-label="Scale note: the evidence for the scales" placeholder="5 of the last 20 uploads indie"></dd>
      <dt>Checked</dt><dd><input type="date" id="mk-checked" value="${esc(c.checked ?? "")}" aria-label="Date the creator was last researched"></dd>
      <dt>Reddit</dt><dd><input type="text" id="mk-reddit" value="${esc(c.reddit ?? "")}" aria-label="Reddit: subreddit or user URL" placeholder="https://www.reddit.com/r/..."></dd>
      <dt>Genres</dt><dd><input type="text" id="mk-genres" value="${esc((c.genres ?? []).join(", "))}" aria-label="Genres, separated by commas" placeholder="Indie, Horror"></dd>
    </dl>
    ${channelsBlock(c.channels)}
    ${gamesBlock(c, profiles, fitOpen)}
    ${coveredBlock(c)}
    <div class="sect">About</div>
    <textarea id="mk-about" class="desc-in" aria-label="About: who the contact is and what they cover" placeholder="Who they are and what they cover.">${esc(c.about ?? "")}</textarea>
    <div class="sect">Notes<span id="saved"></span></div>
    <textarea id="mk-notes" class="desc-in" aria-label="Notes" placeholder="No notes yet.">${esc(c.notes)}</textarea>
    ${history(c, log, profiles, touchOpen, now)}`);
}

/** The request an edited field sends, or null when it holds nothing new. `el` is {id, value}. */
export function editRequest(el, c) {
  const path = `/api/contacts/${encodeURIComponent(c.id)}`;
  if (el.id === "mk-status" && el.value !== c.status) return { method: "PATCH", path, body: { status: el.value } };
  if (el.id === "mk-next" && el.value !== c.next) return { method: "PATCH", path, body: { next: el.value } };
  if (el.id === "mk-reach-n" && (el.value === "" ? null : Number(el.value)) !== c.reach) return { method: "PATCH", path, body: { reach: el.value === "" ? null : Number(el.value) } };
  if (el.id === "mk-genres") { const genres = el.value.split(",").map(g => g.trim()).filter(Boolean); if (genres.join(",") !== (c.genres ?? []).join(",")) return { method: "PATCH", path, body: { genres } }; }
  if (el.id === "mk-special" && el.value.trim() !== (c.special ?? "")) return { method: "PATCH", path, body: { special: el.value } };
  if (el.id === "mk-scales") { const scales = el.value.split(",").map(g => g.trim()).filter(Boolean); if (scales.join(",") !== (c.scales ?? []).join(",")) return { method: "PATCH", path, body: { scales } }; }
  if (el.id === "mk-scalenote" && el.value.trim() !== (c.scaleNote ?? "")) return { method: "PATCH", path, body: { scaleNote: el.value } };
  if (el.id === "mk-checked" && el.value !== (c.checked ?? "")) return { method: "PATCH", path, body: { checked: el.value } };
  if (el.id === "mk-reddit" && el.value.trim() !== (c.reddit ?? "")) return { method: "PATCH", path, body: { reddit: el.value } };
  if (el.id === "mk-about" && el.value !== (c.about ?? "")) return { method: "PATCH", path, body: { about: el.value } };
  if (el.id.startsWith("mk-ch")) return channelEdit(el, c);
  if (el.id === "mk-notes" && el.value !== c.notes) return { method: "PATCH", path, body: { notes: el.value } };
  return null;
}

/** The request that adds a touch; the date defaults to `now`. */
export function touchRequest(c, { kind, game, date }, now) {
  return { method: "POST", path: `/api/contacts/${encodeURIComponent(c.id)}/touch`, body: { kind, game: game || "", date: date || now } };
}
