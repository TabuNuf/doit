// The left pane's epic buttons: open epics, and per project the Closed and Archived sections.

import { S, esc } from "./state.js";

export function epicBtn(e) {
  const key = `${e.project}/${e.id}`;
  const pct = e.total ? Math.round(e.done / e.total * 100) : 0;
  return `<button class="epic" aria-pressed="${S.epic === key}" data-open-epic="${esc(key)}" title="Show this epic and its tasks">
    <div class="t"><span>${esc(e.name)}</span><span class="n">${e.done}/${e.total}</span></div>
    <div class="t"><span class="n">${e.id}</span><span class="estate">${esc(e.status)}</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div></button>`;
}

/** Closed epics (newest first), then Archived ones folded until their header is clicked. */
export function closedSections(project) {
  const mine = (S.data.closedEpics || []).filter(e => e.project === project);
  const closed = mine.filter(e => !e.archived), archived = mine.filter(e => e.archived);
  const open = !!S.archivedOpen[project];
  return (closed.length ? `<div class="sub-h">Closed<span class="c">${closed.length}</span></div>${closed.map(epicBtn).join("")}` : "")
    + (archived.length ? `<button class="sub-h fold" data-toggle-archived="${esc(project)}" aria-expanded="${open}">${open ? "\u25be" : "\u25b8"} Archived<span class="c">${archived.length}</span></button>${open ? archived.map(epicBtn).join("") : ""}` : "");
}
