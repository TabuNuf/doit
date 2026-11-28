// The Games tab's filters: the list request and the filter column. Pure.

import { esc } from "./state.js";

export const GM_STORES = ["steam", "epic", "gog", "itch", "playstation", "xbox", "switch", "appstore", "googleplay", "humble", "other"];
export const GM_STAGES = ["unreleased", "demo", "early-access", "released"];
export const GM_SCALES = ["solo", "indie", "triple-i", "aa", "aaa"];
const RATING = [["", "Any"], ["50", "50%"], ["70", "70%"], ["80", "80%"], ["90", "90%"]];
const REVIEWS = [["", "Any"], ["100", "100"], ["1000", "1 000"], ["10000", "10 000"], ["100000", "100 000"]];
const COVERED = [["", "Any"], ["1", "1"], ["2", "2"], ["3", "3"], ["5", "5"]];

export const EMPTY_GM_FILTERS = { genre: "", keyword: "", scale: "", stage: "", store: "", rating: "", reviews: "", covered: "", comp: "", similar: "", noFacts: "" };
/** The element id of each filter. */
export const GM_FILTERS = { "gm-genre": "genre", "gm-keyword": "keyword", "gm-scale": "scale", "gm-stage": "stage", "gm-store": "store", "gm-rating": "rating", "gm-reviews": "reviews", "gm-covered": "covered", "gm-comp": "comp", "gm-similar": "similar" };

/** The list request for the chosen filters. */
export function gamePath(f) {
  const q = new URLSearchParams();
  for (const k of Object.keys(EMPTY_GM_FILTERS)) if (f[k]) q.set(k, f[k]);
  const s = q.toString();
  return "/api/games" + (s ? "?" + s : "");
}

const opts = (options, value) => options.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(l)}</option>`).join("");
const select = (id, label, options, value) => `<label for="${id}">${label}<select id="${id}">${opts(options, value)}</select></label>`;
const same = list => list.map(v => [v, v]);

/** The filter column; Comp and Similar offer each game profile. */
export function filterPane(f, tags = { genres: [], keywords: [] }, profiles = []) {
  const any = l => ["", l];
  const games = [any("Any"), ...profiles.map(p => [p.game, p.name || p.game])];
  return `<section class="pane" aria-label="Game filters"><div class="pane-h">Filters</div><div class="pane-b form mk-filters">
    ${select("gm-genre", "Genre", [any("Any genre"), ...same(tags.genres)], f.genre)}
    ${select("gm-keyword", "Keyword", [any("Any keyword"), ...same(tags.keywords)], f.keyword)}
    ${select("gm-scale", "Scale", [any("Any scale"), ...same(GM_SCALES)], f.scale)}
    ${select("gm-stage", "Stage", [any("Any stage"), ...same(GM_STAGES)], f.stage)}
    ${select("gm-store", "Store", [any("Any store"), ...same(GM_STORES)], f.store)}
    ${select("gm-rating", "Rating at least", RATING, f.rating)}
    ${select("gm-reviews", "Reviews at least", REVIEWS, f.reviews)}
    ${select("gm-covered", "Covered by at least", COVERED, f.covered)}
    ${select("gm-comp", "Comparable to", games, f.comp)}
    ${select("gm-similar", "Similar to", games, f.similar)}
    <label for="gm-nofacts" style="display:flex;flex-direction:row;align-items:center;gap:6px"><input type="checkbox" id="gm-nofacts" ${f.noFacts ? "checked" : ""}> Not researched</label>
    <button data-gm-clear>Clear filters</button></div></section>`;
}
