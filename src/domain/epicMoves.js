// EpicMoves: closes an epic and moves it between open, parked, completed and archived.
// planEpicMove is pure (epic and tasks in, plan out); the class carries the plan out on the source.

import { epicArchived, stamp } from "./rules.js";

export class EpicMoves {
  /** `write(task, what)` writes a task and tells the activity log; the Board hands it in. */
  constructor(source, now, write) {
    this.source = source;
    this.now = now;
    this.write = write;
  }

  /** Archives every task of an epic not archived yet (the sweep's path), then completes the epic. Returns how many tasks. */
  close(project, epicId, archived, { epics, tasks }) {
    if (!epics.some(e => e.id === epicId && !e.completed)) throw new Error(`No open epic ${epicId} in ${project}`);
    const epic = epics.find(e => e.id === epicId);
    const wait = epic.check && tasks.find(t => t.id === epic.check);
    if (wait && wait.state !== "done" && wait.state !== "archived") throw new Error(`${epicId} waits for ${wait.id}, Check in play. Finish it, then close.`);
    const open = tasks.filter(t => t.epic === epicId && t.state !== "archived");
    for (const task of open) this.write({ ...task, state: "archived", archived: `Epic ${epicId} closed` }, `archived: Epic ${epicId} closed`);
    const today = this.#today();
    this.source.completeEpic(project, epicId, today, archived ? today : null);
    return open.length;
  }

  /** Moves the epic to open, parked, completed or archived; `loaded` holds every epic and task, archived ones too. */
  move(project, epicId, to, { epics, tasks }, keepDays) {
    const epic = epics.find(e => e.id === epicId);
    if (!epic) throw new Error(`No epic ${epicId} in ${project}`);
    const today = this.#today();
    const { action, restore } = planEpicMove(epic, to, tasks, today, keepDays);
    const result = { moved: action !== "none", restoredTasks: restore.length, archivedTasks: 0 };
    const closed = archived => this.close(project, epicId, archived, { epics, tasks });
    switch (action) {
      case "park": this.source.parkEpic(project, epicId); break;
      case "reopen":
        this.source.reopenEpic(project, epicId);
        for (const task of restore) this.write(task, `reopened with ${epicId}: state archived → ${task.state}`);
        break;
      case "close": result.archivedTasks = closed(false); break;
      case "closeArchived": result.archivedTasks = closed(true); break;
      case "archive": this.source.setEpicArchived(project, epicId, today); break;
      case "unarchive": this.source.setEpicArchived(project, epicId, null); break;
    }
    return result;
  }

  #today() { return stamp(this.now()).slice(0, 10); }
}

export const PLACES = ["open", "parked", "completed", "archived"];

/** Where an epic is now. An epic closed past the retention, or without a close date, counts as archived. */
export function placeOf(epic, today, keepDays) {
  if (!epic.completed) return epic.parked ? "parked" : "open";
  return epic.archivedOn || epicArchived(epic.closed, today, keepDays) ? "archived" : "completed";
}

/**
 * The plan for moving `epic` to `to`: {action, restore}. action is none, park, reopen, close,
 * closeArchived, archive or unarchive; restore lists the epic's tasks to write back on a reopen.
 * Throws a message when the move is refused.
 */
export function planEpicMove(epic, to, tasks, today, keepDays) {
  if (!PLACES.includes(to)) throw new Error(`to must be one of: ${PLACES.join(", ")}`);
  const from = placeOf(epic, today, keepDays);
  const plan = (action, restore = []) => ({ action, restore });
  if (from === to) return plan("none");
  const closed = from === "completed" || from === "archived";
  switch (to) {
    case "parked":
      if (from !== "open") throw new Error(`${epic.id} is ${from}; reopen it before parking`);
      if (epic.status !== "Planned") throw new Error(`${epic.id} is ${epic.status}, and only a Planned epic can be parked`);
      return plan("park");
    case "open":
      return closed ? plan("reopen", restored(epic, tasks)) : plan("reopen");
    case "completed":
      if (from === "archived") {
        if (!epic.archivedOn) throw new Error(`${epic.id} is archived by date, not by an Archived line`);
        return plan("unarchive");
      }
      return plan("close");
    default:
      return plan(closed ? "archive" : "closeArchived");
  }
}

/** The tasks the close archived, back as done (ticked, completed date kept) or to-do. */
function restored(epic, tasks) {
  const reason = `Epic ${epic.id} closed`;
  return tasks.filter(t => t.epic === epic.id && t.state === "archived" && t.archived === reason).map(t => {
    if (t.ticked) return { ...t, state: "done", archived: null };
    return { ...t, state: "todo", completed: null, archived: null };
  });
}
