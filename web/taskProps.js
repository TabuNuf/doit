// The task page's properties box: every value a control, the same for both owners.

import { STATES, esc, daysLeft } from "./state.js";
import { assignmentRows } from "./assignment.js";
import { contactButton } from "./contactNames.js";

const seg = (attr, cur, pairs) => `<div class="seg">${pairs.map(([v, l]) => `<button aria-pressed="${cur === v}" data-${attr}="${v}">${l}</button>`).join("")}</div>`;

export function taskProps(t) {
  const dl = t.deadline ? daysLeft(t.deadline) : null;
  return `<div class="props">
    <p class="props-head">Change any value here. Claude changes the same fields with <code>doit set ${esc(t.project)}/${esc(t.id)} key=value</code>.</p>
    <dl class="kv">
      <dt>State</dt><dd><select id="st" aria-label="State">${STATES.map(([v, l]) => `<option value="${v}" ${t.state === v ? "selected" : ""}>${l}</option>`).join("")}</select></dd>
      <dt>Owner</dt><dd>${seg("own", t.owner, [["human", "🧑 Me"], ["ai", "🤖 Claude"]])}</dd>
      <dt>Type</dt><dd>${seg("type", t.type, [["task", "Task"], ["bug", "Bug"]])}</dd>
      ${assignmentRows(t)}
      <dt>Deadline</dt><dd><input type="date" id="dl" value="${esc(t.deadline || "")}" aria-label="Deadline"> <label class="toggle"><input type="checkbox" id="dlon" ${t.deadline ? "checked" : ""}> Archive when passed</label>
        ${t.deadline ? `<span class="muted">${dl < 0 ? "passed" : dl + " days left"}</span>` : ""}</dd>
      <dt>Blocks</dt><dd><input id="blk" value="${esc(t.blocks || "")}" placeholder="T-014.3" pattern="T-\\d+\\.\\d+" size="10" aria-label="The task this one holds up"> <span class="muted">the task this holds up</span></dd>
      <dt>Created</dt><dd class="mono">${t.created || "-"} <span class="muted">set by the board</span></dd>
      <dt>Updated</dt><dd class="mono">${t.updated || "-"} <span class="muted">set by the board</span></dd>
      ${t.contact ? `<dt>Contact</dt><dd>${contactButton(t.contact)}</dd>` : ""}
      ${t.completed ? `<dt>Completed</dt><dd class="mono">${t.completed}</dd>` : ""}
      ${t.source ? `<dt>Source</dt><dd>${esc(t.source)}</dd>` : ""}
      ${t.state === "archived" && t.archived ? `<dt>Archived</dt><dd class="warnline">${esc(t.archived)}</dd>` : ""}
    </dl>
  </div>`;
}
