// ActivityLog: one line per task change, "YYYY-MM-DD HH:MM  <project/T-id>  <what changed>".
// Lines older than KEEP_DAYS are dropped whenever a line is written. Pure apart from its port.
//
// The port (the store's activity file) provides: lines() -> string[], append(lines), replace(lines).

import { daysBetween, stamp } from "./rules.js";

export const KEEP_DAYS = 30;
const LINE = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})  (\S+)  (.*)$/;

export class ActivityLog {
  constructor(file, now = () => new Date()) {
    this.file = file;
    this.now = now;
  }

  /** Writes one line per entry {ref, what}, all with the same time; drops lines past KEEP_DAYS. */
  record(...entries) {
    const at = stamp(this.now());
    const added = entries.map(e => `${at}  ${e.ref}  ${oneLine(e.what)}`);
    const today = at.slice(0, 10);
    const old = this.file.lines();
    const kept = old.filter(l => fresh(l, today));
    if (kept.length === old.length) this.file.append(added);
    else this.file.replace([...kept, ...added]);
  }

  /** Entries {at, ref, what}, newest first; lines written in the same minute keep their order, so a block reads top down. `project` keeps that project's tasks and lines not about a task. */
  recent({ project = "all", limit = 200 } = {}) {
    const groups = [];
    for (const line of this.file.lines()) {
      const m = LINE.exec(line);
      if (!m || (project !== "all" && m[2].includes("/") && !m[2].startsWith(project + "/"))) continue;
      const e = { at: m[1], ref: m[2], what: m[3] };
      const last = groups[groups.length - 1];
      if (last && last[0].at === e.at) last.push(e); else groups.push([e]);
    }
    return groups.reverse().flat().slice(0, limit);
  }
}

function fresh(line, today) {
  const m = LINE.exec(line);
  return Boolean(m) && daysBetween(m[1], today) <= KEEP_DAYS;
}

/** What changed between two copies of a task, in words, or "" when nothing did. */
export function describeChanges(before, after) {
  const parts = [];
  const was = k => before[k] ?? "", now = k => after[k] ?? "";
  if (was("state") !== now("state")) parts.push(`state ${before.state} → ${after.state}`);
  for (const k of ["owner", "type"]) if (was(k) !== now(k)) parts.push(`${k} ${after[k]}`);
  if (was("deadline") !== now("deadline")) parts.push(after.deadline ? `deadline ${after.deadline}` : "deadline cleared");
  if (was("blocks") !== now("blocks")) parts.push(after.blocks ? `blocks ${after.blocks}` : "blocks cleared");
  if (was("rank") !== now("rank")) parts.push("moved");
  if (was("title") !== now("title")) parts.push("title changed");
  if (was("doneWhen") !== now("doneWhen")) parts.push("done-when changed");
  if (was("description") !== now("description")) parts.push("description changed");
  return parts.join(", ");
}

function oneLine(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}
