// TaskMover: where a task goes in the Open tab. Pure: given the task and its project's
// tasks, it returns the changes (rank, maybe state) for Board to apply.

import { tabOf, sectionOf, parseRef } from "./task.js";
import { byRank, rankBetween } from "./rules.js";

export class TaskMover {
  /**
   * Placement just above `before`, just below `after`, or at the top when neither is given.
   * The neighbour must be in the same project. Returns {rank, state?}.
   */
  plan(task, projectTasks, { section, before, after } = {}) {
    if (!["active", "backlog"].includes(section)) throw new Error("section must be one of: active, backlog");
    if (task.state === "done" || task.state === "archived") throw new Error("Only open tasks can be moved");
    const list = projectTasks
      .filter(t => t.id !== task.id && sectionOf(t.state) === section && tabOf(t.state) === "open")
      .sort(byRank);
    let i = 0;
    const anchor = before || after;
    if (anchor) {
      const parts = parseRef(anchor);
      if (parts.project !== task.project) throw new Error("A task can only move next to a task of its project");
      i = list.findIndex(t => t.id === parts.id);
      if (i < 0) throw new Error(`${anchor} is not in ${section}`);
      if (!before) i++;
    }
    const changes = { rank: rankBetween(list[i - 1]?.rank, list[i]?.rank) };
    if (sectionOf(task.state) !== section) changes.state = section === "backlog" ? "backlog" : "todo";
    return changes;
  }
}
