// One project's docs folder on disk: epic files, task files and the archive.

import fs from "node:fs";
import path from "node:path";
import { epicTemplate } from "./markdown.js";

export class ProjectFiles {
  constructor(root, docs) {
    this.dir = path.join(root, docs);
    this.epics = path.join(this.dir, "Epics");
    this.tasks = path.join(this.epics, "Tasks");
    this.archive = path.join(this.dir, "Archive", "Tasks");
  }

  /** Epic files in Epics/ and Parked/, plus Completed/ when archived is asked for. */
  epicFiles({ archived = false } = {}) {
    const out = [];
    const scan = (dir, completed) => {
      for (const name of listDir(dir)) if (/^EPIC-\d+.*\.md$/.test(name)) out.push({ file: path.join(dir, name), completed });
    };
    scan(this.epics, false);
    scan(path.join(this.epics, "Parked"), false);
    if (archived) scan(path.join(this.epics, "Completed"), true);
    return out;
  }

  epicFile(epicId) {
    return this.epicFiles().map(e => e.file).find(f => path.basename(f).startsWith(epicId + "-") || path.basename(f) === epicId + ".md") || null;
  }

  taskIds() { return listDir(this.tasks).filter(n => n.endsWith(".md")).map(n => n.slice(0, -3)); }
  archivedIds() { return listDir(this.archive).filter(n => n.endsWith(".md")).map(n => n.slice(0, -3)); }

  taskPath(id, archived) { return path.join(archived ? this.archive : this.tasks, id + ".md"); }

  read(file) { return fs.readFileSync(file, "utf8"); }

  /** Writes through a temporary file so a reader never sees half a file. */
  write(file, text) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + ".tmp-" + process.pid;
    fs.writeFileSync(tmp, text);
    fs.renameSync(tmp, file);
  }

  remove(file) { fs.rmSync(file, { force: true }); }

  nextEpicNumber() {
    const nums = this.epicFiles({ archived: true }).map(e => Number(/EPIC-(\d+)/.exec(path.basename(e.file))[1]));
    return (nums.length ? Math.max(...nums) : 0) + 1;
  }

  createEpic(name, status) {
    const id = "EPIC-" + String(this.nextEpicNumber()).padStart(3, "0");
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "epic";
    const dir = status === "Parked" ? path.join(this.epics, "Parked") : this.epics;
    this.write(path.join(dir, `${id}-${slug}.md`), epicTemplate(id, name, status));
    return id;
  }

  /** Creates the folders a project needs; never overwrites. Returns true when it had no epics. */
  scaffold() {
    for (const d of [this.tasks, path.join(this.epics, "Parked"), path.join(this.epics, "Completed")]) fs.mkdirSync(d, { recursive: true });
    return this.epicFiles({ archived: true }).length === 0;
  }
}

function listDir(dir) {
  try { return fs.readdirSync(dir).sort(); } catch { return []; }
}
