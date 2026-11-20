// Reordering: drag and drop and Alt + arrow keys. Works out where a task lands.

import { secOf, keyOf, task, visible, act, api, toast, sectionLists } from "./state.js";

const move = (t, body) => act(() => api("POST", `/api/tasks/${t.project}/${t.id}/move`, body));

/** Moves a task into a section, before another task (or to the top when beforeKey is null). */
function place(key, sec, beforeKey) {
  const t = task(key);
  if (beforeKey && task(beforeKey).project !== t.project) return toast("Drop a task next to one of its own project");
  move(t, beforeKey ? { section: sec, before: beforeKey } : { section: sec });
}

/** Alt + arrow: the next visible task of the same project is the neighbour to pass. */
export function nudge(key, dir) {
  const t = task(key);
  const sec = secOf(t.state);
  const list = sectionLists(visible())[sec].filter(x => x.project === t.project);
  const j = list.findIndex(x => keyOf(x) === key) + dir;
  if (j < 0 || j >= list.length) return;
  move(t, { section: sec, [dir < 0 ? "before" : "after"]: keyOf(list[j]) });
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
