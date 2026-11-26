// The Games tab: the list of covered games with filters and a detail pane. The server filters; the page sends the filters.

import { S, $, esc, api, redraw } from "./state.js";
import { EMPTY_GM_FILTERS, GM_FILTERS, gamePath, filterPane } from "./gameFilters.js";
import { clickGameSort, orderGames, gameHeaderRow, gameCells, nextGame } from "./gameColumns.js";
import { refreshMarketing } from "./marketingView.js";

export function gameRow(e, sel) {
  return `<button class="mk-row gm-cols" data-game="${esc(e.key)}" aria-pressed="${sel === e.key}">${gameCells(e)}</button>`;
}

/** The list column: a header row, then the games in the chosen order. */
export function gameListPane(list, sel, sort = null, filtered = false) {
  if (!list) return `<section class="pane"><div class="pane-h">Games</div><div class="pane-b"><div class="empty">Loading…</div></div></section>`;
  const body = list.length ? gameHeaderRow(sort) + orderGames(list, sort).map(e => gameRow(e, sel)).join("")
    : filtered ? `<div class="empty">No game matches these filters. <button data-gm-clear>Clear filters</button></div>`
      : `<div class="empty">No games yet. A game appears here when a contact covers it.</div>`;
  return `<section class="pane" aria-label="Games"><div class="pane-h">Games<span class="c">${list.length}</span></div><div class="pane-b">${body}</div></section>`;
}

/** The right pane: for now the title and description only. Replace this one function with the full pane. */
export function gameDetailPane(g) {
  if (!g) return `<section class="pane" aria-label="Game"><div class="pane-h">Game</div><div class="pane-b"><div class="empty">Pick a game.</div></div></section>`;
  return `<section class="pane" aria-label="Game"><div class="pane-h">${esc(g.title)}</div><div class="pane-b detail"><p style="white-space:pre-wrap">${g.description ? esc(g.description) : `<span class="muted">No description yet.</span>`}</p></div></section>`;
}

export function gamesPanes() {
  const g = S.gm;
  return filterPane(g.f, g.tags, S.mk.profiles) + gameListPane(g.list, g.sel, g.sort, Object.values(g.f).some(Boolean)) + gameDetailPane(g.detail);
}

/** Loads the filtered list, the tags in use and the selected game. */
export async function refreshGames() {
  const g = S.gm;
  [g.list, g.tags] = await Promise.all([api("GET", gamePath(g.f)), api("GET", "/api/game-tags")]);
  g.detail = g.sel ? await api("GET", `/api/games/${encodeURIComponent(g.sel)}`).catch(() => null) : null;
  if (!g.detail) g.sel = null;
}

/** A click on a Games control; true when it was one. */
export function gamesClick(d) {
  const g = S.gm;
  if (d.game) { g.sel = d.game; g.detail = null; redraw(); refreshMarketing(); return true; }
  if (d.gmSort) { g.sort = clickGameSort(g.sort, d.gmSort); try { localStorage.setItem("doit.games.sort", JSON.stringify(g.sort)); } catch { /* storage off */ } redraw(); return true; }
  if ("gmClear" in d) { g.f = { ...EMPTY_GM_FILTERS }; refreshMarketing(); return true; }
  return false;
}

/** A changed filter; true when the change was one. */
export function gamesChange(ev) {
  const el = ev.target;
  if (el.id === "gm-nofacts") S.gm.f.noFacts = el.checked ? "1" : "";
  else if (GM_FILTERS[el.id]) S.gm.f[GM_FILTERS[el.id]] = el.value;
  else return el.id.startsWith("gm-");
  refreshMarketing();
  return true;
}

/** Fields that save on blur and forms come with the detail pane; none here yet. */
export const gamesFocusOut = () => false;
export const gamesSubmit = () => false;

/** Arrow up and down move the selection in the list, and the pane follows; true when the key was handled. */
export function gamesKey(ev) {
  const g = S.gm;
  ev.preventDefault();
  const key = nextGame(orderGames(g.list || [], g.sort).map(e => e.key), g.sel, ev.key);
  if (key === null || key === g.sel) return true;
  g.sel = key;
  refreshMarketing().then(() => [...document.querySelectorAll("[data-game]")].find(b => b.dataset.game === key)?.focus());
  return true;
}
