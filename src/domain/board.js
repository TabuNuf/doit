// Board: the one facade the CLI and the server use. It knows the rules, not the files.
//
// The source it is given (the store's port) provides:
//   projects(), addProject({name, path, docs}), settings(), saveSettings(partial),
//   load(projectId, {archived}) -> {epics, files: Map<id, fields>, archivedIds: Set<id>},
//   writeTask(projectId, task), addLine(projectId, epicId, line), createEpic(projectId, name, status) -> epicId

import { STATES, OWNERS, TYPES, tabOf, sectionOf, parseRef, taskId, makeTask } from "./task.js";
import { archiveReason, byRank, rankBetween, stamp, DEFAULT_KEEP_DAYS } from "./rules.js";

export class Board {
  constructor(source, now = () => new Date()) {
    this.source = source;
    this.now = now;
  }

  projects() { return this.source.projects(); }

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
  sweep(projectIds = this.projects().map(p => p.id)) {
    const today = stamp(this.now()).slice(0, 10);
    const keep = this.settings().keepCompletedDays;
    let count = 0;
    for (const id of projectIds) {
      for (const task of this.#load(id, false).tasks) {
        const reason = archiveReason(task, today, keep);
        if (!reason) continue;
        this.#archive(task, reason);
        count++;
      }
    }
    return count;
  }

  /** Archives every task of an epic that is not archived yet, by the same path as the sweep. Returns how many. */
  closeEpic(project, epicId) {
    this.#requireProject(project);
    const loaded = this.#load(project, false);
    if (!loaded.epics.some(e => e.id === epicId && !e.completed)) throw new Error(`No open epic ${epicId} in ${project}`);
    const tasks = loaded.tasks.filter(t => t.epic === epicId && t.state !== "archived");
    for (const task of tasks) this.#archive(task, `Epic ${epicId} closed`);
    return tasks.length;
  }

  /** Everything the board page shows for one project or "all". */
  view({ project = "all", archived = false } = {}) {
    const ids = this.#projectIds(project);
    this.sweep(ids);
    const epics = [], tasks = [];
    for (const id of ids) {
      const loaded = this.#load(id, archived);
      for (const e of loaded.epics) {
        if (e.completed) continue;
        epics.push({ project: id, id: e.id, name: e.name, status: e.status, done: e.lines.filter(l => l.ticked).length, total: e.lines.length });
      }
      tasks.push(...loaded.tasks.filter(t => archived || t.state !== "archived"));
    }
    tasks.sort(byRank);
    return { projects: this.projects(), settings: this.settings(), epics, tasks };
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

  addTask({ project, epic, title, owner = "ai", type = "task", doneWhen = "", deadline = null, state = "todo", description = "", source = null }) {
    this.#requireProject(project);
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
      state, owner, type, deadline: deadline || null, description, source,
      rank: (ranks.length ? Math.max(...ranks) : 0) + 1000, created: now, updated: now,
    });
    this.#write(task);
    return task;
  }

  update(ref, changes) {
    const task = this.get(ref);
    const now = stamp(this.now());
    for (const [key, value] of Object.entries(changes)) {
      switch (key) {
        case "state": this.#changeState(task, value, now); break;
        case "owner": check(OWNERS, value, "owner"); task.owner = value; break;
        case "type": check(TYPES, value, "type"); task.type = value; break;
        case "deadline":
          if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Deadline must be YYYY-MM-DD");
          task.deadline = value || null;
          break;
        case "rank":
          if (!Number.isFinite(Number(value))) throw new Error("Rank must be a number");
          task.rank = Number(value);
          break;
        case "title": if (!String(value).trim()) throw new Error("A task needs a title"); task.title = oneLine(value); break;
        case "doneWhen": task.doneWhen = oneLine(value); break;
        case "description": task.description = String(value); break;
        default: throw new Error(`Unknown field: ${key}`);
      }
    }
    task.updated = now;
    task.created ||= now;
    this.#write(task);
    return task;
  }

  /**
   * Moves a task into a section of the Open tab: just above `before`, just below `after`,
   * or to the top when neither is given. The neighbour must be in the same project.
   */
  move(ref, { section, before, after } = {}) {
    check(["active", "backlog"], section, "section");
    const { project } = parseRef(ref);
    const task = this.get(ref);
    if (task.state === "done" || task.state === "archived") throw new Error("Only open tasks can be moved");
    const list = this.#load(project, false).tasks
      .filter(t => t.id !== task.id && sectionOf(t.state) === section && tabOf(t.state) === "open")
      .sort(byRank);
    let i = 0;
    const anchor = before || after;
    if (anchor) {
      const parts = parseRef(anchor);
      if (parts.project !== project) throw new Error("A task can only move next to a task of its project");
      i = list.findIndex(t => t.id === parts.id);
      if (i < 0) throw new Error(`${anchor} is not in ${section}`);
      if (!before) i++;
    }
    const changes = { rank: rankBetween(list[i - 1]?.rank, list[i]?.rank) };
    if (sectionOf(task.state) !== section) changes.state = section === "backlog" ? "backlog" : "todo";
    return this.update(ref, changes);
  }

  comment(ref, who, text) {
    check(OWNERS, who, "author");
    if (!text || !String(text).trim()) throw new Error("A comment needs text");
    const task = this.get(ref);
    const now = stamp(this.now());
    task.comments = [...task.comments, { at: now, who, text: String(text).trim() }];
    task.updated = now;
    task.created ||= now;
    this.#write(task);
    return task;
  }

  addEpic(project, name, status = "Planned") {
    this.#requireProject(project);
    if (!name || !name.trim()) throw new Error("An epic needs a name");
    check(["Parked", "Planned", "Active"], status, "status");
    return this.source.createEpic(project, name.trim(), status);
  }

  #changeState(task, state, now) {
    check(STATES, state, "state");
    if (state === task.state) return;
    if (state === "done") { task.completed = now; task.ticked = true; task.archived = null; }
    else if (state === "archived") { task.archived = "Archived by hand"; }
    else { task.completed = null; task.ticked = false; task.archived = null; }
    task.state = state;
  }

  #archive(task, reason) {
    task.state = "archived";
    task.archived = reason;
    this.#write(task);
  }

  #write(task) { this.source.writeTask(task.project, task); }

  #load(projectId, archived) {
    const { epics, files, archivedIds } = this.source.load(projectId, { archived });
    const tasks = [];
    for (const epic of epics) {
      for (const line of epic.lines) {
        if (!archived && archivedIds.has(line.id)) continue;
        tasks.push(makeTask(projectId, epic, line, files.get(line.id) || null));
      }
    }
    return { epics, tasks };
  }

  #projectIds(project) {
    if (project === "all") return this.projects().map(p => p.id);
    this.#requireProject(project);
    return [project];
  }

  #requireProject(id) {
    if (!this.projects().some(p => p.id === id)) throw new Error(`No project ${id}`);
  }
}

function matchesState(actual, wanted) {
  if (wanted === "open") return tabOf(actual) === "open";
  if (wanted === "active") return actual === "todo" || actual === "progress";
  return actual === wanted;
}

function check(allowed, value, name) {
  if (!allowed.includes(value)) throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
}

function oneLine(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}
