// Moving an epic between Open, Parked, Completed and Archived by dragging its button onto a section header or the open list.

import { S, api, act } from "./state.js";
import { toggleFold } from "./epicList.js";

const ASK = {
  completed: id => `Close ${id}? Its tasks move to the archive and it moves to Completed.`,
  archived: id => `Close ${id}? Its tasks move to the archive and it goes straight to Archived.`,
};

/** Moves the epic `key` ("project/EPIC-nnn") to `to`; Completed and Archived ask first. Returns the pending request. */
export function dropEpic(key, to) {
  const [project, id] = key.split("/");
  if (ASK[to] && !confirm(ASK[to](id))) return;
  return act(() => api("POST", `/api/epics/${encodeURIComponent(project)}/${encodeURIComponent(id)}/move`, { to }));
}

let dragged = null;
/** Wires epic buttons as drag sources and the section headers and open list as drop targets, within one project. */
export function bindEpicDrag() {
  document.querySelectorAll(".epic[data-epic-key]").forEach(b => {
    b.addEventListener("dragstart", ev => { dragged = b.dataset.epicKey; b.classList.add("dragging"); ev.dataTransfer.effectAllowed = "move"; });
    b.addEventListener("dragend", () => { b.classList.remove("dragging"); dragged = null; });
  });
  document.querySelectorAll("[data-drop-epic]").forEach(t => {
    const mine = () => dragged && dragged.split("/")[0] === t.dataset.project;
    t.addEventListener("dragover", ev => { if (mine()) { ev.preventDefault(); t.classList.add("over"); } });
    t.addEventListener("dragenter", () => {
      // Unfold in place: a full render would remove the dragged button and end the drag.
      if (!mine() || t.dataset.dropEpic === "open" || t.getAttribute("aria-expanded") !== "false") return;
      toggleFold(t.dataset.project, t.dataset.dropEpic, true);
      t.setAttribute("aria-expanded", "true");
      t.textContent = t.textContent.replace("▸", "▾");
      t.nextElementSibling?.removeAttribute("hidden");
    });
    t.addEventListener("dragleave", () => t.classList.remove("over"));
    t.addEventListener("drop", ev => {
      ev.preventDefault(); t.classList.remove("over");
      const k = dragged; dragged = null;
      if (k && k.split("/")[0] === t.dataset.project) dropEpic(k, t.dataset.dropEpic);
    });
  });
}
