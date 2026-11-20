// Epic files and task files as text. Pure: text in, values out, and back.

const LINE = /^- \[( |x|X)\] (T-\d+\.\d+) (.*?)(?: \(done when: (.*)\))?\s*$/;
const FIELDS = ["state", "owner", "type", "rank", "deadline", "created", "updated", "completed", "source", "archived"];

export function parseEpic(text) {
  const head = /^# (EPIC-\d+):\s*(.*)$/m.exec(text);
  if (!head) return null;
  const status = /^Status:\s*(\w+)/m.exec(text);
  const lines = [];
  for (const raw of text.split("\n")) {
    const m = LINE.exec(raw);
    if (!m) continue;
    lines.push({ id: m[2], n: Number(m[2].split(".")[1]), title: m[3].trim(), doneWhen: (m[4] || "").trim(), ticked: m[1] !== " " });
  }
  return { id: head[1], name: head[2].trim(), status: status ? status[1] : "Planned", lines };
}

/** Sets the epic's Status line, adding one under the title when it has none. */
export function setStatus(text, status) {
  if (/^Status:.*$/m.test(text)) return text.replace(/^Status:.*$/m, `Status: ${status}`);
  return text.replace(/^(# EPIC-.*)$/m, `$1\n\nStatus: ${status}`);
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

export function epicTemplate(id, name, status) {
  return `# ${id}: ${name}

Status: ${status}
Goal: <one sentence, the outcome for the user>
Design: Design.md, section <name>

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
      fields[key] = key === "rank" ? Number(value) : value;
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
