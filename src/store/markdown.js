// Epic files and task files as text. Pure: text in, values out, and back.

import { BRIEF_KEYS, emptyBrief, isPlaceholder } from "../domain/campaignBrief.js";

const LINE = /^- \[( |x|X)\] (T-\d+\.\d+) (.*?)(?: \(done when: (.*)\))?\s*$/;
const FIELDS = ["state", "owner", "type", "rank", "deadline", "created", "updated", "completed", "source", "archived", "blocks", "contact"];

export function parseEpic(text) {
  const head = /^# (EPIC-\d+):\s*(.*)$/m.exec(text);
  if (!head) return null;
  const status = /^Status:\s*(\w+)/m.exec(text);
  // A campaign's Game: and Event: lines sit in the header, above the first section.
  const header = text.split(/^## /m)[0];
  const game = /^Game:[ \t]*(.+?)\s*$/m.exec(header);
  const event = /^Event:[ \t]*(.+?)\s*$/m.exec(header);
  const brief = emptyBrief();
  for (const k of BRIEF_KEYS) {
    const m = new RegExp(`^${k[0].toUpperCase() + k.slice(1)}:[ \\t]*(.*?)\\s*$`, "m").exec(header);
    if (m && !isPlaceholder(m[1])) brief[k] = m[1];
  }
  const lines = [];
  for (const raw of text.split("\n")) {
    const m = LINE.exec(raw);
    if (!m) continue;
    lines.push({ id: m[2], n: Number(m[2].split(".")[1]), title: m[3].trim(), doneWhen: (m[4] || "").trim(), ticked: m[1] !== " " });
  }
  const archivedOn = /^Archived:\s*(\d{4}-\d{2}-\d{2})/m.exec(text);
  const closed = /^Closed:\s*(\d{4}-\d{2}-\d{2})/m.exec(text);
  return { id: head[1], name: head[2].trim(), status: status ? status[1] : "Planned", closed: closed ? closed[1] : null, archivedOn: archivedOn ? archivedOn[1] : null, game: game ? game[1] : null, event: event ? event[1] : null, brief, lines };
}

/** Writes `Closed: <date>` on the line under Status, replacing an earlier one; a null date removes it. */
export function setClosed(text, date) {
  const rest = text.replace(/^Closed:.*\n?/m, "");
  return date ? rest.replace(/^(Status:.*)$/m, `$1\nClosed: ${date}`) : rest;
}

/** Writes `Archived: <date>` under `Closed:` (or Status), replacing an earlier one; a null date removes it. */
export function setArchived(text, date) {
  const rest = text.replace(/^Archived:.*\n?/m, "");
  if (!date) return rest;
  return /^Closed:.*$/m.test(rest) ? rest.replace(/^(Closed:.*)$/m, `$1\nArchived: ${date}`) : rest.replace(/^(Status:.*)$/m, `$1\nArchived: ${date}`);
}

/** Sets the epic's Status line, adding one under the title when it has none. */
export function setStatus(text, status) {
  if (/^Status:.*$/m.test(text)) return text.replace(/^Status:.*$/m, `Status: ${status}`);
  return text.replace(/^(# EPIC-.*)$/m, `$1\n\nStatus: ${status}`);
}

const HEADER_ORDER = ["Status", "Closed", "Archived", "Game", "Event", ...BRIEF_KEYS.map(k => k[0].toUpperCase() + k.slice(1))];

/** Adds, replaces or (empty value) removes one header line, keeping the order Status, Closed, Archived, Game, Event, then the brief keys. */
export function setHeader(text, key, value) {
  const at = HEADER_ORDER.indexOf(key);
  if (at < 0) throw new Error(`Not a header key: ${key}`);
  const cut = text.search(/^## /m);
  const head = (cut < 0 ? text : text.slice(0, cut)).split("\n"), tail = cut < 0 ? "" : text.slice(cut);
  const own = head.findIndex(r => r.startsWith(key + ":"));
  const v = String(value ?? "").replace(/\s+/g, " ").trim();
  if (own >= 0) {
    if (v) head[own] = `${key}: ${v}`; else head.splice(own, 1);
  } else if (v) {
    let after = head.findIndex(r => /^# /.test(r));
    head.forEach((r, i) => { const k = r.slice(0, r.indexOf(":")); if (HEADER_ORDER.indexOf(k) >= 0 && HEADER_ORDER.indexOf(k) < at) after = i; });
    head.splice(after + 1, 0, `${key}: ${v}`);
  }
  return head.join("\n") + tail;
}

export function formatLine(line) {
  return `- [${line.ticked ? "x" : " "}] ${line.id} ${line.title}${line.doneWhen ? ` (done when: ${line.doneWhen})` : ""}`;
}

/** Replaces one task's checklist line; every other byte stays as it was. */
export function replaceLine(text, line) {
  return text.split("\n").map(raw => {
    const m = LINE.exec(raw);
    return m && m[2] === line.id ? formatLine(line) : raw;
  }).join("\n");
}

/** Adds a checklist line at the end of the "## Tasks" section. */
export function appendLine(text, line) {
  const rows = text.split("\n");
  const head = rows.findIndex(r => /^## Tasks\s*$/.test(r));
  if (head < 0) return text.replace(/\n*$/, "\n\n## Tasks\n\n" + formatLine(line) + "\n");
  let end = rows.length, last = -1;
  for (let i = head + 1; i < rows.length; i++) {
    if (/^## /.test(rows[i])) { end = i; break; }
    if (/^- \[/.test(rows[i])) last = i;
  }
  if (last >= 0) {
    rows.splice(last + 1, 0, formatLine(line));
  } else {
    // Empty section: keep one blank line above the list and one below it.
    const at = rows[head + 1] === "" ? head + 2 : head + 1;
    const insert = at === head + 1 ? ["", formatLine(line)] : [formatLine(line)];
    if (at < rows.length && rows[at] !== "") insert.push("");
    rows.splice(at, 0, ...insert);
  }
  return rows.join("\n");
}

/** `extra` may carry `game`, `event` and `brief` (lower-case brief keys): the campaign lines written under Status. */
export function epicTemplate(id, name, status, extra = {}) {
  const campaign = (extra.game ? `Game: ${extra.game}\n` : "") + (extra.event ? `Event: ${extra.event}\n` : "");
  const brief = extra.brief ?? {};
  const keys = BRIEF_KEYS.filter(k => brief[k] || k === "goal");
  const briefLines = keys.map(k => `${k[0].toUpperCase() + k.slice(1)}: ${brief[k] || "<one sentence, the outcome for the user>"}\n`).join("");
  return `# ${id}: ${name}

Status: ${status}
${campaign}${briefLines}Design: Design.md, section <name>

## Tasks

## Test plan

## Notes

Decisions and deviations, newest first.

## Close audit

## For the standard
`;
}

export function parseTaskFile(text) {
  const fields = {};
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  let body = text;
  if (fm) {
    body = text.slice(fm[0].length);
    for (const row of fm[1].split("\n")) {
      const i = row.indexOf(":");
      if (i < 0) continue;
      const key = row.slice(0, i).trim(), value = row.slice(i + 1).trim();
      if (!FIELDS.includes(key) || value === "") continue;
      fields[key] = key === "rank" || key === "contact" ? Number(value) : value;
    }
  }
  const desc = /## Description\n([\s\S]*?)(?=\n## Comments|$)/.exec(body);
  fields.description = desc ? desc[1].trim() : "";
  fields.comments = [];
  const cm = /## Comments\n([\s\S]*)$/.exec(body);
  if (cm) {
    const parts = cm[1].split(/^### (.+?) · (ai|human)\s*$/m);
    for (let i = 1; i < parts.length; i += 3) {
      fields.comments.push({ at: parts[i].trim(), who: parts[i + 1], text: (parts[i + 2] || "").trim() });
    }
  }
  return fields;
}

export function formatTaskFile(task) {
  const fm = FIELDS.map(k => `${k}: ${task[k] ?? ""}`).join("\n");
  const comments = task.comments.map(c => `### ${c.at} · ${c.who}\n\n${c.text}\n`).join("\n");
  return `---\n${fm}\n---\n\n# ${task.id}: ${task.title}\n\n## Description\n\n${task.description || ""}\n\n## Comments\n\n${comments}`.replace(/\n+$/, "\n");
}
