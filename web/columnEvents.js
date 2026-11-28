// Opens and closes the column dropdown and applies a ticked box; one listener set for every list with a picker.

import { S, redraw } from "./state.js";
import { toggleColumn } from "./columnPicker.js";
import { CONTACT_COLS } from "./contactColumns.js";
import { GAME_COLS } from "./gameColumns.js";
import { TASK_COLS } from "./epicParts.js";

const LISTS = { contacts: CONTACT_COLS, games: GAME_COLS, "epic-tasks": TASK_COLS };

const setMenu = list => { if (S.colMenu === list) return; S.colMenu = list; redraw(); };

document.addEventListener("contextmenu", ev => {
  const head = ev.target.closest?.("[data-col-head]");
  if (!head || !LISTS[head.dataset.colHead]) return;
  ev.preventDefault();
  S.colMenu = head.dataset.colHead;
  redraw();
});

document.addEventListener("click", ev => {
  const btn = ev.target.closest?.("[data-col-menu]");
  if (btn) { S.colMenu = S.colMenu === btn.dataset.colMenu ? "" : btn.dataset.colMenu; return redraw(); }
  if (S.colMenu && !ev.target.closest(".col-menu")) setMenu("");
});

document.addEventListener("keydown", ev => { if (ev.key === "Escape") setMenu(""); });

document.addEventListener("change", ev => {
  const box = ev.target.dataset?.colToggle;
  if (!box || !LISTS[box]) return;
  toggleColumn(box, LISTS[box], ev.target.dataset.col);
  redraw();
});
