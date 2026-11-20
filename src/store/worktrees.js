// EpicWorktrees: finds the git worktrees on epic branches (epic/<nnn>-<name>) by reading
// .git/worktrees directly, so an active epic's files are read and written where its branch is.

import fs from "node:fs";
import path from "node:path";

export class EpicWorktrees {
  /** [{ epic: "EPIC-007", root }] where root is the folder's twin inside each epic worktree. */
  find(folder) {
    const repo = repoOf(folder);
    if (!repo) return [];
    const rel = path.relative(repo, folder);
    const dir = path.join(repo, ".git", "worktrees");
    const out = [];
    for (const name of listDir(dir)) {
      const head = /^ref: refs\/heads\/epic\/(\d+)-/m.exec(readText(path.join(dir, name, "HEAD")));
      const gitdir = readText(path.join(dir, name, "gitdir")).trim();
      if (!head || !gitdir) continue;
      const root = path.join(path.dirname(gitdir), rel);
      if (fs.existsSync(root)) out.push({ epic: "EPIC-" + head[1], root });
    }
    return out;
  }
}

/** The main checkout holding the folder: the nearest parent with a .git directory. */
function repoOf(folder) {
  for (let dir = path.resolve(folder); ; dir = path.dirname(dir)) {
    const git = path.join(dir, ".git");
    if (fs.existsSync(git)) return fs.statSync(git).isDirectory() ? dir : null;
    if (path.dirname(dir) === dir) return null;
  }
}

function readText(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return ""; }
}

function listDir(dir) {
  try { return fs.readdirSync(dir).sort(); } catch { return []; }
}
