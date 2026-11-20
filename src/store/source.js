// FileSource: the store's side of the Board's port. Joins the settings file and each
// project's files, and turns text into values with markdown.js. An epic with a worktree
// on its branch has its epic file and task files read and written in that worktree.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ProjectFiles } from "./projectFiles.js";
import { taskParts } from "../domain/task.js";
import { parseEpic, replaceLine, appendLine, parseTaskFile, formatTaskFile, setStatus, setClosed, setArchived } from "./markdown.js";

export class FileSource {
  constructor(settingsFile, worktrees) {
    this.settingsFile = settingsFile;
    this.worktrees = worktrees;
  }

  projects() { return this.settingsFile.read().projects; }

  settings() {
    const { projects, ...rest } = this.settingsFile.read();
    return rest;
  }

  saveSettings(partial) {
    this.settingsFile.write({ ...this.settingsFile.read(), ...partial });
  }

  addProject({ name, path: folder, docs }) {
    const root = path.resolve(folder.replace(/^~(?=$|\/)/, os.homedir()));
    const data = this.settingsFile.read();
    if (data.projects.some(p => p.path === root && p.docs === docs)) throw new Error(`${root} is already a project`);
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
    let id = base, i = 2;
    while (data.projects.some(p => p.id === id)) id = `${base}-${i++}`;
    const files = new ProjectFiles(root, docs);
    if (files.scaffold()) files.createEpic("Bugs (rolling)", "Active");
    const project = { id, name, path: root, docs };
    data.projects.push(project);
    this.settingsFile.write(data);
    return project;
  }

  /** Sets or clears a project's star (pinned to the top bar). */
  setStarred(projectId, starred) {
    const data = this.settingsFile.read();
    const project = data.projects.find(p => p.id === projectId);
    if (!project) throw new Error(`No project ${projectId}`);
    if (starred) project.starred = true; else delete project.starred;
    this.settingsFile.write(data);
    return project;
  }

  load(projectId, { archived }) {
    const { main, branches } = this.#layout(projectId);
    const own = id => branches.get(epicOf(id)) || main;
    const epics = this.#epics(main, branches);
    const tasks = new Map();
    const archivedIds = new Set();
    for (const files of [main, ...branches.values()]) {
      for (const id of files.taskIds()) if (own(id) === files) tasks.set(id, parseTaskFile(files.read(files.taskPath(id, false))));
      for (const id of files.archivedIds()) if (own(id) === files) archivedIds.add(id);
    }
    if (archived) for (const id of archivedIds) tasks.set(id, parseTaskFile(own(id).read(own(id).taskPath(id, true))));
    return { epics, files: tasks, archivedIds };
  }

  /** The epic's whole document, open, parked or completed; null when there is no such epic. */
  epicDocument(projectId, epicId) {
    const files = this.#files(projectId, epicId);
    const file = files.epicFile(epicId, { archived: true });
    if (!file) return null;
    const text = files.read(file);
    const epic = parseEpic(text);
    return epic && { id: epic.id, name: epic.name, status: epic.status, completed: file.includes(`${path.sep}Completed${path.sep}`), text };
  }

  /** Writes the task file where its state says, removes the old copy, and syncs the epic line. */
  writeTask(projectId, task) {
    const files = this.#files(projectId, task.epic);
    const archived = task.state === "archived";
    files.write(files.taskPath(task.id, archived), formatTaskFile(task));
    files.remove(files.taskPath(task.id, !archived));
    const epicFile = files.epicFile(task.epic);
    if (!epicFile) return;
    const text = files.read(epicFile);
    const line = parseEpic(text).lines.find(l => l.id === task.id);
    if (line && (line.ticked !== task.ticked || line.title !== task.title || line.doneWhen !== task.doneWhen)) {
      files.write(epicFile, replaceLine(text, { id: task.id, ticked: task.ticked, title: task.title, doneWhen: task.doneWhen }));
    }
  }

  addLine(projectId, epicId, line) {
    const files = this.#files(projectId, epicId);
    const file = files.epicFile(epicId);
    if (!file) throw new Error(`No epic file for ${epicId}`);
    files.write(file, appendLine(files.read(file), line));
  }

  /** The epics in Epics/Completed/, with their `Closed:` date (null when none). */
  closedEpics(projectId) {
    const { main, branches } = this.#layout(projectId);
    return this.#epics(main, branches, true).filter(e => e.completed)
      .map(e => ({ id: e.id, name: e.name, status: e.status, closed: e.closed, archivedOn: e.archivedOn, done: e.lines.filter(l => l.ticked).length, total: e.lines.length }));
  }

  /** The epics the main checkout lists, each read from its worktree when it has one; completed and parked
   *  follow the copy that was read, so an epic closed in its worktree counts as closed before the merge. */
  #epics(main, branches) {
    const out = [];
    for (const { file, completed, parked } of main.epicFiles({ archived: true })) {
      let epic = parseEpic(main.read(file)), done = completed, shelved = parked;
      if (!epic) continue;
      const branch = branches.get(epic.id);
      if (branch) {
        const own = branch.epicFile(epic.id, { archived: true });
        epic = parseEpic(branch.read(own));
        done = own.includes(`${path.sep}Completed${path.sep}`);
        shelved = own.includes(`${path.sep}Parked${path.sep}`);
      }
      if (epic) out.push({ ...epic, completed: done, parked: shelved });
    }
    return out;
  }

  /** Sets the epic Done, writes `Closed: <date>` (and `Archived: <date>` when archived is given) under its status and files it in Epics/Completed/. */
  completeEpic(projectId, epicId, closed, archived = null) {
    const { files, file } = this.#epicFile(projectId, epicId);
    files.moveToFolder(file, "Completed", setArchived(setClosed(setStatus(files.read(file), "Done"), closed), archived));
  }

  /** Sets or, with a null date, removes the `Archived:` line of an epic already in Completed/. */
  setEpicArchived(projectId, epicId, date) {
    const { files, file } = this.#epicFile(projectId, epicId, true);
    files.write(file, setArchived(files.read(file), date));
  }

  /** Sets the epic Parked and files it in Epics/Parked/. */
  parkEpic(projectId, epicId) {
    const { files, file } = this.#epicFile(projectId, epicId);
    files.moveToFolder(file, "Parked", setStatus(files.read(file), "Parked"));
  }

  /** Sets the epic Planned, drops its `Closed:` and `Archived:` lines and files it in Epics/ from Parked/ or Completed/. */
  reopenEpic(projectId, epicId) {
    const { files, file } = this.#epicFile(projectId, epicId, true);
    files.moveToFolder(file, "", setArchived(setClosed(setStatus(files.read(file), "Planned"), null), null));
  }

  createEpic(projectId, name, status) {
    return this.#files(projectId).createEpic(name, status);
  }

  #epicFile(projectId, epicId, anywhere = false) {
    const files = this.#files(projectId, epicId);
    const file = files.epicFile(epicId, { archived: anywhere });
    if (!file) throw new Error(`No epic file for ${epicId}`);
    return { files, file };
  }

  /** The project's files, or the epic worktree's when epicId has one. */
  #files(projectId, epicId) {
    const { main, branches } = this.#layout(projectId);
    return branches.get(epicId) || main;
  }

  /** The main checkout's files and, per epic with a worktree that holds its file, that worktree's. */
  #layout(projectId) {
    const p = this.projects().find(x => x.id === projectId);
    if (!p) throw new Error(`No project ${projectId}`);
    if (!fs.existsSync(p.path)) throw new Error(`Project folder is missing: ${p.path}`);
    const branches = new Map();
    for (const { epic, root } of this.worktrees.find(p.path)) {
      const files = new ProjectFiles(root, p.docs);
      if (files.epicFile(epic, { archived: true })) branches.set(epic, files);
    }
    return { main: new ProjectFiles(p.path, p.docs), branches };
  }
}

/** "T-007.1" -> "EPIC-007"; null for a file name that is not a task number. */
function epicOf(taskId) {
  try { return taskParts(taskId).epic; } catch { return null; }
}
