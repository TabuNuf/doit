// The project page: header, three cards and the Waiting on you list, read from the board data alone.

import { S, esc, keyOf, proj, api, redraw } from "./state.js";
import { whoChip } from "./chips.js";

const isOpen = t => t.state !== "done" && t.state !== "archived";
const IN_PLAY = /^check in play/i;

/** The designer's open tasks of a project that no open task blocks. */
export function waiting(project, data = S.data) {
  const open = data.tasks.filter(t => t.project === project && isOpen(t) && !t.hidden);
  return open.filter(t => t.owner === "human" && !open.some(b => b.blocks === t.id));
}

/** The Active epic that takes the first card; one whose only open task is Check in play does not. */
function activeEpic(project, data) {
  return data.epics.find(e => {
    if (e.project !== project || e.status !== "Active") return false;
    const open = data.tasks.filter(t => t.project === project && t.epic === e.id && isOpen(t));
    return !(open.length && open.every(t => IN_PLAY.test(t.title)));
  });
}

function cards(p, data) {
  const e = activeEpic(p.id, data), w = waiting(p.id, data);
  const planned = data.epics.filter(x => x.project === p.id && x.status === "Planned").length;
  const parked = (data.parkedEpics || []).filter(x => x.project === p.id).length;
  const epicsOfWaiting = new Set(w.map(t => t.epic)).size;
  const active = e
    ? `<button class="pcard link" data-open-epic="${esc(`${p.id}/${e.id}`)}"><span class="pc-l">Active epic</span><b>${esc(e.name)}</b><span class="mono muted">${esc(e.id)} · ${e.done} of ${e.total} done</span></button>`
    : `<div class="pcard"><span class="pc-l">Active epic</span><b>None active</b></div>`;
  return `<div class="pcards">${active}
    <div class="pcard you"><span class="pc-l">Waiting on you</span><b>${w.length}</b><span>${w.length === 1 ? "task" : "tasks"} in ${epicsOfWaiting} ${epicsOfWaiting === 1 ? "epic" : "epics"}</span></div>
    <div class="pcard"><span class="pc-l">Planned next</span><b>${planned}</b><span>${planned === 1 ? "epic" : "epics"} · ${parked} parked</span></div></div>`;
}

function waitingList(p, data) {
  const w = waiting(p.id, data);
  const rows = w.map(t => `<button class="pp-row" data-id="${esc(keyOf(t))}"><span class="mono muted">${esc(t.id)}</span><b>${esc(t.title)}</b>${whoChip("human")}</button>`).join("");
  return `<div class="ep-sec"><h2>Waiting on you</h2>${rows || `<div class="muted">Nothing waits on you.</div>`}</div>`;
}

/** The first file in a docs tree whose path satisfies `pred`, or null. */
export function findDoc(tree, pred) {
  for (const n of tree || []) {
    const hit = n.type === "file" ? (pred(n) ? n : null) : findDoc(n.children, pred);
    if (hit) return hit;
  }
  return null;
}

const designPath = tree => (findDoc(tree, n => n.path === "Design/GameDesign.md") || findDoc(tree, n => n.path === "Design/Design.md") || {}).path;

/** The first In short line and the Now testing line of a design doc's text. */
export function parseShort(text) {
  const line = key => (new RegExp(`^\\s*\\**${key}:\\**\\s*(.+)$`, "mi").exec(text || "") || [])[1]?.replace(/\*+/g, "").trim() || "";
  return { inShort: line("In short"), nowTesting: line("Now testing") };
}

/** Reads the project's tree and design doc for the page, then redraws. */
export async function loadProjectPage(id) {
  try {
    const tree = await api("GET", `/api/docs/tree?project=${encodeURIComponent(id)}`);
    S.docs.trees[id] = tree;
    const path = designPath(tree);
    const doc = path ? await api("GET", `/api/docs/file?project=${encodeURIComponent(id)}&path=${encodeURIComponent(path)}`) : null;
    (S.pp ||= {})[id] = parseShort(doc && doc.text);
  } catch { /* the page shows what it has */ }
  redraw();
}

function shortBlock(p) {
  const s = (S.pp || {})[p.id];
  if (!s) return "";
  if (!s.inShort) return `<div class="ep-short"><p class="ep-lead muted">No In short line yet. Write "In short: ..." in the project's design doc.</p></div>`;
  return `<div class="ep-short"><p class="ep-lead">${esc(s.inShort)}</p>${s.nowTesting ? `<p class="ep-why"><b>Now testing</b> ${esc(s.nowTesting)}</p>` : ""}</div>`;
}

const num = e => Number(e.id.replace(/\D/g, ""));

/** Open epics in build order: Active first, then by number with each epic after the one its Order line names, epics without tasks last. */
export function buildOrder(project, data = S.data) {
  const all = data.epics.filter(e => e.project === project).sort((a, b) => (b.status === "Active") - (a.status === "Active") || num(a) - num(b));
  const ids = new Set(all.map(e => e.id));
  const moved = all.filter(e => e.after && e.after !== e.id && ids.has(e.after) && e.status !== "Active");
  const out = all.filter(e => !moved.includes(e));
  for (const e of moved) {
    let at = out.findIndex(x => x.id === e.after);
    if (at < 0) { out.push(e); continue; }
    while (out[at + 1] && out[at + 1].after === e.after) at++;
    out.splice(at + 1, 0, e);
  }
  return [...out.filter(e => e.total > 0), ...out.filter(e => !(e.total > 0))];
}

function epicRows(p, data) {
  const rows = buildOrder(p.id, data).map(e => {
    const pct = e.total ? Math.round(e.done / e.total * 100) : 0;
    const prog = e.total ? `<span class="bar"><i style="width:${pct}%;background:var(--select)"></i></span><span class="mono muted">${e.done}/${e.total}</span>` : `<span class="muted">no tasks</span>`;
    return `<button class="pp-row" data-open-epic="${esc(`${p.id}/${e.id}`)}"><span class="mono muted">${esc(e.id)}</span><b>${esc(e.name)}</b><span class="chip status">${esc(e.status)}</span>${prog}</button>`;
  }).join("");
  return `<div class="ep-sec"><h2>Epics</h2>${rows || `<div class="muted">No open epics.</div>`}</div>`;
}

function parkedRow(p, data) {
  const parked = (data.parkedEpics || []).filter(x => x.project === p.id);
  if (!parked.length) return "";
  const open = !!(S.ppParkedOpen || {})[p.id];
  const head = `<button class="pp-row" data-pp-parked="${esc(p.id)}" aria-expanded="${open}"><span>${open ? "▾" : "▸"}</span><b>Parked</b><span class="muted">${open ? `${parked.length} epics` : esc(parked.map(x => x.name).join(", "))}</span></button>`;
  const rows = open ? parked.map(x => `<button class="pp-row sub" data-open-epic="${esc(`${p.id}/${x.id}`)}"><span class="mono muted">${esc(x.id)}</span><b>${esc(x.name)}</b></button>`).join("") : "";
  return `<div class="ep-sec">${head}${rows}</div>`;
}

const DOC_LINKS = ["Architecture.md", "Playtest.md", "UIRules.md"];

/** One button per standard document the project has, opening it in the Docs view. */
function docLinks(p) {
  const tree = S.docs.trees[p.id];
  const dp = designPath(tree);
  const files = [dp && findDoc(tree, n => n.path === dp), ...DOC_LINKS.map(f => findDoc(tree, n => n.name === f))].filter(Boolean);
  if (!files.length) return "";
  return `<div class="ep-sec"><h2>Documents</h2><div class="pp-docs">${files.map(f => `<button class="fsz" data-doc="${esc(f.path)}" data-doc-project="${esc(p.id)}" style="text-transform:none">${esc(f.name)}</button>`).join("")}</div></div>`;
}

/** The page for project `p`. */
export function projectPage(p, data = S.data) {
  return `<div class="epic-page project-page"><div class="pp-head"><span class="mono muted">PROJECT · ${esc(p.id)}${p.kind ? ` · ${esc(p.kind)}` : ""}</span>
    <button class="fsz" data-settings="${esc(p.id)}" style="text-transform:none">Settings</button></div>
    <h1>${esc(p.name)}</h1>${shortBlock(p)}${cards(p, data)}${waitingList(p, data)}${epicRows(p, data)}${parkedRow(p, data)}${docLinks(p)}</div>`;
}

/** The project the Detail column shows a page for, or null: the one clicked, else the one selected in the top bar. */
export const pageProject = () => {
  const id = S.projectPage || (S.project !== "all" ? S.project : null);
  return id ? proj(id) : null;
};
