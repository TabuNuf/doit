// The Contacts list as columns: header row, row cells and the sort a header click sets. Pure apart from the saved choice.

import { S, esc, fmtDate, compactCount } from "./state.js";
import { headerRow as pickerHeader, visibleColumns } from "./columnPicker.js";

export const CONTACT_COLS = [
  { id: "name", label: "Name", width: "minmax(8em, 2fr)" }, { id: "type", label: "Type", width: "minmax(5em, 1fr)" }, { id: "reach", label: "Reach", width: "4.5em" },
  { id: "status", label: "Status", width: "5.5em" }, { id: "last", label: "Last contact", width: "6.5em" }, { id: "next", label: "Next contact", width: "7em" },
];
export const COLUMNS = CONTACT_COLS.map(c => [c.id, c.label]);
/** The columns shown now, from the saved choice. */
export const shownContactCols = () => visibleColumns("contacts", CONTACT_COLS);
/** Text columns sort A to Z first; reach and dates, largest and newest first. */
const FIRST_DOWN = new Set(["reach", "last"]);

const key = {
  name: c => c.name.toLowerCase(), type: c => (c.types[0] || ""), reach: c => c.reach ?? -1,
  status: c => c.status, last: c => c.last || "", next: c => c.next || "9999",
};

/** The sort after a click on a header: a new column starts in its own direction, the same column reverses. */
export function clickSort(sort, column) {
  if (sort && sort.key === column) return { key: column, dir: sort.dir === "asc" ? "desc" : "asc" };
  return { key: column, dir: FIRST_DOWN.has(column) ? "desc" : "asc" };
}

/** The list in display order: the sort when one is set (ties by name), else due contacts first in the order given. */
export function orderContacts(list, sort) {
  if (!sort || !key[sort.key]) return [...list.filter(c => c.due), ...list.filter(c => !c.due)];
  const f = key[sort.key], s = sort.dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => s * (f(a) < f(b) ? -1 : f(a) > f(b) ? 1 : 0) || a.name.localeCompare(b.name));
}

export function headerRow(sort) {
  return pickerHeader({ list: "contacts", columns: CONTACT_COLS, cls: "mk-cols", open: S.colMenu === "contacts", cell: ({ id, label }) => {
    const on = sort && sort.key === id;
    return `<button class="mk-col" data-mk-sort="${id}" aria-sort="${on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}" title="Sort by ${label}">${label}${on ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}</button>`;
  } });
}

const date = (d, what) => d ? `<span class="mono" title="${what}: ${esc(d)}">${esc(d)}</span>` : `<span class="muted">-</span>`;

/** The mark for a special relationship, its reason as the tooltip; none when the contact has none. */
export const specialMark = c => c.special ? `<span class="pill special" title="${esc(c.special)}">special</span>` : "";

/** The next contact date in full (a parked contact's review date), marked when due; "-" when empty. */
const nextCell = c => c.next
  ? `<span class="mono${c.due ? " pill due late" : ""}" title="${c.status === "parked" ? "Review" : "Next contact"} ${esc(c.next)}${c.due ? ", due" : ""}">${esc(c.next)}</span>`
  : `<span class="muted">-</span>`;

/** The cells of a row, only for the shown columns; the name cell also carries the fit mark and the special mark. */
export function rowCells(c, mark = "", cols = shownContactCols()) {
  const cell = {
    name: `<span class="title">${esc(c.name)}<span class="pills">${mark}</span></span>`,
    type: `<span class="pills">${c.types.map(t => `<span class="pill">${esc(t)}</span>`).join("")}</span>`,
    reach: `<span class="mono" title="Reach ${esc(c.reach ?? "")}">${c.reach !== null && c.reach !== undefined ? esc(compactCount(c.reach)) : ""}</span>`,
    status: `<span><span class="pill${c.status === "active" ? "" : " ai"}">${esc(c.status)}</span></span>`,
    last: date(c.last, "Last contact, the newest mail, reply, video or sent draft logged for this contact"),
    next: nextCell(c),
  };
  return cols.map(k => cell[k.id]).join("");
}
