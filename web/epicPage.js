// The epic page: status, progress and counts, the In short block and the facts grid, from the epic's text and tasks.

import { esc } from "./state.js";
import { renderMarkdown } from "./markdown.js";
import { parseEpicDoc } from "./epicDoc.js";
import { whoChip } from "./chips.js";

const isOpen = t => t.state !== "done" && t.state !== "archived";
const num = t => t.id.split(".")[1];

/** The epic's tasks among `tasks`, by the epic's number in their ids. */
const mine = (e, tasks) => (tasks || []).filter(t => t.project === e.project && t.id.startsWith(`T-${e.id.slice(5)}.`));

/** "after .n" for a designer task an open task of the epic blocks, else "". */
const afterOf = (t, open) => { const b = open.find(x => x.blocks === t.id); return b ? ` after .${num(b)}` : ""; };

/** A fact's value with each epic id turned into a button that opens that epic. */
const factValue = (e, v) => esc(v).replace(/EPIC-\d+/g, id => `<button class="link" data-open-epic="${esc(e.project)}/${id}">${id}</button>`);

function header(e, d, tasks) {
  const open = tasks.filter(isOpen), done = tasks.length - open.length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const you = open.filter(t => t.owner === "human"), ai = open.filter(t => t.owner !== "human");
  const after = you.map(t => afterOf(t, open)).find(Boolean) || "";
  const status = d.status || e.status;
  return `<div class="ep-head"><span class="chip status">${esc(status)}</span>
    <span class="ep-prog"><span class="bar"><i style="width:${pct}%;background:var(--select)"></i></span><span>${done} of ${tasks.length} tasks done</span></span>
    ${ai.length ? `<span class="ep-count">${whoChip("ai", `${ai.length} for Claude`)}</span>` : ""}
    ${you.length ? `<span class="ep-count">${whoChip("human", `${you.length} for you${after}`)}</span>` : ""}</div>
    ${d.statusRest ? `<p class="ep-rest">${esc(d.statusRest)}</p>` : ""}`;
}

function inShort(d) {
  if (!d.inShort && !d.why) return "";
  return `<div class="ep-short">${d.inShort ? `<p class="ep-lead" data-key="${esc(d.inShortKey)}">${esc(d.inShort)}</p>` : ""}${d.why ? `<p class="ep-why"><b>Why it exists</b> ${esc(d.why)}</p>` : ""}</div>`;
}

function grid(e, d) {
  const rows = d.facts.filter(f => f.value);
  if (!rows.length) return "";
  return `<dl class="ep-facts">${rows.map(f => `<dt>${esc(f.key)}</dt><dd>${factValue(e, f.value)}</dd>`).join("")}</dl>`;
}

/** The page for an open epic `e` (with its `text`), given the loaded tasks. Parts with no text are left out. */
export function epicPage(e, allTasks) {
  const d = parseEpicDoc(e.text);
  const rest = [...d.loose, ...d.sections.map(s => `## ${s.heading}\n\n${s.body}`)].filter(Boolean).join("\n\n");
  return `<div class="epic-page">${d.name ? `<h1>${esc(d.name)}</h1>` : ""}${header(e, d, mine(e, allTasks))}${inShort(d)}${grid(e, d)}${rest ? `<div class="doc">${renderMarkdown(rest)}</div>` : ""}</div>`;
}
