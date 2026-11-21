// The Drafts pane of the Marketing view: each draft as the mail will look, with approve-and-send and discard.
// Pure functions: HTML from the drafts, and the requests an edit sends. marketingView.js sends them.

import { esc, fmtDate } from "./state.js";

const EDITABLE = ["draft", "failed"];

/** The status line: the account and today's count against the cap, or that mail is not set up. */
export function statusLine(s) {
  if (!s) return "Checking the mail account…";
  return s.ready ? `${esc(s.address)} · ${s.sentToday} of ${s.cap} sent today` : "Mail is not set up";
}

/** What the draft's state needs the reader to know. */
function note(d) {
  if (d.state === "sent") return `<div class="added">Sent ${esc(fmtDate(d.sentAt))} ${esc(d.sentAt.slice(11, 16))} · ${d.labeled ? "labeled Marketing" : "not yet labeled Marketing"}</div>`;
  if (d.state === "failed") return `<div class="warnline">Not sent: ${esc(d.error)}</div>`;
  if (d.state === "approved") return `<div class="warnline">Approved, waits for the daily cap.</div>`;
  return "";
}

export function draftCard(d) {
  const edit = EDITABLE.includes(d.state);
  const subject = edit ? `<input id="mk-dr-subject-${esc(d.id)}" value="${esc(d.subject)}" aria-label="Subject">` : `<div>${esc(d.subject)}</div>`;
  const body = edit ? `<textarea id="mk-dr-body-${esc(d.id)}" class="desc-in" aria-label="Body">${esc(d.body)}</textarea>` : `<div class="mk-mail">${esc(d.body)}</div>`;
  const buttons = d.state === "sent" ? "" : `<div class="mk-actions"><button data-mk-send="${esc(d.id)}">${d.state === "approved" ? "Send now" : "Approve and send"}</button><button data-mk-discard="${esc(d.id)}">Discard</button></div>`;
  return `<article class="mk-draft" aria-label="Draft ${esc(d.id)}">
    <div class="mono muted">${esc(d.state)} · ${esc(d.game)}</div>
    <dl class="kv"><dt>To</dt><dd>${esc(d.contactName)} &lt;${esc(d.to)}&gt;</dd><dt>Subject</dt><dd>${subject}</dd></dl>
    ${body}${note(d)}${buttons}</article>`;
}

/** The pane: a switch back to the contacts, the status line, the sweep result and the drafts. */
export function draftsPane(drafts, status, sweepLine) {
  const body = !drafts ? `<div class="empty">Loading…</div>` : drafts.length ? drafts.map(draftCard).join("") : `<div class="empty">No drafts yet. Claude writes mail drafts here for you to read, approve and send; none are waiting.</div>`;
  return `<section class="pane" aria-label="Drafts"><div class="pane-h">Drafts<span class="c">${drafts ? drafts.length : ""}</span><button data-mk-pane="contacts" class="pane-close">Contacts</button></div>
    <div class="pane-b"><div class="muted mk-status">${statusLine(status)}</div>${sweepLine ? `<div class="muted mk-status">${esc(sweepLine)}</div>` : ""}${body}</div></section>`;
}

/** The request an edited subject or body sends, or null when it holds nothing new. `el` is {id, value}. */
export function draftEditRequest(el, drafts) {
  const m = /^mk-dr-(subject|body)-(\d+)$/.exec(el.id);
  const d = m && (drafts ?? []).find(x => String(x.id) === m[2]);
  if (!d || el.value === d[m[1]]) return null;
  return { method: "PATCH", path: `/api/drafts/${d.id}`, body: { [m[1]]: el.value } };
}

/** The question the browser asks before a mail goes out. */
export const sendQuestion = d => `Send "${d.subject}" to ${d.contactName} <${d.to}>?`;

/** The one line a sweep leaves in the pane; none when it was skipped, since the status line already says why. */
export function sweepSummary(r) {
  if (r.skipped) return "";
  if (!r.ok) return `Sweep failed: ${r.error}`;
  return `Sweep: ${r.replies.length} ${r.replies.length === 1 ? "reply" : "replies"} filed, ${r.labeled} sent ${r.labeled === 1 ? "mail" : "mails"} labeled`;
}
