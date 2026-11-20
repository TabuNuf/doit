// FileSource: the store's side of the Board's port. Joins the settings file and each
// project's files, and turns text into values with markdown.js. An epic with a worktree
// on its branch has its epic file and task files read and written in that worktree.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ProjectFiles } from "./projectFiles.js";
import { taskParts } from "../domain/task.js";
import { parseEpic, replaceLine, appendLine, parseTaskFile, formatTaskFile, setStatus } from "./markdown.js";

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

  load(projectId, { archived }) {
    const { main, branches } = this.#layout(projectId);
    const own = id => branches.get(epicOf(id)) || main;
    const epics = [];
    for (const { file, completed } of main.epicFiles({ archived })) {
      let epic = parseEpic(main.read(file));
      if (!epic) continue;
      const branch = branches.get(epic.id);
      if (branch) epic = parseEpic(branch.read(branch.epicFile(epic.id, { archived: true })));
      if (epic) epics.push({ ...epic, completed });
    }
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

  /** Sets the epic Done and moves its file to Epics/Completed/. */
  completeEpic(projectId, epicId) {
    const files = this.#files(projectId, epicId);
    const file = files.epicFile(epicId);
    if (!file) throw new Error(`No epic file for ${epicId}`);
    files.moveToCompleted(file, setStatus(files.read(file), "Done"));
  }

  createEpic(projectId, name, status) {
    return this.#files(projectId).createEpic(name, status);
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
