// Agent, model and effort rows of the task detail pane: live for a task Claude does, greyed for the designer's. Pure HTML.

import { esc } from "./state.js";

const MODELS = ["Haiku 5.5", "Sonnet 5.5", "Opus 5.5", "Fable 5.2"];
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

export function assignmentRows(t) {
  const off = t.owner === "ai" ? "" : " disabled";
  const cls = t.owner === "ai" ? "" : ' class="off"';
  const hint = t.owner === "ai" ? "" : ' <span class="muted">used when Claude owns it</span>';
  const eff = [["", "-"], ...EFFORTS.map(e => [e, e])].map(([v, l]) => `<option value="${v}" ${(t.effort || "") === v ? "selected" : ""}>${l}</option>`).join("");
  return `<dt${cls}>Agent</dt><dd><input type="text" id="ag" value="${esc(t.agent || "")}" aria-label="Agent that does the task" placeholder="${off ? "used when Claude owns it" : "batch-builder"}"${off}></dd>
      <dt${cls}>Model</dt><dd><input type="text" id="mdl" list="mdl-list" value="${esc(t.model || "")}" aria-label="Model the task runs on"${off}><datalist id="mdl-list">${MODELS.map(m => `<option value="${m}">`).join("")}</datalist></dd>
      <dt${cls}>Effort</dt><dd><select id="eff" aria-label="Effort"${off}>${eff}</select>${hint}</dd>`;
}
