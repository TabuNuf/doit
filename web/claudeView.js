// The Claude view: Working on now, Waiting on you (blocked, then due) with Up next below it, and the activity log.
// Everything comes from GET /api/claude; a card opens its task on the Board.

import { S, esc, api, redraw, toast, proj, color, today, daysLeft, openOnBoard } from "./state.js";

/** Loads the panes for the selected project. */
export async function refreshClaude() {
  try {
    S.claude = await api("GET", `/api/claude?project=${encodeURIComponent(S.project)}`);
    redraw();
  } catch (e) { toast(e.message); }
}

/** Handles a click on a Claude view control; true when the click was one. */
export function claudeClick(d) {
  if (!d.goto) return false;
  openOnBoard(d.goto);
  return true;
}

/** "HH:MM" today, "20 Nov HH:MM" on other days. */
function when(at) {
  if (!at) return "";
  if (at.slice(0, 10) === today()) return at.slice(11);
  return new Date(at.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + at.slice(11);
}

/** Why a Waiting-on-you card is listed: how soon it is due, or what it blocks. */
export function whyListed(c, section) {
  if (section === "blocked") return `blocks ${c.blocks}`;
  const n = daysLeft(c.deadline);
  return n < 0 ? `overdue by ${-n} ${n === -1 ? "day" : "days"}` : n === 0 ? "due today" : `due in ${n} ${n === 1 ? "day" : "days"}`;
}

function card(c, section) {
  const key = `${c.project}/${c.id}`;
  const due = c.deadline ? `<div class="mono muted card-note">due ${esc(c.deadline)}</div>` : "";
  const blocks = c.blocks ? `<div class="mono muted card-note">blocks ${esc(c.blocks)}</div>` : "";
  const waiting = section === "blocked" || section === "due";
  const why = waiting ? `<div class="card-why"><b>Why:</b> ${esc(whyListed(c, section))}</div>` : "";
  const todo = waiting && c.action ? `<div class="card-todo"><b>To do:</b> ${esc(c.action)}</div>` : "";
  const last = c.last.at ? `<div class="mono muted card-note">${esc(when(c.last.at))}${c.last.what ? " · " + esc(c.last.what) : ""}</div>` : "";
  return `<button class="card claude-card" data-goto="${esc(key)}" title="Open on the Board">
    <span class="h"><span class="mono muted">${esc(c.id)}</span><span class="pill"><span class="dot" style="background:${color(c.project)}"></span>${esc(proj(c.project).name)}</span></span>
    <span class="card-title">${esc(c.title)}</span>${why}${todo}${waiting ? "" : blocks}${due}${last}</button>`;
}

const list = (cards, none, section) => cards.map(c => card(c, section)).join("") || `<div class="empty">${none}</div>`;

function logHtml(log) {
  if (!log.length) return `<div class="empty">Nothing changed in the last 30 days.</div>`;
  return `<ul class="log mono">${log.map(e => `<li><span class="muted">${esc(when(e.at))}</span> · ${esc(e.ref)} · ${esc(e.what)}</li>`).join("")}</ul>`;
}

/** The three panes. */
export function claudePanes() {
  const c = S.claude;
  if (!c) return `<section class="pane"><div class="pane-b"><div class="empty">Loading…</div></div></section>`;
  const due = c.due || [];
  return `<section class="pane" aria-label="Working on now"><div class="pane-h">Working on now<span class="c">${c.working.length}</span></div><div class="pane-b">${list(c.working, "Idle: no AI task is In progress.")}</div></section>
    <section class="pane" aria-label="Waiting on you"><div class="pane-h">Waiting on you<span class="c">${c.blocked.length + due.length}</span></div><div class="pane-b">
      <div class="sub-h claude-sub">Blocked on you<span class="c">${c.blocked.length}</span></div>${list(c.blocked, "No task of yours holds Claude up.", "blocked")}
      <div class="sub-h claude-sub">Due within 7 days<span class="c">${due.length}</span></div>${list(due, "Nothing of yours is due within 7 days.", "due")}
      <div class="sub-h claude-sub">Up next for Claude<span class="c">${c.upNext.length}</span></div>${list(c.upNext, "No AI task is To-do.")}</div></section>
    <section class="pane" aria-label="Activity log"><div class="pane-h">Activity log</div><div class="pane-b">${logHtml(c.log)}</div></section>`;
}
