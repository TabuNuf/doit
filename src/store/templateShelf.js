// TemplateShelf: the mail templates, `Docs/Templates/<name>.md` in the marketing project (settings key
// `marketingProject`, as for profiles). Parsing is the domain's; this only reads text.

import fs from "node:fs";
import path from "node:path";

const DEFAULT_PROJECT = "polyspice-marketing";
const usable = name => /^[\w][\w .-]*$/.test(name) && !name.includes("..");

export class TemplateShelf {
  constructor(settingsFile) { this.settingsFile = settingsFile; }

  list() {
    const dir = this.#dir();
    if (!dir || !fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => f.endsWith(".md") && !f.startsWith(".")).map(f => f.slice(0, -3)).sort();
  }

  /** The file's text, or null when there is no such template. */
  read(name) {
    const dir = this.#dir();
    if (!dir || !usable(String(name))) return null;
    try { return fs.readFileSync(path.join(dir, name + ".md"), "utf8"); } catch (e) { if (e.code === "ENOENT") return null; throw e; }
  }

  #dir() {
    const settings = this.settingsFile.read();
    const p = settings.projects.find(x => x.id === (settings.marketingProject || DEFAULT_PROJECT));
    return p ? path.join(p.path, p.docs, "Templates") : null;
  }
}
