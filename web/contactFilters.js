// The Contacts tab's filters: the list request and the filter column. Pure.

import { esc } from "./state.js";
import { STATUSES } from "./contactDetail.js";

/** The types a person or outlet has; festivals and conferences have their own tabs. */
export const TYPES = ["influencer", "blogger", "press", "publisher", "tester"];
const EVENT_TYPES = "festival,conference";
export const REACH_OPTIONS = [["", "Any"], ["100", "100"], ["1000", "1 000"], ["10000", "10 000"], ["100000", "100 000"]];

export const EMPTY_FILTERS = { type: "", reach: "", status: "", genre: "", fits: "", contacted: "" };
/** The select id of each filter (the status filter's id differs from the contact's own status field). */
export const FILTERS = { "mk-type": "type", "mk-reach": "reach", "mk-fstatus": "status", "mk-genre": "genre", "mk-fits": "fits", "mk-contacted": "contacted" };

/** The list request for the chosen filters; events are left out. `contacted` is "c:<game>" (a touch for it) or "n:<game>" (none). */
export function contactPath(f) {
  const q = new URLSearchParams();
  for (const k of ["type", "reach", "status", "genre", "fits"]) if (f[k]) q.set(k, f[k]);
  if (f.contacted && f.contacted.startsWith("c:")) q.set("contacted", f.contacted.slice(2));
  if (f.contacted && f.contacted.startsWith("n:")) q.set("notContacted", f.contacted.slice(2));
  q.set("except", EVENT_TYPES);
  const s = q.toString();
  return "/api/contacts" + (s ? "?" + s : "");
}

/** The request for the Parked section: every parked contact, events left out; the filters do not apply to it. */
export const parkedPath = () => `/api/contacts?parked=1&except=${EVENT_TYPES}`;

const opts = (options, value) => options.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(l)}</option>`).join("");
const select = (id, label, options, value, extra = "") => `<label for="${id}">${label}<select id="${id}">${opts(options, value)}${extra}</select></label>`;

/** The filter column; Fits and Contacted offer each profile. */
export function filterPane(f, genres = [], profiles = []) {
  const any = l => ["", l];
  const name = p => p.name || p.game;
  const group = (label, prefix) => `<optgroup label="${label}">${opts(profiles.map(p => [prefix + p.game, name(p)]), f.contacted)}</optgroup>`;
  const contacted = profiles.length ? group("Contacted about", "c:") + group("Not yet contacted about", "n:") : "";
  return `<section class="pane" aria-label="Filters"><div class="pane-h">Filters</div><div class="pane-b form mk-filters">
    ${select("mk-type", "Type", [any("Any type"), ...TYPES.map(t => [t, t])], f.type)}
    ${select("mk-reach", "Reach at least", REACH_OPTIONS, f.reach)}
    ${select("mk-genre", "Genre", [any("Any genre"), ...genres.map(g => [g, g])], f.genre)}
    ${select("mk-fstatus", "Status", [any("Any status"), ...STATUSES.map(s => [s, s])], f.status)}
    ${select("mk-fits", "Fits", [any("Any"), ...profiles.map(p => [p.game, name(p)])], f.fits)}
    ${select("mk-contacted", "Contacted", [any("Any")], f.contacted, contacted)}
    <button data-mk-clear>Clear filters</button></div></section>`;
}
