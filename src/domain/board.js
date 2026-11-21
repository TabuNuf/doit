// Board: the one facade the CLI and the server use. It knows the rules, not the files.
//
// The source it is given (the store's port) provides:
//   projects(), addProject({name, path, docs}), setStarred(projectId, bool) (a star pins it to the page's top bar), setKind(projectId, kind), settings(), saveSettings(partial),
//   load(projectId, {archived}) -> {epics, files: Map<id, fields>, archivedIds: Set<id>},
//   epicDocument(projectId, epicId) -> {id, name, status, completed, text} | null,
//   writeTask(projectId, task), addLine(projectId, epicId, line), createEpic(projectId, name, status, {game, event}) -> epicId (the campaign lines are optional),
//   closedEpics(projectId) -> [{id, name, status, closed, done, total}] for Epics/Completed/, closed "YYYY-MM-DD" or null,
//   completeEpic(projectId, epicId, closed, archived) sets the epic Done, writes its close date (and archive date) and files it as completed,
//   parkEpic(projectId, epicId), reopenEpic(projectId, epicId) (Planned, in Epics/, no Closed/Archived lines),
//   setEpicArchived(projectId, epicId, date|null) on a completed epic; load() epics carry completed, parked, archivedOn
// `subscribe(listener)`: a listener gets a plain fact when a task with a contact is done (the root hands it to Outreach).
// `record(ref, what)` is told every change to a task in words (the activity log); the root hands it in.

import { STATES, OWNERS, TYPES, tabOf, sectionOf, parseRef, taskId, makeTask, matchesState, check, checkContact, oneLine } from "./task.js";
import { applyChanges } from "./taskEdit.js";
import { archiveReason, epicArchived, byRank, stamp, checkKind, DEFAULT_KEEP_DAYS } from "./rules.js";
import { TaskMover } from "./mover.js";
import { EpicMoves } from "./epicMoves.js";
import { describeChanges } from "./activity.js";
import { loadTasks } from "./taskLoader.js";
import { DoneNotifier } from "./doneNotifier.js";

export class Board {
  constructor(source, now = () => new Date(), record = () => {}) {
    this.source = source;
    this.now = now;
    this.record = record;
    this.done = new DoneNotifier((fact, e) => record(fact.ref, `done follow-up failed: ${e.message}`));
    this.mover = new TaskMover();
    this.moves = new EpicMoves(source, now, (task, what) => this.#write(task, what));
  }

  projects() { return this.source.projects(); }
  starProject(id, starred) { this.#requireProject(id); return this.source.setStarred(id, Boolean(starred)); }
  setProjectKind(id, kind) { this.#requireProject(id); return this.source.setKind(id, checkKind(kind)); }

  /** Calls the listener with a plain fact when a task with a contact is done; returns the unsubscribe. */
  subscribe(listener) { return this.done.subscribe(listener); }

  settings() { return { keepCompletedDays: DEFAULT_KEEP_DAYS, ...this.source.settings() }; }

  setKeepDays(days) {
    const n = Number(days);
    if (!Number.isInteger(n) || n < 1 || n > 90) throw new Error("Keep days must be a whole number from 1 to 90");
    this.source.saveSettings({ keepCompletedDays: n });
  }

  addProject(input) {
    if (!input.name || !input.name.trim()) throw new Error("A project needs a name");
    if (!input.path || !input.path.trim()) throw new Error("A project needs a folder");
    return this.source.addProject({ name: input.name.trim(), path: input.path.trim(), docs: (input.docs || "Docs").trim() });
  }

  /** Archives what is past its deadline or past the completed retention. Returns how many. */
  sweep(projectIds) { return this.sweepTasks(projectIds).length; }

  /** The sweep, returning the refs it archived. */
  sweepTasks(projectIds = this.projects().map(p => p.id)) {
    const today = stamp(this.now()).slice(0, 10);
    const keep = this.settings().keepCompletedDays;
    const swept = [];
    for (const id of projectIds) {
      for (const task of this.#load(id, false).tasks) {
        const reason = archiveReason(task, today, keep);
        if (!reason) continue;
        this.#archive(task, reason);
        swept.push(`${id}/${task.id}`);
      }
    }
    return swept;
  }

  /** One epic's document as text, for reading. Any epic, parked and completed ones too. */
  epicDocument(project, epicId) {
    this.#requireProject(project);
    const doc = this.source.epicDocument(project, epicId);
    if (!doc) throw new Error(`No epic ${epicId} in ${project}`);
    return { project, ...doc };
  }

  /** Archives the epic's tasks and completes it; archived also writes its Archived line. Returns how many tasks. */
  closeEpic(project, epicId, archived = false) {
    this.#requireProject(project);
    return this.moves.close(project, epicId, archived, this.#load(project, false));
  }

  /** Moves an epic to open, parked, completed or archived. Returns {moved, restoredTasks, archivedTasks}. */
  moveEpic(project, epicId, to) {
    this.#requireProject(project);
    return this.moves.move(project, epicId, to, this.#load(project, true), this.settings().keepCompletedDays);
  }

  /** Everything the board page shows for one project or "all". */
  view({ project = "all", archived = false } = {}) {
    const ids = this.#projectIds(project);
    this.sweep(ids);
    const today = stamp(this.now()).slice(0, 10);
    const keep = this.settings().keepCompletedDays;
    const epics = [], parkedEpics = [], closedEpics = [], tasks = [];
    for (const id of ids) {
      for (const e of this.source.closedEpics(id)) closedEpics.push({ project: id, ...e, archived: !!e.archivedOn || epicArchived(e.closed, today, keep) });
      const loaded = this.#load(id, archived);
      for (const e of loaded.epics.filter(x => !x.completed)) (e.parked ? parkedEpics : epics).push({ project: id, id: e.id, name: e.name, status: e.status, game: e.game ?? null, event: e.event ?? null, done: e.lines.filter(l => l.ticked).length, total: e.lines.length });
      tasks.push(...loaded.tasks.filter(t => archived || t.state !== "archived"));
    }
    tasks.sort(byRank);
    closedEpics.sort((a, b) => (b.closed || "").localeCompare(a.closed || "") || b.id.localeCompare(a.id));
    return { projects: this.projects(), settings: this.settings(), epics, parkedEpics, closedEpics, tasks };
  }

  /** Tasks matching a filter. state: open (default), active, backlog, done, archived or a single state. */
  list({ project = "all", epic, state = "open", owner } = {}) {
    const archived = state === "archived";
    const { tasks } = this.view({ project, archived });
    return tasks.filter(t =>
      (!epic || t.epic === epic) &&
      (!owner || t.owner === owner) &&
      matchesState(t.state, state));
  }

  get(ref) {
    const { project, id } = parseRef(ref);
    this.#requireProject(project);
    const task = this.#load(project, true).tasks.find(t => t.id === id);
    if (!task) throw new Error(`No task ${ref}`);
    return task;
  }

  addTask({ project, epic, title, owner = "ai", type = "task", doneWhen = "", deadline = null, state = "todo", description = "", source = null, contact = null }) {
    this.#requireProject(project);
    const contactId = checkContact(contact);
    if (!title || !title.trim()) throw new Error("A task needs a title");
    check(OWNERS, owner, "owner"); check(TYPES, type, "type"); check(STATES, state, "state");
    const loaded = this.#load(project, true);
    const e = loaded.epics.find(x => x.id === epic && !x.completed);
    if (!e) throw new Error(`No open epic ${epic} in ${project}`);
    const n = Math.max(0, ...e.lines.map(l => l.n)) + 1;
    const id = taskId(epic, n);
    const line = { id, n, title: oneLine(title), doneWhen: oneLine(doneWhen), ticked: false };
    this.source.addLine(project, epic, line);
    const ranks = loaded.tasks.filter(t => tabOf(t.state) === "open" && sectionOf(t.state) === sectionOf(state)).map(t => t.rank);
    const now = stamp(this.now());
    const task = makeTask(project, e, line, {
      state, owner, type, deadline: deadline || null, description, source, contact: contactId,
      rank: (ranks.length ? Math.max(...ranks) : 0) + 1000, created: now, updated: now,
    });
    this.#write(task, `added (${owner}, ${state})`);
    return task;
  }

  update(ref, changes) {
    const task = this.get(ref);
    const before = { ...task };
    const now = stamp(this.now());
    applyChanges(task, changes, now);
    task.updated = now;
    task.created ||= now;
    this.#write(task, describeChanges(before, task));
    if (task.state === "done" && before.state !== "done") this.done.announce(task, now);
    return task;
  }

  /** Moves a task into a section of the Open tab; TaskMover decides the rank and state. */
  move(ref, placement = {}) {
    const { project } = parseRef(ref);
    const task = this.get(ref);
    return this.update(ref, this.mover.plan(task, this.#load(project, false).tasks, placement));
  }

  comment(ref, who, text) {
    check(OWNERS, who, "author");
    if (!text || !String(text).trim()) throw new Error("A comment needs text");
    const task = this.get(ref);
    const now = stamp(this.now());
    task.comments = [...task.comments, { at: now, who, text: String(text).trim() }];
    task.updated = now;
    task.created ||= now;
    this.#write(task, `comment by ${who}`);
    return task;
  }

  /** `options` is a status, or {status, game, event} for a campaign. */
  addEpic(project, name, options = "Planned") {
    const { status = "Planned", game = null, event = null } = typeof options === "string" ? { status: options } : options;
    this.#requireProject(project);
    if (!name || !name.trim()) throw new Error("An epic needs a name");
    check(["Parked", "Planned", "Active"], status, "status");
    return this.source.createEpic(project, name.trim(), status, { game, event });
  }

  #archive(task, reason) {
    task.state = "archived";
    task.archived = reason;
    this.#write(task, `archived: ${reason}`);
  }

  /** Writes the task file and tells the activity log what changed, when anything did. */
  #write(task, what) {
    this.source.writeTask(task.project, task);
    if (what) this.record(`${task.project}/${task.id}`, what);
  }

  #load(projectId, archived) { return loadTasks(this.source, projectId, archived); }

  #projectIds(project) {
    if (project === "all") return this.projects().map(p => p.id);
    this.#requireProject(project);
    return [project];
  }

  #requireProject(id) {
    if (!this.projects().some(p => p.id === id)) throw new Error(`No project ${id}`);
  }
}
