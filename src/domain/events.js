// The event fields of a festival or conference contact. Pure.

import { checkDate, ContactError } from "./contacts.js";

export const WHERES = ["steam", "epic", "gog", "itch", "physical", "online"];
export const WATCH_STATES = ["watching", "applied", "accepted", "declined", "past"];
export const GAME_STAGES = ["in development", "demo", "released"];

const oneOf = (value, list, what) => {
  const v = String(value ?? "").trim().toLowerCase();
  if (!list.includes(v)) throw new ContactError(`Unknown ${what} "${value}"; use ${list.join(", ")}`);
  return v;
};

/** A list from an array or a comma separated string: trimmed, lower case, no empties or repeats. */
const words = v => [...new Set((Array.isArray(v) ? v : String(v ?? "").split(",")).map(s => String(s).trim().toLowerCase()).filter(Boolean))];

export function checkYear(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) throw new ContactError(`Year must be a four digit year: ${value}`);
  return n;
}

/** The event of a festival or conference from input; throws ContactError on a refused value. */
export function checkEvent(input = {}) {
  const starts = input.starts ? checkDate(input.starts, "Start date") : "";
  const ends = input.ends ? checkDate(input.ends, "End date") : "";
  if (starts && ends && ends < starts) throw new ContactError(`End date ${ends} is before the start date ${starts}`);
  const c = input.criteria ?? {};
  return {
    year: checkYear(input.year),
    starts, ends,
    deadline: input.deadline ? checkDate(input.deadline, "Application deadline") : "",
    cost: String(input.cost ?? "").replace(/\s+/g, " ").trim(),
    where: input.where ? oneOf(input.where, WHERES, "where") : "",
    criteria: {
      genres: words(c.genres),
      stages: words(c.stages).map(s => oneOf(s, GAME_STAGES, "stage")),
      platforms: words(c.platforms),
    },
    state: input.state ? oneOf(input.state, WATCH_STATES, "watching state") : "watching",
  };
}

export function checkWatchState(value) { return oneOf(value, WATCH_STATES, "watching state"); }

/** Whole days from `today` to `date` (both YYYY-MM-DD); negative when past; null when there is no date. */
export function daysLeft(date, today) {
  if (!date) return null;
  return Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000);
}
