// The Games tab: the list of covered games with filters and a detail pane. The server filters; the page sends the filters.

import { S, esc, api, redraw, toast } from "./state.js";
import { EMPTY_GM_FILTERS, GM_FILTERS, gamePath, filterPane } from "./gameFilters.js";
import { clickGameSort, orderGames, gameHeaderRow, gameCells, nextGame } from "./gameColumns.js";
import { gameDetailPane, gameEditRequest } from "./gameDetail.js";
import { linkAdd, linkRemove } from "./gameLinks.js";

export { gameDetailPane };

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

export function gamesPanes() {
  const g = S.gm;
  return filterPane(g.f, g.tags, S.mk.profiles) + gameListPane(g.list, g.sel, g.sort, Object.values(g.f).some(Boolean)) + gameDetailPane(g.detail, g.compOpen);
}

/** Loads the filtered list, the tags in use and the selected game; no redraw. */
export async function loadGames() {
  const g = S.gm;
  [g.list, g.tags] = await Promise.all([api("GET", gamePath(g.f)), api("GET", "/api/game-tags")]);
  g.detail = g.sel ? await api("GET", `/api/games/${encodeURIComponent(g.sel)}`).catch(() => null) : null;
  if (!g.detail) { g.sel = null; g.compOpen = false; }
}

/** Reloads the Games tab and redraws it. */
export async function refreshGames() {
  try { await loadGames(); redraw(); } catch (e) { toast(e.message); }
}

/** Sends an edit, shows the saved entry and reloads the list; a refused value goes to the toast. */
async function sendGame(req) {
  try { S.gm.detail = await api(req.method, req.path, req.body); } catch (e) { toast(e.message); }
  return refreshGames();
}

/** A click on a Games control; true when it was one. */
export function gamesClick(d) {
  const g = S.gm;
  if (d.gmOpen) { S.mk.pane = "games"; g.sel = d.gmOpen; g.detail = null; g.compOpen = false; redraw(); refreshGames(); return true; }
  if (d.game) { g.sel = d.game; g.detail = null; g.compOpen = false; redraw(); refreshGames(); return true; }
  if (d.gmSort) { g.sort = clickGameSort(g.sort, d.gmSort); try { localStorage.setItem("doit.games.sort", JSON.stringify(g.sort)); } catch { /* storage off */ } redraw(); return true; }
  if ("gmClear" in d) { g.f = { ...EMPTY_GM_FILTERS }; refreshGames(); return true; }
  if (d.gmDel && g.detail) { const [field, kind] = d.gmDel.split("/"); sendGame(linkRemove(g.detail, field, kind)); return true; }
  if (d.gmAdd && g.detail) {
    const req = linkAdd(g.detail, d.gmAdd, document.getElementById(`gm-lk-${d.gmAdd}`).value, document.getElementById(`gm-lu-${d.gmAdd}`).value);
    req ? sendGame(req) : toast("Give the link a URL first.");
    return true;
  }
  return false;
}

/** A changed filter or field; true when the change was one. Text areas save on focus out instead. */
export function gamesChange(ev) {
  const el = ev.target;
  if (el.id.startsWith("gm-f-")) {
    const req = el.tagName !== "TEXTAREA" && S.gm.detail && gameEditRequest(el, S.gm.detail);
    if (req) sendGame(req);
    return true;
  }
  if (el.id === "gm-nofacts") S.gm.f.noFacts = el.checked ? "1" : "";
  else if (GM_FILTERS[el.id]) S.gm.f[GM_FILTERS[el.id]] = el.value;
  else return el.id.startsWith("gm-");
  refreshGames();
  return true;
}

/** The description, what worked and notes save when the field loses focus; true when the event was a Games field. */
export function gamesFocusOut(ev) {
  const el = ev.target;
  if (el.tagName !== "TEXTAREA" || !el.id.startsWith("gm-f-")) return false;
  const req = S.gm.detail && gameEditRequest(el, S.gm.detail);
  if (req) sendGame(req);
  return true;
}

export const gamesSubmit = () => false;

/** Arrow up and down move the selection in the list, and the pane follows; true when the key was handled. */
export function gamesKey(ev) {
  const g = S.gm;
  ev.preventDefault();
  const key = nextGame(orderGames(g.list || [], g.sort).map(e => e.key), g.sel, ev.key);
  if (key === null || key === g.sel) return true;
  g.sel = key;
  refreshGames().then(() => [...document.querySelectorAll("[data-game]")].find(b => b.dataset.game === key)?.focus());
  return true;
}
