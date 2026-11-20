// The left pane's epic buttons: open epics, and per project the Parked, Completed and Archived sections.

import { S, esc } from "./state.js";

export function epicBtn(e) {
  const key = `${e.project}/${e.id}`;
  const pct = e.total ? Math.round(e.done / e.total * 100) : 0;
  return `<button class="epic" draggable="true" data-epic-key="${esc(key)}" aria-pressed="${S.epic === key}" data-open-epic="${esc(key)}" title="Show this epic and its tasks">
    <div class="t"><span>${esc(e.name)}</span><span class="n">${e.done}/${e.total}</span></div>
    <div class="t"><span class="n">${e.id}</span><span class="estate">${esc(e.status)}</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div></button>`;
}

export const SECTIONS = [["parked", "Parked"], ["completed", "Completed"], ["archived", "Archived"]];
const foldKey = (project, sec) => `${project}/${sec}`;
export const isFolded = (project, sec) => !S.epicFold[foldKey(project, sec)];
export const toggleFold = (project, sec, on) => { S.epicFold[foldKey(project, sec)] = on ?? !S.epicFold[foldKey(project, sec)]; };

/** Parked, Completed and Archived epics of a project: every header shown, every body folded until clicked. */
export function epicSections(project) {
  const mine = list => (list || []).filter(e => e.project === project);
  const closed = mine(S.data.closedEpics);
  const lists = { parked: mine(S.data.parkedEpics), completed: closed.filter(e => !e.archived), archived: closed.filter(e => e.archived) };
  return SECTIONS.map(([sec, label]) => {
    const folded = isFolded(project, sec);
    return `<button class="sub-h fold" data-epic-fold="${sec}" data-epic-fold-p="${esc(project)}" data-drop-epic="${sec}" data-project="${esc(project)}" aria-expanded="${!folded}">${folded ? "\u25b8" : "\u25be"} ${label}<span class="c">${lists[sec].length}</span></button>`
      + `<div class="sec-body"${folded ? " hidden" : ""}>${lists[sec].map(epicBtn).join("")}</div>`;
  }).join("");
}
