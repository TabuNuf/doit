// The Marketing view: a game or podcast picked in the top bar, then the tabs Campaigns, Contacts, Festivals,
// Events, Drafts and Overview. The server filters and ranks; the page sends the pick and the filters.

import { S, $, esc, api, redraw, toast, today, fmtDate, compactCount } from "./state.js";
import { detailPane, editRequest, touchRequest, STATUSES } from "./contactDetail.js";
import { festivalPath, eventsInfoPane, festivalsPane } from "./festivalsPane.js";
import { overviewPanes } from "./weekPane.js";
import { campaignsFor, profilePane, campaignsPane } from "./campaignsPane.js";
import { openEpic } from "./epicView.js";
import { draftsPane, draftEditRequest, sendQuestion, sweepSummary } from "./draftsPane.js";

/** The types a person or outlet has; festivals and conferences have their own tabs. */
export const TYPES = ["influencer", "blogger", "press", "publisher", "tester"];
const EVENT_TYPES = "festival,conference";
export const REACH_OPTIONS = [["", "Any"], ["100", "100"], ["1000", "1 000"], ["10000", "10 000"], ["100000", "100 000"]];

/** The list request for the picked game and the chosen filters; events are left out. */
export function contactPath(f, game = "") {
  const q = new URLSearchParams();
  if (game) q.set("fits", game);
  for (const k of ["type", "reach", "status", "genre"]) if (f[k]) q.set(k, f[k]);
  q.set("except", EVENT_TYPES);
  const s = q.toString();
  return "/api/contacts" + (s ? "?" + s : "");
}

/** Due contacts first, each group in the order the server gave. */
export const dueFirst = list => [...list.filter(c => c.due), ...list.filter(c => !c.due)];

const select = (id, label, options, value) => `<label for="${id}">${label}<select id="${id}">${options.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;

/** The filter column; the game is picked in the top bar. */
export function filterPane(f, genres = []) {
  const any = l => ["", l];
  return `<section class="pane" aria-label="Filters"><div class="pane-h">Filters</div><div class="pane-b form mk-filters">
    ${select("mk-type", "Type", [any("Any type"), ...TYPES.map(t => [t, t])], f.type)}
    ${select("mk-reach", "Reach at least", REACH_OPTIONS, f.reach)}
    ${select("mk-genre", "Genre", [any("Any genre"), ...genres.map(g => [g, g])], f.genre)}
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

export const MK_TABS = [["campaigns", "Campaigns"], ["contacts", "Contacts"], ["festivals", "Festivals"], ["events", "Events"], ["drafts", "Drafts"], ["overview", "Overview"]];
/** The event type each event tab lists. */
const EVENT_TAB = { festivals: "festival", events: "conference" };

/** The picker: the profiles, grouped as games, applications and podcasts. */
export function gamePicker(game, profiles) {
  const opt = p => `<option value="${esc(p.game)}" ${p.game === game ? "selected" : ""}>${esc(p.name || p.game)}${p.missing ? " (no profile)" : ""}</option>`;
  const group = (label, kind) => { const ps = profiles.filter(p => (p.kind || "game") === kind); return ps.length ? `<optgroup label="${label}">${ps.map(opt).join("")}</optgroup>` : ""; };
  return `<select id="mk-pick" class="mk-pick" aria-label="Game or podcast" title="The game, application or podcast every tab shows"><option value="">Any game or podcast</option>${group("Games", "game")}${group("Applications", "application")}${group("Podcasts", "podcast")}</select>`;
}

/** The picker, then Marketing's own tabs, shown in the top bar where the project chips are on the other views. */
export function marketingTabs(pane, game = "", profiles = []) {
  return gamePicker(game, profiles) + MK_TABS.map(([id, label]) => `<button class="chip" data-mk-pane="${id}" aria-pressed="${pane === id}">${label}</button>`).join("");
}

export function marketingPanes() {
  const m = S.mk;
  const detail = () => detailPane(m.detail, m.profiles, m.touchOpen, today());
  if (m.pane === "overview") return overviewPanes(m.week, m.sel, m.game);
  if (m.pane === "campaigns") return profilePane(m.game, m.profiles) + campaignsPane(m.campaigns && campaignsFor(m.campaigns, m.game)) + detail();
  if (EVENT_TAB[m.pane]) { const title = m.pane === "events" ? "Events" : "Festivals"; return eventsInfoPane(title, m.game, m.profiles) + festivalsPane(m.fest, m.sel, title) + detail(); }
  const middle = m.pane === "drafts" ? draftsPane(m.drafts, m.status, m.sweep) : listPane(m.contacts, m.sel, m.drafts && m.drafts.length);
  return filterPane(m.f, m.genres) + middle + detail();
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
    [m.profiles, m.contacts, m.drafts, m.status, m.genres] = await Promise.all([api("GET", "/api/profiles"), api("GET", contactPath(m.f, m.game)), api("GET", "/api/drafts"), api("GET", "/api/mail/status"), api("GET", "/api/genres")]);
    if (m.pane === "overview") m.week = await api("GET", "/api/outreach").catch(() => null);
    if (EVENT_TAB[m.pane]) m.fest = await api("GET", festivalPath(m.game, EVENT_TAB[m.pane]));
    if (m.pane === "campaigns") m.campaigns = (await api("GET", "/api/board?project=all")).epics;
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
  if (d.contact) { if (d.mkTo) m.pane = d.mkTo; m.sel = d.contact; m.detail = null; m.touchOpen = false; redraw(); refreshMarketing(); return true; }
  if (d.mkPane) { m.pane = d.mkPane; m.fest = null; redraw(); refreshMarketing(); return true; }
  if (d.campaign) { S.view = "board"; S.project = d.campaign.split("/")[0]; S.tab = "open"; openEpic(d.campaign); return true; }
  if (d.mkSend) { sendDraft(d.mkSend); return true; }
  if (d.mkDiscard) { discardDraft(d.mkDiscard); return true; }
  if ("mkTouch" in d) { m.touchOpen = true; redraw(); $("#mk-tk-kind")?.focus(); return true; }
  if ("mkTouchCancel" in d) { m.touchOpen = false; redraw(); return true; }
  if ("mkClear" in d) { m.f = { type: "", reach: "", status: "", genre: "" }; refreshMarketing(); return true; }
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

const FILTERS = { "mk-type": "type", "mk-reach": "reach", "mk-fstatus": "status", "mk-genre": "genre" };

/** A changed filter or detail field; true when the change was one. */
export function marketingChange(ev) {
  const el = ev.target;
  if (el.id === "mk-pick") { S.mk.game = el.value; S.mk.fest = null; refreshMarketing(); return true; }
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
