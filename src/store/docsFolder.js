// DocsFiles: the DocsSource port on disk. Reads and writes one project's Markdown documents in
// its docs folder (the project folder, never an epic worktree) and asks git who changed one last.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DocsError } from "../domain/docs.js";

const LEFT_OUT = new Set(["Archive", "Epics/Tasks", "Standard"]);
const FOLDED = new Set(["Epics/Completed"]);

export class DocsFiles {
  constructor(settingsFile) { this.settingsFile = settingsFile; }

  /** Nested folders and .md files: folders first, then by name; folded ones are listed but closed. */
  tree(projectId) {
    const { root } = this.#project(projectId);
    const walk = rel => {
      const entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true }).filter(e => !e.name.startsWith("."));
      const folders = [], files = [];
      for (const e of entries) {
        const p = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) {
          if (LEFT_OUT.has(p)) continue;
          const children = walk(p);
          if (children.length || FOLDED.has(p)) folders.push({ type: "folder", name: e.name, path: p, ...(FOLDED.has(p) ? { folded: true } : {}), children });
        } else if (e.isFile() && e.name.endsWith(".md")) files.push({ type: "file", name: e.name, path: p });
      }
      const byName = (a, b) => a.name.localeCompare(b.name);
      return [...folders.sort(byName), ...files.sort(byName)];
    };
    return walk("");
  }

  /** The document's text, or null when there is no such file. */
  read(projectId, rel) {
    const file = this.#inside(projectId, rel);
    return fs.existsSync(file) && fs.statSync(file).isFile() ? fs.readFileSync(file, "utf8") : null;
  }

  /** Writes an existing or new .md file; never creates a folder. */
  write(projectId, rel, text) {
    const file = this.#inside(projectId, rel);
    if (!fs.existsSync(path.dirname(file))) throw new DocsError(`No folder for ${rel}`);
    const tmp = file + ".tmp-" + process.pid;
    fs.writeFileSync(tmp, text);
    fs.renameSync(tmp, file);
  }

  /** Author and date of the last commit that touched the file; null when uncommitted or not in git. */
  lastChange(projectId, rel) {
    const { project } = this.#project(projectId);
    try {
      const out = execFileSync("git", ["log", "-1", "--format=%an%x09%aI", "--", this.#inside(projectId, rel)],
        { cwd: project.path, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      if (!out) return null;
      const [author, date] = out.split("\t");
      return { author, date };
    } catch { return null; }
  }

  #project(projectId) {
    const project = this.settingsFile.read().projects.find(p => p.id === projectId);
    if (!project) throw new DocsError(`No project ${projectId}`);
    const root = path.join(project.path, project.docs);
    if (!fs.existsSync(root)) throw new DocsError(`Docs folder is missing: ${root}`, 404);
    return { project, root };
  }

  /** The absolute path of a relative document path, checked again to stay under the docs root. */
  #inside(projectId, rel) {
    const { root } = this.#project(projectId);
    const file = path.resolve(root, rel);
    const within = (base, p) => p.startsWith(base + path.sep);
    if (!within(path.resolve(root), file)) throw new DocsError(`Path must be inside the docs folder: ${rel}`);
    // A link out of the folder is followed to where it really points. A missing folder holds
    // nothing to follow: read finds no file and write refuses.
    const dir = path.dirname(file);
    const real = fs.existsSync(file) ? fs.realpathSync(file) : fs.existsSync(dir) ? path.join(fs.realpathSync(dir), path.basename(file)) : null;
    if (real && !within(fs.realpathSync(root), real)) throw new DocsError(`Path must be inside the docs folder: ${rel}`);
    return file;
  }
}
