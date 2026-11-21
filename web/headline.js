// A long checklist title is a whole spec on one line: split it into a heading and the rest for reading.
// View only; the stored title stays whole, since the store writes it back to the epic line.

export const LONG_TITLE = 90;

/** "Palette guard. Blocked: ..." -> { head: "Palette guard.", rest: "Blocked: ..." }; a short title has no rest. */
export function headline(title) {
  const text = String(title || "").trim();
  if (text.length <= LONG_TITLE) return { head: text, rest: "" };
  const end = /[.!?](?=\s)/g;
  let m, cut = -1;
  while ((m = end.exec(text)) && m.index < LONG_TITLE) if (m.index >= 3) { cut = m.index; break; }
  if (cut >= 0) return { head: text.slice(0, cut + 1), rest: text.slice(cut + 1).trim() };
  const space = text.lastIndexOf(" ", LONG_TITLE - 1);
  const at = space > 20 ? space : LONG_TITLE - 1;
  return { head: text.slice(0, at) + "…", rest: "…" + text.slice(at).trim() };
}
