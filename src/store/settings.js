// The project list and app settings, in the app's data folder. Read fresh on every call,
// so the CLI and the server never hold a stale copy.

import fs from "node:fs";
import path from "node:path";

export class SettingsFile {
  constructor(dir) {
    this.file = path.join(dir, "settings.json");
  }

  read() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, "utf8"));
      return { projects: [], ...data };
    } catch (err) {
      if (err.code === "ENOENT") return { projects: [] };
      throw new Error(`Cannot read ${this.file}: ${err.message}`);
    }
  }

  write(data) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + ".tmp-" + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
    fs.renameSync(tmp, this.file);
  }
}
