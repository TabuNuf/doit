// ClaudeView: what Claude is working on, what waits on Tabu and what changed, from task data
// and the activity log only. The facade the interfaces use for the Claude view.

import { daysBetween, stamp } from "./rules.js";

/** AI tasks In progress, in rank order. */
export const workingOn = tasks => tasks.filter(t => t.owner === "ai" && t.state === "progress");

/** AI To-do tasks, in rank order. */
export const upNext = tasks => tasks.filter(t => t.owner === "ai" && t.state === "todo");

/** Human To-do tasks that name the task they hold up. */
export const blockedOnYou = tasks => tasks.filter(t => t.owner === "human" && t.state === "todo" && t.blocks);

/** Human open tasks with a deadline 7 days away or nearer, soonest first: the Board's "due within 7 days" filter on 🧑 tasks. */
export const dueSoon = (tasks, today) => tasks
  .filter(t => t.owner === "human" && ["todo", "progress", "backlog"].includes(t.state) && t.deadline && daysBetween(today, t.deadline) <= 7)
  .sort((a, b) => a.deadline.localeCompare(b.deadline));

/** The morning report's lines: a heading, then swept, In progress, top three Up next, Blocked on you, due within 7 days. */
export function morningReport({ swept, tasks, today }) {
  const ref = t => `${t.project}/${t.id} ${t.title}`;
  const part = (label, items) => items.length ? `${label} ${items.length}: ${items.join("; ")}` : `${label}: none`;
  const next = upNext(tasks);
  return [
    `Morning report ${today}`,
    part("Swept", swept),
    part("In progress", workingOn(tasks).map(ref)),
    next.length > 3 ? `Up next, top 3 of ${next.length}: ${next.slice(0, 3).map(ref).join("; ")}` : part("Up next", next.map(ref)),
    part("Blocked on you", blockedOnYou(tasks).map(t => `${ref(t)} (blocks ${t.blocks})`)),
    part("Due within 7 days", dueSoon(tasks, today).map(t => `${ref(t)} (due ${t.deadline})`)),
  ];
}

export class ClaudeView {
  constructor(board, activity, now = () => new Date()) {
    this.board = board;
    this.activity = activity;
    this.now = now;
  }

  /** Sweeps, then writes the morning report across all projects to the activity log as one block. Changes nothing else. Returns its lines. */
  morning() {
    const swept = this.board.sweepTasks();
    const { tasks } = this.board.view({ project: "all" });
    const lines = morningReport({ swept, tasks, today: stamp(this.now()).slice(0, 10) });
    this.activity.record(...lines.map(what => ({ ref: "morning", what })));
    return lines;
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
