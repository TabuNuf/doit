// Reordering: drag and drop and Alt + arrow keys. Works out where a task lands.

import { S, secOf, keyOf, task, visible, patch, sectionLists } from "./state.js";

const between = (above, below) => above == null && below == null ? 1000 : above == null ? below - 1000 : below == null ? above + 1000 : (above + below) / 2;

/** Moves a task into a section, before another task (or to the top when beforeKey is null). */
function place(key, sec, beforeKey) {
  const t = task(key);
  const list = sectionLists(visible())[sec].filter(x => keyOf(x) !== key);
  let i = beforeKey ? list.findIndex(x => keyOf(x) === beforeKey) : 0;
  if (i < 0) i = list.length;
  const rank = between(list[i - 1]?.rank, list[i]?.rank);
  const changes = { rank };
  if (secOf(t.state) !== sec) changes.state = sec === "backlog" ? "backlog" : "todo";
  patch(t, changes);
}

export function nudge(key, dir) {
  const t = task(key);
  const sec = secOf(t.state);
  const list = sectionLists(visible())[sec];
  const i = list.findIndex(x => keyOf(x) === key);
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  const rest = list.filter(x => keyOf(x) !== key);
  // Index j in the list without the task is where it lands, either direction.
  patch(t, { rank: between(rest[j - 1]?.rank, rest[j]?.rank) });
}

export let dragKey = null;
export function bindDrag() {
  document.querySelectorAll('.row[draggable="true"]').forEach(r => {
    r.addEventListener("dragstart", ev => { dragKey = r.dataset.id; r.classList.add("dragging"); ev.dataTransfer.effectAllowed = "move"; });
    r.addEventListener("dragend", () => { r.classList.remove("dragging"); dragKey = null; });
  });
  document.querySelectorAll('.row[draggable="true"], .sec-h[data-drop]').forEach(r => {
    r.addEventListener("dragover", ev => { if (dragKey) { ev.preventDefault(); r.classList.add("over"); } });
    r.addEventListener("dragleave", () => r.classList.remove("over"));
    r.addEventListener("drop", ev => {
      ev.preventDefault(); r.classList.remove("over");
      const k = dragKey; dragKey = null;
      if (!k || k === r.dataset.id) return;
      if (r.dataset.drop) place(k, r.dataset.drop, null);
      else place(k, r.dataset.sec, r.dataset.id);
    });
  });
}
