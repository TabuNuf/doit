// An epic file's text read into the parts the epic page shows: the title, the header (In short, Why it exists,
// Status, facts, loose text), the findings and every `##` section in file order. Pure; no text is dropped.

const FACT = /^([A-Z][A-Za-z]*(?: [A-Za-z]+){0,3}):[ \t]+(\S.*)$/;
const PLACEHOLDER = /^<[^<>]*>$/;
const FENCE = /^\s*```/;
const ITEM = /^([-*]|\d+\.)[ \t]+(.*)$/;
const LABEL = /^[-*][ \t]+([A-Z][A-Za-z]*(?: [A-Za-z]+){0,3}):[ \t]+(.*)$/;

/** A value written as a template placeholder (`<...>`) reads as not written. */
const written = v => (v == null || PLACEHOLDER.test(v.trim()) ? null : v.trim());

/** The text cut into the part before the first `##` heading and the `##` sections; fenced blocks never split. */
function cut(rows) {
  const head = [], sections = [];
  let fenced = false, current = null;
  for (const row of rows) {
    if (FENCE.test(row)) fenced = !fenced;
    const h = !fenced && /^##[ \t]+(.*)$/.exec(row);
    if (h) { current = { heading: h[1].trim(), rows: [] }; sections.push(current); continue; }
    (current ? current.rows : head).push(row);
  }
  return { head, sections };
}

/** Rows split into blocks at blank lines, a fenced block kept whole. */
function blocks(rows) {
  const out = [];
  let block = [], fenced = false;
  for (const row of rows) {
    if (FENCE.test(row)) fenced = !fenced;
    if (!fenced && !row.trim()) { if (block.length) out.push(block); block = []; continue; }
    block.push(row);
  }
  if (block.length) out.push(block);
  return out;
}

const text = rows => rows.join("\n").replace(/^\s*\n|\n\s*$/g, "");

/** The header: a block's leading `Key: value` lines are facts, the rest of the block is loose markdown. */
function readHeader(rows) {
  let title = null;
  const facts = [], loose = [];
  for (const block of blocks(rows)) {
    let k = 0;
    if (title === null && /^#[ \t]+/.test(block[0])) { title = block[0].replace(/^#[ \t]+/, "").trim(); k = 1; }
    for (; k < block.length; k++) {
      const f = FACT.exec(block[k]);
      if (!f) break;
      facts.push({ key: f[1], value: f[2].trim() });
    }
    if (k < block.length) loose.push(text(block.slice(k)));
  }
  return { title, facts, loose };
}

/** In short, Why it exists and Status taken out of the facts; a written Goal stands in for a missing In short. */
function placeHeader(facts) {
  const take = key => {
    const i = facts.findIndex(f => f.key.toLowerCase() === key.toLowerCase());
    return i < 0 ? null : facts.splice(i, 1)[0];
  };
  const out = { inShort: null, inShortKey: null, why: null, status: null, statusRest: "" };
  const short = take("In short");
  if (short && written(short.value)) { out.inShort = written(short.value); out.inShortKey = "In short"; }
  if (!out.inShort) {
    const goal = facts.find(f => f.key === "Goal" && written(f.value));
    if (goal) { facts.splice(facts.indexOf(goal), 1); out.inShort = written(goal.value); out.inShortKey = "Goal"; }
  }
  const why = take("Why it exists");
  if (why) out.why = written(why.value);
  const status = take("Status");
  if (status) {
    const m = /^(\w+)(.*)$/.exec(status.value);
    out.status = m ? m[1] : status.value;
    out.statusRest = m ? m[2].trim() : "";
  }
  for (const f of facts) f.value = written(f.value);
  return out;
}

/** A section's rows as top-level list items, each with its continuation rows dedented, and the text between them. */
function listParts(rows) {
  const parts = [];
  let item = null, pending = [];
  const flush = () => { if (pending.some(r => r.trim())) parts.push({ kind: "markdown", rows: pending }); pending = []; };
  for (const row of rows) {
    const m = ITEM.exec(row);
    if (m) { flush(); item = { kind: "item", marker: m[1], first: m[2], rows: [], indent: m[1].length + 1 }; parts.push(item); continue; }
    if (item && (!row.trim() || /^\s/.test(row))) { item.rows.push(row); continue; }
    item = null;
    pending.push(row);
  }
  flush();
  for (const p of parts) {
    if (p.kind !== "item") continue;
    while (p.rows.length && !p.rows.at(-1).trim()) p.rows.pop();
    const pad = new RegExp(`^ {0,${Math.max(p.indent, 2)}}`);
    p.rows = p.rows.map(r => r.replace(pad, ""));
  }
  return parts;
}

/** A finding's detail as labelled lines, when every row of it is a `- Label: text` line or continues one. */
function labelled(rows) {
  const detail = [], filled = rows.filter(r => r.trim());
  const base = Math.min(...filled.map(r => /^ */.exec(r)[0].length));
  for (const row of filled) {
    const m = LABEL.exec(row.slice(base));
    if (m && /^ */.exec(row)[0].length === base) detail.push({ label: m[1], text: m[2].trim() });
    else if (/^ */.exec(row)[0].length > base && detail.length) detail.at(-1).text += " " + row.trim();
    else return null;
  }
  return detail.length ? detail : null;
}

const OPENING = /^(?:`?\[([\w ?-]+)\]`?[ \t]+)?\*\*(.+?)\*\*(.*)$/;

/** One list item read as a finding, or null when its opening has no bold title. */
function finding(item, count) {
  const open = OPENING.exec(item.first);
  if (!open) return null;
  let tag = open[1] ?? null, title = open[2].trim(), rest = open[3], n = null;
  const id = /^([A-Z]?\d+[a-z]?)\.[ \t]+(.*)$/.exec(title);
  if (id) { n = id[1]; title = id[2]; }
  const inner = /^`?\[([\w ?-]+)\]`?[ \t]*(.*)$/.exec(title);
  if (inner && !tag) { tag = inner[1]; title = inner[2]; }
  title = title.replace(/[.:]$/, "").trim();
  let state = null;
  const chip = /^[ \t]*`(Decided|Proposed)`/.exec(rest);
  if (chip) { state = chip[1]; rest = rest.slice(chip[0].length); }
  const body = text([rest.trim(), ...item.rows].filter((r, k) => k > 0 || r));
  if (!state) state = /\b(Decided|Proposed)\b(?=\s*[:*)])/.exec(body)?.[1] ?? null;
  if (n === null) n = /^\d+\.$/.test(item.marker) ? item.marker.slice(0, -1) : String(count);
  return { kind: "finding", n, tag, title, state, detail: rest.trim() ? null : labelled(item.rows), body };
}

/** The Findings section's parts in file order, or null when no item has a bold title (it then shows as markdown). */
function readFindings(rows) {
  const parts = [];
  let found = 0;
  for (const p of listParts(rows)) {
    const f = p.kind === "item" ? finding(p, found + 1) : null;
    if (f) { found++; parts.push(f); continue; }
    const md = p.kind === "item" ? [`${p.marker} ${p.first}`, ...p.rows.map(r => (r.trim() ? " ".repeat(p.indent) + r : r))] : p.rows;
    const last = parts.at(-1);
    if (last?.kind === "markdown") last.text += "\n\n" + text(md);
    else parts.push({ kind: "markdown", text: text(md) });
  }
  return found ? parts.filter(p => p.kind === "finding" || p.text) : null;
}

/** The epic file's text as the parts the epic page shows. What does not parse stays markdown in its place. */
export function parseEpicDoc(source) {
  const rows = String(source ?? "").replace(/\r/g, "").split("\n");
  const { head, sections } = cut(rows);
  const { title, facts, loose } = readHeader(head);
  const id = title && /EPIC-\d+/.exec(title)?.[0] || null;
  const name = title ? title.replace(/^EPIC-\d+:[ \t]*/, "") : null;
  const placed = placeHeader(facts);
  const out = sections.map(s => ({ heading: s.heading, body: text(s.rows) }));
  const at = sections.findIndex(s => /^findings\b/i.test(s.heading));
  const findings = at < 0 ? null : readFindings(sections[at].rows);
  return { title, id, name, ...placed, facts, loose, findings, sections: out };
}
