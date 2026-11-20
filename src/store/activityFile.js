// ActivityFile: the activity log's lines in `activity.log` in the app's data folder.

import fs from "node:fs";
import path from "node:path";

export class ActivityFile {
  constructor(dir) {
    this.file = path.join(dir, "activity.log");
  }

  lines() {
    try { return fs.readFileSync(this.file, "utf8").split("\n").filter(Boolean); } catch (err) {
      if (err.code === "ENOENT") return [];
      throw new Error(`Cannot read ${this.file}: ${err.message}`);
    }
  }

  /** Adds lines at the end; one write, so the CLI and the server do not interleave a line. */
  append(lines) {
    if (!lines.length) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.appendFileSync(this.file, lines.join("\n") + "\n");
  }

  /** Rewrites the whole file, through a temporary file so a reader never sees half of it. */
  replace(lines) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + ".tmp-" + process.pid;
    fs.writeFileSync(tmp, lines.length ? lines.join("\n") + "\n" : "");
    fs.renameSync(tmp, this.file);
  }
}
