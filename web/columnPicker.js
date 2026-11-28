// The shared column picker: which columns of a list with headers are shown, kept per list in the browser.
// A column is {id, label, width}; width is a CSS grid track. The first column is always shown.

import { esc } from "./state.js";

const keyOf = list => `doit.columns.${list}`;
const store = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };

/** The ids saved as hidden for a list; empty when storage is off or unreadable. */
export function hiddenIds(list, storage = store()) {
  try {
    const v = JSON.parse(storage?.getItem(keyOf(list)) || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch { return []; }
}

/** The columns to show, in order; the first never hides. */
export function visibleColumns(list, columns, storage = store()) {
  const hidden = new Set(hiddenIds(list, storage));
  return columns.filter((c, i) => i === 0 || !hidden.has(c.id));
}

/** The grid-template-columns value for the shown columns. */
export const gridTemplate = cols => cols.map(c => c.width).join(" ");

/** The inline style that gives a header or row its grid. */
export const gridStyle = cols => `style="grid-template-columns: ${gridTemplate(cols)}"`;

/** Shows or hides one column and saves the choice; the first column is refused. Returns the visible columns. */
export function toggleColumn(list, columns, id, storage = store()) {
  if (columns[0]?.id !== id) {
    const hidden = new Set(hiddenIds(list, storage));
    hidden.has(id) ? hidden.delete(id) : hidden.add(id);
    try { storage?.setItem(keyOf(list), JSON.stringify([...hidden])); } catch { /* storage off */ }
  }
  return visibleColumns(list, columns, storage);
}

/** The small button in a header row's top left corner. */
export const cornerButton = list => `<button class="col-btn" data-col-menu="${esc(list)}" title="Columns" aria-label="Columns" aria-haspopup="true">☰</button>`;

/** The dropdown: one checkbox per column, the first checked and disabled. */
export function columnMenu(list, columns, storage = store()) {
  const shown = new Set(visibleColumns(list, columns, storage).map(c => c.id));
  const rows = columns.map((c, i) => `<label class="col-opt"><input type="checkbox" data-col-toggle="${esc(list)}" data-col="${esc(c.id)}"${shown.has(c.id) ? " checked" : ""}${i === 0 ? " disabled" : ""}> ${esc(c.label)}</label>`);
  return `<div class="col-menu" role="menu" aria-label="Columns">${rows.join("")}</div>`;
}

/**
 * A header row of a div grid. `cell(col)` gives each header cell; the corner button sits in the first cell
 * and the dropdown, when `open`, hangs under the row.
 */
export function headerRow({ list, columns, cls, open = false, cell, storage }) {
  const cols = visibleColumns(list, columns, storage);
  const cells = cols.map((c, i) => i === 0 ? `<span class="col-first">${cornerButton(list)}${cell(c)}</span>` : cell(c)).join("");
  return `<div class="mk-head ${cls}" role="row" data-col-head="${esc(list)}" ${gridStyle(cols)}>${cells}${open ? columnMenu(list, columns, storage) : ""}</div>`;
}
