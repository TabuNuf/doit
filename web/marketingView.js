// The Marketing view: filters, the contacts list (due ones on top) and the selected contact's detail.
// The server filters and ranks; the page sends the filters and keeps due contacts above the rest.

import { S, $, esc, api, redraw, toast, today, fmtDate, compactCount } from "./state.js";
import { detailPane, editRequest, touchRequest, STATUSES } from "./contactDetail.js";
import { festivalPath, gamePane, festivalsPane } from "./festivalsPane.js";
import { weekPane } from "./weekPane.js";
import { draftsPane, draftEditRequest, sendQuestion, sweepSummary } from "./draftsPane.js";

export const TYPES = ["influencer", "blogger", "press", "publisher", "tester", "festival", "conference"];
export const REACH_OPTIONS = [["", "Any"], ["100", "100"], ["1000", "1 000"], ["10000", "10 000"], ["100000", "100 000"]];

/** The list request for the chosen filters. */
export function contactPath(f) {
  const q = new URLSearchParams();
  if (f.game) q.set("fits", f.game);
  for (const k of ["type", "reach", "status"]) if (f[k]) q.set(k, f[k]);
  const s = q.toString();
  return "/api/contacts" + (s ? "?" + s : "");
}

/** Due contacts first, each group in the order the server gave. */
export const dueFirst = list => [...list.filter(c => c.due), ...list.filter(c => !c.due)];

const select = (id, label, options, value) => `<label for="${id}">${label}<select id="${id}">${options.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;

/** The filter column. */
export function filterPane(f, profiles) {
  const any = l => ["", l];
  return `<section class="pane" aria-label="Filters"><div class="pane-h">Filters</div><div class="pane-b form mk-filters">
    ${select("mk-game", "Game", [any("Any game"), ...profiles.map(p => [p.game, p.name || p.game])], f.game)}
    ${select("mk-type", "Type", [any("Any type"), ...TYPES.map(t => [t, t])], f.type)}
    ${select("mk-reach", "Reach at least", REACH_OPTIONS, f.reach)}
    ${select("mk-fstatus", "Status", [any("Any status"), ...STATUSES.map(s => [s, s])], f.status)}
    <button data-mk-clear>Clear filters</button></div></section>`;
}

export function contactRow(c, sel) {
  const next = c.next ? `<span class="pill due ${c.due ? "late" : ""}" title="Next contact ${esc(c.next)}">${c.due ? "due " : ""}${esc(fmtDate(c.next))}</span>` : "";
  return `<button class="mk-row" data-contact="${esc(c.id)}" aria-pressed="${String(sel) === String(c.id)}">
    <span class="title">${esc(c.name)}</span>
    <span class="pills">${c.types.map(t => `<span class="pill">${esc(t)}</span>`).join("")}${c.reach !== null && c.reach !== undefined ? `<span class="pill mono" title="Reach ${esc(c.reach)}">${esc(compactCount(c.reach))}</span>` : ""}<span class="pill${c.status === "active" ? "" : " ai"}">${esc(c.status)}</span>${next}</span></button>`;
}

/** The list column: a Due group when any contact is due, then the rest. */
export function listPane(contacts, sel, draftCount = null) {
  if (!contacts) return `<section class="pane"><div class="pane-h">Contacts</div><div class="pane-b"><div class="empty">Loading…</div></div></section>`;
  const sorted = dueFirst(contacts);
  const due = sorted.filter(c => c.due), rest = sorted.filter(c => !c.due);
  const group = (name, list) => list.length ? `<div class="sec-h">${name}<span class="c">${list.length}</span></div>${list.map(c => contactRow(c, sel)).join("")}` : "";
  const body = contacts.length ? group("Due", due) + group(due.length ? "Others" : "All", rest) : `<div class="empty">No contact matches.</div>`;
  return `<section class="pane" aria-label="Contacts"><div class="pane-h">Contacts<span class="c">${contacts.length}</span><button data-mk-pane="drafts" class="pane-close">Drafts${draftCount === null ? "" : ` (${draftCount})`}</button></div><div class="pane-b">${body}</div></section>`;
}

export const MK_TABS = [["contacts", "Contacts"], ["drafts", "Drafts"], ["festivals", "Festivals"]];

/** Marketing's own tabs, shown in the top bar where the project chips are on the other views. */
export function marketingTabs(pane) {
  return MK_TABS.map(([id, label]) => `<button class="chip" data-mk-pane="${id}" aria-pressed="${pane === id}">${label}</button>`).join("");
}

export function marketingPanes() {
  return weekPane(S.mk.week, S.mk.sel) + tabPanes();
}

function tabPanes() {
  const m = S.mk;
  if (m.pane === "festivals") return gamePane(m.festGame, m.profiles) + festivalsPane(m.fest, m.sel) + detailPane(m.detail, m.profiles, m.touchOpen, today());
  const middle = m.pane === "drafts" ? draftsPane(m.drafts, m.status, m.sweep) : listPane(m.contacts, m.sel, m.drafts && m.drafts.length);
  return filterPane(m.f, m.profiles) + middle + detailPane(m.detail, m.profiles, m.touchOpen, today());
}

/** Opening the view: loads it, then sweeps the mailbox once, quietly (its result is a line in the Drafts pane). */
export async function openMarketing() {
  S.mk.sweep = "";
  await refreshMarketing();
  try { S.mk.sweep = sweepSummary(await api("POST", "/api/mail/sweep")); } catch (e) { S.mk.sweep = `Sweep failed: ${e.message}`; }
  return refreshMarketing();
}

/** Loads profiles, the filtered list, the drafts, the mail status and the selected contact. */
export async function refreshMarketing() {
  const m = S.mk;
  try {
    [m.profiles, m.contacts, m.drafts, m.status] = await Promise.all([api("GET", "/api/profiles"), api("GET", contactPath(m.f)), api("GET", "/api/drafts"), api("GET", "/api/mail/status")]);
    m.week = await api("GET", "/api/outreach").catch(() => null);
    if (m.pane === "festivals") m.fest = await api("GET", festivalPath(m.festGame));
    m.detail = m.sel ? await api("GET", `/api/contacts/${encodeURIComponent(m.sel)}`).catch(() => null) : null;
    if (!m.detail) { m.sel = null; m.touchOpen = false; }
    redraw();
  } catch (e) { toast(e.message); }
}

/** Sends an edit, shows the saved contact and reloads the list; a refused value goes to the toast. */
async function send(req) {
  try {
    S.mk.detail = await api(req.method, req.path, req.body);
    if (req.path.endsWith("/touch")) S.mk.touchOpen = false;
  } catch (e) { toast(e.message); }
  return refreshMarketing();
}

/** Handles a click on a Marketing control; true when the click was one. */
export function marketingClick(d) {
  const m = S.mk;
  if (d.taskContact) { S.view = "marketing"; m.pane = "contacts"; m.sel = d.taskContact; m.detail = null; m.touchOpen = false; redraw(); refreshMarketing(); return true; }
  if (d.contact) { m.sel = d.contact; m.detail = null; m.touchOpen = false; redraw(); refreshMarketing(); return true; }
  if (d.mkPane) { m.pane = d.mkPane; redraw(); if (m.pane === "festivals") refreshMarketing(); return true; }
  if (d.mkSend) { sendDraft(d.mkSend); return true; }
  if (d.mkDiscard) { discardDraft(d.mkDiscard); return true; }
  if ("mkTouch" in d) { m.touchOpen = true; redraw(); $("#mk-tk-kind")?.focus(); return true; }
  if ("mkTouchCancel" in d) { m.touchOpen = false; redraw(); return true; }
  if ("mkClear" in d) { m.f = { game: "", type: "", reach: "", status: "" }; refreshMarketing(); return true; }
  return false;
}

/** Saves an edited subject or body; a refused one goes to the toast and the saved text comes back. */
async function saveDraft(req) {
  try { await api(req.method, req.path, req.body); } catch (e) { toast(e.message); }
  return refreshMarketing();
}

async function sendDraft(id) {
  const draft = S.mk.drafts.find(x => String(x.id) === String(id));
  if (!draft || !confirm(sendQuestion(draft))) return;
  try { await api("POST", `/api/drafts/${encodeURIComponent(id)}/send`); } catch (e) { toast(e.message); }
  return refreshMarketing();
}

async function discardDraft(id) {
  try { await api("DELETE", `/api/drafts/${encodeURIComponent(id)}`); } catch (e) { toast(e.message); }
  return refreshMarketing();
}

const FILTERS = { "mk-game": "game", "mk-type": "type", "mk-reach": "reach", "mk-fstatus": "status" };

/** A changed filter or detail field; true when the change was one. */
export function marketingChange(ev) {
  const el = ev.target;
  if (el.id === "mk-fgame") { S.mk.festGame = el.value; refreshMarketing(); return true; }
  if (FILTERS[el.id]) { S.mk.f[FILTERS[el.id]] = el.value; refreshMarketing(); return true; }
  const dr = draftEditRequest(el, S.mk.drafts);
  if (dr) { saveDraft(dr); return true; }
  const req = S.view === "marketing" && S.mk.detail && el.id !== "mk-notes" && editRequest(el, S.mk.detail);
  if (req) send(req);
  return Boolean(req) || el.id.startsWith("mk-");
}

/** Notes save when the field loses focus; true when the event was the notes field. */
export function marketingFocusOut(ev) {
  if (ev.target.id !== "mk-notes" || !S.mk.detail) return false;
  const req = editRequest(ev.target, S.mk.detail);
  if (req) send(req);
  return true;
}

/** The add-touch form; true when the form was this one. */
export function marketingSubmit(f) {
  if (f.id !== "mk-touch" || !S.mk.detail) return false;
  send(touchRequest(S.mk.detail, { kind: $("#mk-tk-kind").value, game: $("#mk-tk-game").value, date: $("#mk-tk-date").value }, today()));
  return true;
}
