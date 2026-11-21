// The campaign brief: the header lines of a campaign epic. Pure.

import { checkDate } from "./contacts.js";

export const BRIEF_KEYS = ["occasion", "goal", "change", "measure", "audience", "message", "ask", "channels", "starts", "ends", "budget"];
export const OCCASIONS = ["release", "demo", "festival", "update", "sale", "announcement", "other"];

export const emptyBrief = () => Object.fromEntries(BRIEF_KEYS.map(k => [k, ""]));

/** A value in angle brackets is the template's placeholder, so it counts as empty. */
export const isPlaceholder = v => /^<.*>$/.test(String(v ?? "").trim());

/** `changes` (lower-case brief keys, an empty value clears) checked against the `current` brief; returns the cleaned changes. */
export function checkBrief(changes, current = {}) {
  const out = {};
  for (const [key, raw] of Object.entries(changes)) {
    if (!BRIEF_KEYS.includes(key)) throw new Error(`Unknown brief key "${key}": ${BRIEF_KEYS.join(", ")}`);
    const v = String(raw ?? "").replace(/\s+/g, " ").trim();
    if (v === "") out[key] = "";
    else if (key === "occasion") {
      if (!OCCASIONS.includes(v.toLowerCase())) throw new Error(`Occasion must be one of ${OCCASIONS.join(", ")}: ${v}`);
      out[key] = v.toLowerCase();
    } else if (key === "starts" || key === "ends") out[key] = checkDate(v, key === "starts" ? "Starts" : "Ends");
    else out[key] = isPlaceholder(v) ? "" : v;
  }
  const merged = { ...current, ...out };
  if (merged.starts && merged.ends && merged.ends < merged.starts) throw new Error(`Ends ${merged.ends} is before Starts ${merged.starts}`);
  return out;
}
