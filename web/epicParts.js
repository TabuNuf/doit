// The epic page's lists: findings, the tasks table, the test plan and the folded end sections.
// Each takes `open`, the map of opened rows (S.epicOpen), and `scope`, the epic's key prefix.
// The tasks table also reads the saved column choice and the open dropdown (S.colMenu).

import { S, esc } from "./state.js";
import { visibleColumns, cornerButton, columnMenu } from "./columnPicker.js";
import { renderMarkdown } from "./markdown.js";
import { whoChip } from "./chips.js";

const md = text => (text ? `<div class="doc">${renderMarkdown(text)}</div>` : "");
const fold = (scope, id, open, head, body) => {
  const on = Boolean(open[`${scope}:${id}`]);
  return `<div class="ep-fold${on ? " open" : ""}"><button class="ep-foldrow" data-epic-open="${esc(`${scope}:${id}`)}" aria-expanded="${on}">${head}</button>${on ? `<div class="ep-foldbody">${body}</div>` : ""}</div>`;
};

const stateChip = s => (s ? `<span class="chip ${s === "Decided" ? "decided" : "proposed"}">${s}</span>` : "");
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** Findings under "What changes": a count line, then one folded row each. */
export function findingsBlock(scope, parts, open) {
  const f = parts.filter(p => p.kind === "finding");
  const count = [plural(f.length, "finding")];
  for (const s of ["Decided", "Proposed"]) { const n = f.filter(x => x.state === s).length; if (n) count.push(`${n} ${s.toLowerCase()}`); }
  const rows = parts.map(p => {
    if (p.kind !== "finding") return md(p.text);
    const head = `<span class="ep-n">${esc(p.n)}</span>${p.tag ? `<span class="ep-tag">${esc(p.tag)}</span>` : ""}<b>${esc(p.title)}</b>${stateChip(p.state)}`;
    const body = p.detail ? `<dl class="ep-detail">${p.detail.map(d => `<dt>${esc(d.label)}</dt><dd>${esc(d.text)}</dd>`).join("")}</dl>` : md(p.body);
    return fold(scope, `f${p.n}`, open, head, body);
  }).join("");
  return `<section class="ep-sec"><h2>What changes</h2><p class="ep-count-line">${count.join(" · ")}</p>${rows}</section>`;
}

const num = t => Number(t.id.split(".")[1]);

export const TASK_COLS = [{ id: "task", label: "Task", width: "auto" }, { id: "title", label: "Title", width: "auto" }, { id: "who", label: "Who", width: "auto" }, { id: "model", label: "Model and effort", width: "auto" }];

/** The tasks as a table; a row selects its task. `afterOf(t)` gives " after .n" or "". The last, unnamed column (the human's wait) is always shown and not in the picker. */
export function tasksTable(tasks, afterOf) {
  if (!tasks.length) return "";
  const cols = new Set(visibleColumns("epic-tasks", TASK_COLS).map(c => c.id));
  const rows = [...tasks].sort((a, b) => num(a) - num(b)).map(t => {
    const done = t.state === "done" || t.state === "archived";
    const last = t.owner === "human" ? (done ? esc(t.completed || "done") : esc(afterOf(t).trim())) : "";
    const td = { task: `<td class="mono">${esc(t.id)}</td>`, title: `<td>${esc(t.title)}</td>`, who: `<td>${whoChip(t.owner === "human" ? "human" : "ai")}</td>`, model: `<td>${esc([t.model, t.effort].filter(Boolean).join(" · "))}</td>` };
    return `<tr class="ep-trow${done ? " muted" : ""}" data-id="${esc(`${t.project}/${t.id}`)}">${TASK_COLS.filter(c => cols.has(c.id)).map(c => td[c.id]).join("")}<td>${last}</td></tr>`;
  }).join("");
  const th = TASK_COLS.filter(c => cols.has(c.id)).map((c, i) => `<th${i === 0 ? ' class="col-first"' : ""}>${i === 0 ? cornerButton("epic-tasks") : ""}${c.label}${i === 0 && S.colMenu === "epic-tasks" ? columnMenu("epic-tasks", TASK_COLS) : ""}</th>`).join("");
  return `<section class="ep-sec"><h2>Tasks</h2><table class="ep-tasks"><thead><tr data-col-head="epic-tasks">${th}<th></th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

const BATCH = /^[-*][ \t]+(Batch [A-Z\d]+):[ \t]*(T-\d+\.\d+(?:[ \t]+to[ \t]+\.\d+)?)[ \t]*(?:\((.*?)\))?[ \t]*:?[ \t]*(.*)$/;
const EXTRA = /^[-*][ \t]+(Performance|Close):[ \t]*(.*)$/;

/** The test plan: batch lines as a grid, Performance and Close lines under it, anything else as markdown in place. */
export function testPlan(body) {
  const out = [];
  let grid = [], extra = [], loose = [];
  const flush = () => {
    if (loose.length) out.push(md(loose.join("\n").trim())); loose = [];
  };
  for (const row of body.split("\n")) {
    const b = BATCH.exec(row), x = EXTRA.exec(row);
    if (b) { flush(); grid.push(`<tr><td><b>${esc(b[1])}</b></td><td class="mono">${esc(b[2])}</td><td>${esc(b[3] || "")}${b[4] ? ` <span class="ep-tier">${esc(b[4])}</span>` : ""}</td></tr>`); }
    else if (x) { flush(); extra.push(`<tr><td><b>${x[1]}</b></td><td colspan="2">${esc(x[2])}</td></tr>`); }
    else loose.push(row);
  }
  flush();
  const table = grid.length || extra.length ? `<table class="ep-plan"><tbody>${grid.join("")}${extra.join("")}</tbody></table>` : "";
  // Prose goes above the grid, as written; list lines that match nothing stay where they were met.
  return `<section class="ep-sec"><h2>Test plan</h2>${out.join("")}${table}</section>`;
}

const EMPTY = { "Notes": [/^Decisions and deviations, newest first\.?$/i, "none yet"], "Close audit": [/^Filled when the epic closes\.?$/i, "filled at close"], "For the standard": [/^Filled when the epic closes\.?$/i, "filled at close"] };

/** Notes, Close audit and For the standard as one folded row each, with a note while empty. */
export function endSection(scope, heading, body, open) {
  const [placeholder, note] = EMPTY[heading];
  const empty = !body.trim() || placeholder.test(body.trim());
  const head = `<b>${esc(heading)}</b>${empty ? `<span class="ep-note">${note}</span>` : ""}`;
  return empty ? `<div class="ep-fold"><span class="ep-foldrow static">${head}</span></div>` : fold(scope, heading, open, head, md(body));
}

export const isEndSection = h => Object.hasOwn(EMPTY, h);
export { md };
