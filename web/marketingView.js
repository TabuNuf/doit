// The Marketing view: a game or podcast picked in the top bar, then the tabs Campaigns, Contacts, Festivals,
// Events, Drafts and Overview. The server filters and ranks; the page sends the pick and the filters.

import { S, $, esc, api, redraw, toast, today, fmtDate, compactCount } from "./state.js";
import { detailPane, editRequest, touchRequest, STATUSES } from "./contactDetail.js";
import { channelRemove, channelAdd } from "./contactChannels.js";
import { lastPill } from "./contactHistory.js";
import { festivalPath, eventsInfoPane, festivalsPane } from "./festivalsPane.js";
import { eventPane, eventEditRequest } from "./eventDetail.js";
import { overviewPanes } from "./weekPane.js";
import { campaignsFor, profilePane, campaignsPane, campaignForm, campaignRequest } from "./campaignsPane.js";
import { openEpic } from "./epicView.js";
import { openSettingsFor } from "./projectSettings.js";
import { draftsPane, draftEditRequest, sendQuestion, sweepSummary } from "./draftsPane.js";

/** The types a person or outlet has; festivals and conferences have their own tabs. */
export const TYPES = ["influencer", "blogger", "press", "publisher", "tester"];
const EVENT_TYPES = "festival,conference";
export const REACH_OPTIONS = [["", "Any"], ["100", "100"], ["1000", "1 000"], ["10000", "10 000"], ["100000", "100 000"]];

/** The list request for the chosen filters; events are left out. The picked game does not filter: contacts are contacts, the game only marks the ones that fit. */
export function contactPath(f) {
  const q = new URLSearchParams();
  for (const k of ["type", "reach", "status", "genre"]) if (f[k]) q.set(k, f[k]);
  q.set("except", EVENT_TYPES);
  const s = q.toString();
  return "/api/contacts" + (s ? "?" + s : "");
}

/** The picked game as {id, name} for the fit mark, or null. */
const pickedGame = m => (m.game ? { id: m.game, name: m.profiles.find(p => p.game === m.game)?.name || m.game } : null);

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

/** The mark on a contact that fits the picked game, saying what it means and why. */
export function fitMark(c, game) {
  const fit = game && (c.fit ?? []).find(f => f.game === game.id);
  return fit ? `<span class="pill fit" title="Fits ${esc(game.name)}: ${esc(fit.reason)}">fits</span>` : "";
}

export function contactRow(c, sel, game = null) {
  const next = c.next ? `<span class="pill due ${c.due ? "late" : ""}" title="Next contact ${esc(c.next)}">${c.due ? "due " : ""}${esc(fmtDate(c.next))}</span>` : "";
  return `<button class="mk-row" data-contact="${esc(c.id)}" aria-pressed="${String(sel) === String(c.id)}">
    <span class="title">${esc(c.name)}</span>
    <span class="pills">${c.types.map(t => `<span class="pill">${esc(t)}</span>`).join("")}${c.reach !== null && c.reach !== undefined ? `<span class="pill mono" title="Reach ${esc(c.reach)}">${esc(compactCount(c.reach))}</span>` : ""}${fitMark(c, game)}<span class="pill${c.status === "active" ? "" : " ai"}">${esc(c.status)}</span>${lastPill(c)}${next}</span></button>`;
}

/** The list column: a Due group when any contact is due, then the rest. */
export function listPane(contacts, sel, draftCount = null, game = null, filtered = false) {
  if (!contacts) return `<section class="pane"><div class="pane-h">Contacts</div><div class="pane-b"><div class="empty">Loading…</div></div></section>`;
  const sorted = dueFirst(contacts);
  const due = sorted.filter(c => c.due), rest = sorted.filter(c => !c.due);
  const group = (name, list) => list.length ? `<div class="sec-h">${name}<span class="c">${list.length}</span></div>${list.map(c => contactRow(c, sel, game)).join("")}` : "";
  const body = contacts.length ? group("Due", due) + group(due.length ? "Others" : "All", rest) : filtered ? `<div class="empty">No contact matches these filters. <button data-mk-clear>Clear filters</button></div>` : `<div class="empty">No contacts yet.</div>`;
  return `<section class="pane" aria-label="Contacts"><div class="pane-h">Contacts<span class="c">${contacts.length}</span><button data-mk-pane="drafts" class="pane-close">Drafts${draftCount === null ? "" : ` (${draftCount})`}</button></div><div class="pane-b">${body}</div></section>`;
}

export const MK_TABS = [["campaigns", "Campaigns"], ["contacts", "Contacts"], ["festivals", "Festivals"], ["events", "Events"], ["drafts", "Drafts"], ["overview", "Overview"]];
/** The `platform` each event tab asks for: Events are the store events (Steam, Epic, GOG, itch), Festivals every other. */
const EVENT_TAB = { festivals: "0", events: "1" };

/** The picker: the profiles, grouped as games, applications and podcasts. */
export function gamePicker(game, profiles) {
  const opt = p => `<option value="${esc(p.game)}" ${p.game === game ? "selected" : ""}>${esc(p.name || p.game)}</option>`;
  const group = (label, kind) => { const ps = profiles.filter(p => (p.kind || "game") === kind); return ps.length ? `<optgroup label="${label}">${ps.map(opt).join("")}</optgroup>` : ""; };
  return `<select id="mk-pick" class="mk-pick" aria-label="Game or podcast" title="The game, application or podcast every tab shows"><option value="">Any game or podcast</option>${group("Games", "game")}${group("Applications", "application")}${group("Podcasts", "podcast")}</select>`;
}

/** The picker, then Marketing's own tabs, shown in the top bar where the project chips are on the other views. */
export function marketingTabs(pane, game = "", profiles = []) {
  return gamePicker(game, profiles) + MK_TABS.map(([id, label]) => `<button class="chip" data-mk-pane="${id}" aria-pressed="${pane === id}">${label}</button>`).join("");
}

export function marketingPanes() {
  const m = S.mk;
  const detail = () => detailPane(m.detail, m.profiles, m.touchOpen, today(), m.history);
  if (m.pane === "overview") return overviewPanes(m.week, m.sel, m.game);
  if (m.pane === "campaigns") return profilePane(m.game, m.profiles) + campaignsPane(m.campaigns && campaignsFor(m.campaigns, m.game), m.newCampaign ? campaignForm(m.profiles, m.game, m.events) : "") + detail();
  if (EVENT_TAB[m.pane]) { const title = m.pane === "events" ? "Events" : "Festivals"; return eventsInfoPane(title, m.game, m.profiles) + festivalsPane(m.fest, m.sel, title) + eventPane(m.detail && m.detail.event ? m.detail : null, title === "Events" ? "Event" : "Festival"); }
  const middle = m.pane === "drafts" ? draftsPane(m.drafts, m.status, m.sweep) : listPane(m.contacts, m.sel, m.drafts && m.drafts.length, pickedGame(m), Object.values(m.f).some(Boolean));
  return filterPane(m.f, m.genres) + middle + detail();
}

/** The contact id above or below `sel` in `ids` (`key` ArrowUp or ArrowDown); the first when none is selected, the same at either end. */
export function nextContact(ids, sel, key) {
  if (!ids.length) return null;
  const i = ids.findIndex(id => String(id) === String(sel));
  if (i < 0) return ids[0];
  return ids[Math.max(0, Math.min(ids.length - 1, i + (key === "ArrowDown" ? 1 : -1)))];
}

/** Arrow up and down in a Contacts, Festivals or Events list move the selection, and the pane follows; true when the key was one of those. */
export function marketingKey(ev) {
  const m = S.mk;
  if (S.view !== "marketing" || (ev.key !== "ArrowUp" && ev.key !== "ArrowDown") || ev.altKey || ev.ctrlKey || ev.metaKey) return false;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) || ev.target.isContentEditable) return false;
  const ids = m.pane === "contacts" ? dueFirst(m.contacts || []).map(c => c.id) : EVENT_TAB[m.pane] ? (m.fest || []).map(c => c.id) : null;
  if (!ids) return false;
  ev.preventDefault();
  const id = nextContact(ids, m.sel, ev.key);
  if (id === null || String(id) === String(m.sel)) return true;
  m.sel = id; m.touchOpen = false;
  refreshMarketing().then(() => $(`[data-contact="${id}"]`)?.focus());
  return true;
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
    [m.profiles, m.contacts, m.drafts, m.status, m.genres] = await Promise.all([api("GET", "/api/profiles"), api("GET", contactPath(m.f)), api("GET", "/api/drafts"), api("GET", "/api/mail/status"), api("GET", "/api/genres")]);
    if (m.pane === "overview") m.week = await api("GET", "/api/outreach").catch(() => null);
    if (EVENT_TAB[m.pane]) m.fest = await api("GET", festivalPath(m.game, EVENT_TAB[m.pane]));
    if (m.pane === "campaigns") m.campaigns = (await api("GET", "/api/board?project=all")).epics;
    m.detail = m.sel ? await api("GET", `/api/contacts/${encodeURIComponent(m.sel)}`).catch(() => null) : null;
    m.history = m.detail ? await api("GET", `/api/contacts/${encodeURIComponent(m.sel)}/history`).catch(() => null) : null;
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
  if (d.mkSettings) { openSettingsFor(d.mkSettings); return true; }
  if ("mkNewcamp" in d) { m.newCampaign = !m.newCampaign; if (m.newCampaign) openCampaignForm(); else redraw(); return true; }
  if (d.mkPane) { m.pane = d.mkPane; m.fest = null; redraw(); refreshMarketing(); return true; }
  if (d.campaign) { S.view = "board"; S.project = d.campaign.split("/")[0]; S.tab = "open"; openEpic(d.campaign); return true; }
  if (d.mkSend) { sendDraft(d.mkSend); return true; }
  if (d.mkDiscard) { discardDraft(d.mkDiscard); return true; }
  if (d.mkChDel !== undefined && m.detail) { send(channelRemove(m.detail, d.mkChDel)); return true; }
  if ("mkChAdd" in d && m.detail) { const req = channelAdd(m.detail, $("#mk-chk-new").value, $("#mk-chu-new").value); req ? send(req) : toast("Give the channel a URL first."); return true; }
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
  const d = S.view === "marketing" && S.mk.detail;
  const req = d && (el.id.startsWith("ev-") ? d.event && eventEditRequest(el, d) : el.id !== "mk-notes" && el.id !== "mk-about" && editRequest(el, d));
  if (req) send(req);
  return Boolean(req) || el.id.startsWith("mk-") || el.id.startsWith("ev-");
}

/** Notes and About save when the field loses focus; true when the event was one of them. */
export function marketingFocusOut(ev) {
  if ((ev.target.id !== "mk-notes" && ev.target.id !== "mk-about") || !S.mk.detail) return false;
  const req = editRequest(ev.target, S.mk.detail);
  if (req) send(req);
  return true;
}

/** Opens the + Campaign form once the open events it offers are loaded. */
async function openCampaignForm() {
  try { S.mk.events = await api("GET", "/api/festivals"); } catch (e) { toast(e.message); }
  redraw(); $("#mk-cp-name")?.focus();
}

/** Starts the campaign: the request, then the list with the new one on it. */
async function startCampaign() {
  const req = campaignRequest({ project: $("#mk-cp-project").value, name: $("#mk-cp-name").value, event: $("#mk-cp-event").value });
  try { await api(req.method, req.path, req.body); S.mk.newCampaign = false; S.mk.game = $("#mk-cp-project").value; } catch (e) { toast(e.message); }
  return refreshMarketing();
}

/** The add-touch form; true when the form was this one. */
export function marketingSubmit(f) {
  if (f.id === "mk-campaign") { startCampaign(); return true; }
  if (f.id !== "mk-touch" || !S.mk.detail) return false;
  send(touchRequest(S.mk.detail, { kind: $("#mk-tk-kind").value, game: $("#mk-tk-game").value, date: $("#mk-tk-date").value }, today()));
  return true;
}
