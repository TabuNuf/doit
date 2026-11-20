// ClaudeView: what Claude is working on, what waits on Tabu and what changed, from task data
// and the activity log only. The facade the interfaces use for the Claude view.

import { daysBetween } from "./rules.js";

/** AI tasks In progress, in rank order. */
export const workingOn = tasks => tasks.filter(t => t.owner === "ai" && t.state === "progress");

/** AI To-do tasks, in rank order. */
export const upNext = tasks => tasks.filter(t => t.owner === "ai" && t.state === "todo");

/** Human To-do tasks that name the task they hold up. */
export const blockedOnYou = tasks => tasks.filter(t => t.owner === "human" && t.state === "todo" && t.blocks);

/** Human open tasks with a deadline 7 days away or nearer: the Board's "due within 7 days" filter on 🧑 tasks. */
export const dueSoon = (tasks, today) => tasks.filter(t =>
  t.owner === "human" && ["todo", "progress", "backlog"].includes(t.state) && t.deadline && daysBetween(today, t.deadline) <= 7);

export class ClaudeView {
  constructor(board, activity) {
    this.board = board;
    this.activity = activity;
  }

  /** The three panes for one project or "all"; each card carries its last logged change. */
  panes(project = "all") {
    const { tasks } = this.board.view({ project });
    const log = this.activity.recent({ project });
    const last = new Map();
    for (const e of log) if (!last.has(e.ref)) last.set(e.ref, e);
    const card = t => {
      const e = last.get(`${t.project}/${t.id}`);
      return { project: t.project, id: t.id, title: t.title, blocks: t.blocks, deadline: t.deadline,
        last: e ? { at: e.at, what: e.what } : { at: t.updated, what: t.updated ? "updated" : "" } };
    };
    return {
      working: workingOn(tasks).map(card),
      blocked: blockedOnYou(tasks).map(card),
      upNext: upNext(tasks).map(card),
      log,
    };
  }
}
