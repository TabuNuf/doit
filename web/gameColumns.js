// The Games list as columns: header row, row cells, the order and the sort a header click sets. Pure.

import { S, esc, compactCount } from "./state.js";
import { headerRow, visibleColumns } from "./columnPicker.js";

export const GAME_COLS = [
  { id: "title", label: "Title", width: "minmax(8em, 2fr)" }, { id: "genre", label: "Genre", width: "minmax(5em, 1.2fr)" }, { id: "scale", label: "Scale", width: "5em" },
  { id: "rating", label: "Rating", width: "4em" }, { id: "reviews", label: "Reviews", width: "4.5em" }, { id: "sales", label: "Est. sales", width: "5em" }, { id: "covered", label: "Covered by", width: "5em" },
];
export const GM_COLUMNS = GAME_COLS.map(c => [c.id, c.label]);
/** The columns shown now, from the saved choice. */
export const shownGameCols = () => visibleColumns("games", GAME_COLS);
/** Text columns sort A to Z first; figures, largest first. */
const FIRST_DOWN = new Set(["rating", "reviews", "sales", "covered"]);

const key = {
  title: e => e.title.toLowerCase(), genre: e => (e.genres[0] || "").toLowerCase(), scale: e => e.scales.join("+"),
  rating: e => e.rating, reviews: e => e.reviews, sales: e => e.estimates.sales, covered: e => e.coverage.count,
};

/** The sort after a click on a header: a new column starts in its own direction, the same column reverses. */
export function clickGameSort(sort, column) {
  if (sort && sort.key === column) return { key: column, dir: sort.dir === "asc" ? "desc" : "asc" };
  return { key: column, dir: FIRST_DOWN.has(column) ? "desc" : "asc" };
}

/** The list in display order: the sort when one is set (empty figures last, ties by title), else as the server gave it. */
export function orderGames(list, sort) {
  if (!sort || !key[sort.key]) return list;
  const f = key[sort.key], s = sort.dir === "asc" ? 1 : -1;
  const empty = v => v === null || v === undefined || v === "";
  return [...list].sort((a, b) => {
    const x = f(a), y = f(b);
    if (empty(x) !== empty(y)) return empty(x) ? 1 : -1;
    return (empty(x) ? 0 : s * (x < y ? -1 : x > y ? 1 : 0)) || a.title.localeCompare(b.title);
  });
}

export function gameHeaderRow(sort) {
  return headerRow({ list: "games", columns: GAME_COLS, cls: "gm-cols", open: S.colMenu === "games", cell: ({ id, label }) => {
    const on = sort && sort.key === id;
    return `<button class="mk-col" data-gm-sort="${id}" aria-sort="${on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}" title="Sort by ${label}">${label}${on ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}</button>`;
  } });
}

const mono = (text, title) => text === "" ? `<span class="muted">-</span>` : `<span class="mono" title="${esc(title)}">${esc(text)}</span>`;

/** The cells of a row, only for the shown columns: the title carries a pill for each store (and `comp` when marked for the game `comp`), the rating its label, the sales estimate its source. */
export function gameCells(e, comp = "", cols = shownGameCols()) {
  const from = e.estimates.salesFrom || "";
  const cell = {
    title: `<span class="title">${esc(e.title)}<span class="pills">${comp && (e.comps ?? []).some(c => c.game === comp) ? `<span class="pill comp" title="Marked comparable to ${esc(comp)}">comp</span>` : ""}${Object.keys(e.stores).map(k => `<span class="pill">${esc(k)}</span>`).join("")}</span></span>`,
    genre: `<span>${e.genres.length ? esc(e.genres.join(", ")) : `<span class="muted">-</span>`}</span>`,
    scale: `<span>${e.scales.length ? esc(e.scales.join("+")) : `<span class="muted">-</span>`}</span>`,
    rating: mono(e.rating === null ? "" : `${e.rating}%`, e.ratingLabel || "Rating"),
    reviews: mono(e.reviews === null ? "" : compactCount(e.reviews), `Reviews ${e.reviews ?? ""}`),
    sales: mono(e.estimates.sales === null ? "" : `${from.startsWith("reviews") ? "~" : ""}${compactCount(e.estimates.sales)}`, from ? `From ${from}` : "Est. sales"),
    covered: mono(String(e.coverage.count), `Covered by ${e.coverage.count} contact${e.coverage.count === 1 ? "" : "s"}, reach ${e.coverage.reach}`),
  };
  return cols.map(k => cell[k.id]).join("");
}

/** The key above or below `sel` in `keys` (`dir` ArrowUp or ArrowDown); the first when none is selected, the same at either end. */
export function nextGame(keys, sel, dir) {
  if (!keys.length) return null;
  const i = keys.indexOf(sel);
  if (i < 0) return keys[0];
  return keys[Math.max(0, Math.min(keys.length - 1, i + (dir === "ArrowDown" ? 1 : -1)))];
}
