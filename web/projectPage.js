// The project page: header, three cards and the Waiting on you list, read from the board data alone.

import { S, esc, keyOf, proj } from "./state.js";
import { whoChip } from "./chips.js";

const isOpen = t => t.state !== "done" && t.state !== "archived";
const IN_PLAY = /^check in play/i;

/** The designer's open tasks of a project that no open task blocks. */
export function waiting(project, data = S.data) {
  const open = data.tasks.filter(t => t.project === project && isOpen(t));
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

/** The page for project `p`. */
export function projectPage(p, data = S.data) {
  return `<div class="epic-page project-page"><div class="pp-head"><span class="mono muted">PROJECT · ${esc(p.id)}${p.kind ? ` · ${esc(p.kind)}` : ""}</span>
    <button class="fsz" data-settings="${esc(p.id)}" style="text-transform:none">Settings</button></div>
    <h1>${esc(p.name)}</h1>${cards(p, data)}${waitingList(p, data)}</div>`;
}

/** The project the Detail column shows a page for, or null: the one clicked, else the one selected in the top bar. */
export const pageProject = () => {
  const id = S.projectPage || (S.project !== "all" ? S.project : null);
  return id ? proj(id) : null;
};
