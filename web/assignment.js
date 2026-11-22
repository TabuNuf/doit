// Agent, model and effort rows of the task detail pane: only for a task Claude does. Pure HTML.

import { esc } from "./state.js";

const MODELS = ["Haiku 5.5", "Sonnet 5.5", "Opus 5.5", "Fable 5.2"];
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

export function assignmentRows(t) {
  if (t.owner !== "ai") return "";
  const eff = [["", "-"], ...EFFORTS.map(e => [e, e])].map(([v, l]) => `<option value="${v}" ${(t.effort || "") === v ? "selected" : ""}>${l}</option>`).join("");
  return `<dt>Agent</dt><dd><input type="text" id="ag" value="${esc(t.agent || "")}" aria-label="Agent that does the task" placeholder="batch-builder"></dd>
      <dt>Model</dt><dd><input type="text" id="mdl" list="mdl-list" value="${esc(t.model || "")}" aria-label="Model the task runs on"><datalist id="mdl-list">${MODELS.map(m => `<option value="${m}">`).join("")}</datalist></dd>
      <dt>Effort</dt><dd><select id="eff" aria-label="Effort">${eff}</select></dd>`;
}
