// FileSource: the store's side of the Board's port. Joins the settings file and each
// project's files, and turns text into values with markdown.js.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ProjectFiles } from "./projectFiles.js";
import { parseEpic, replaceLine, appendLine, parseTaskFile, formatTaskFile } from "./markdown.js";

export class FileSource {
  constructor(settingsFile) {
    this.settingsFile = settingsFile;
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
    const files = this.#files(projectId);
    const epics = [];
    for (const { file, completed } of files.epicFiles({ archived })) {
      const epic = parseEpic(files.read(file));
      if (epic) epics.push({ ...epic, completed });
    }
    const tasks = new Map();
    for (const id of files.taskIds()) tasks.set(id, parseTaskFile(files.read(files.taskPath(id, false))));
    const archivedIds = new Set(files.archivedIds());
    if (archived) for (const id of archivedIds) tasks.set(id, parseTaskFile(files.read(files.taskPath(id, true))));
    return { epics, files: tasks, archivedIds };
  }

  /** Writes the task file where its state says, removes the old copy, and syncs the epic line. */
  writeTask(projectId, task) {
    const files = this.#files(projectId);
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
    const files = this.#files(projectId);
    const file = files.epicFile(epicId);
    if (!file) throw new Error(`No epic file for ${epicId}`);
    files.write(file, appendLine(files.read(file), line));
  }

  createEpic(projectId, name, status) {
    return this.#files(projectId).createEpic(name, status);
  }

  #files(projectId) {
    const p = this.projects().find(x => x.id === projectId);
    if (!p) throw new Error(`No project ${projectId}`);
    if (!fs.existsSync(p.path)) throw new Error(`Project folder is missing: ${p.path}`);
    return new ProjectFiles(p.path, p.docs);
  }
}
