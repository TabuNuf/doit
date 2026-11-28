// The one-off migration's parser: the `Indie fit:` first line the research run wrote into a contact's notes. Pure.

/** The verdict words as scale labels; null when none is recognised. */
function scalesOf(verdict) {
  const v = verdict.toLowerCase();
  if (/aaa|mainstream/.test(v)) return ["aaa"];
  if (/mixed/.test(v)) return ["indie", "aaa"];
  if (/indie-friendly|indie friendly/.test(v)) return ["indie"];
  return null;
}

/** `Indie fit: <verdict>. <evidence> Checked <date>.` as the first non-empty line of `notes`.
 *  Returns {scales, scaleNote, checked, notes} with that line removed and every other line kept, or null when there is no such line or its verdict is unknown. */
export function takeIndieFit(notes) {
  const lines = String(notes ?? "").split("\n");
  const at = lines.findIndex(l => l.trim());
  const m = at < 0 ? null : lines[at].trim().match(/^Indie fit:\s*(.*)$/i);
  if (!m) return null;
  const cut = m[1].indexOf(". ");
  const verdict = cut < 0 ? m[1].replace(/\.$/, "") : m[1].slice(0, cut);
  const scales = scalesOf(verdict);
  if (!scales) return null;
  const rest = cut < 0 ? "" : m[1].slice(cut + 2);
  const checked = rest.match(/Checked (\d{4}-\d{2}-\d{2})\.?/)?.[1] ?? "";
  const scaleNote = rest.replace(/\s*Checked \d{4}-\d{2}-\d{2}\.?/, "").trim();
  const left = [...lines.slice(0, at), ...lines.slice(at + 1)];
  while (left.length && !left[0].trim()) left.shift();
  return { scales, scaleNote, checked, notes: left.join("\n").trim() };
}
