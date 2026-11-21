// ChangeWatcher: tells listeners when files the board shows change on disk. Watches the data folder,
// each project's docs folder and each epic worktree's docs folder; many events become one.

import fs from "node:fs";
import path from "node:path";

export class ChangeWatcher {
  /** `home` is the data folder. `debounce` and `rescan` are in ms (rescan finds new worktrees). */
  constructor(settingsFile, worktrees, home, { debounce = 300, rescan = 5000 } = {}) {
    this.settingsFile = settingsFile;
    this.worktrees = worktrees;
    this.home = home;
    this.debounce = debounce;
    this.listeners = new Set();
    this.watchers = new Map();
    this.timer = null;
    this.closed = false;
    this.#sync();
    this.poll = setInterval(() => this.#sync(), rescan);
    this.poll.unref();
  }

  /** Calls `listener()` after each burst of changes; returns the function that stops it. */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    this.closed = true;
    clearInterval(this.poll);
    clearTimeout(this.timer);
    for (const w of this.watchers.values()) w.close();
    this.watchers.clear();
    this.listeners.clear();
  }

  /** Makes the set of watched folders match the folders that exist now. */
  #sync() {
    if (this.closed) return;
    const wanted = new Set(this.#folders().filter(d => fs.existsSync(d)));
    for (const [dir, w] of this.watchers) {
      if (!wanted.has(dir)) { w.close(); this.watchers.delete(dir); }
    }
    for (const dir of wanted) if (!this.watchers.has(dir)) this.#watch(dir);
  }

  #folders() {
    const out = [this.home];
    let projects = [];
    try { projects = this.settingsFile.read().projects; } catch { /* unreadable settings: watch what we can */ }
    for (const p of projects) {
      out.push(path.join(p.path, p.docs));
      for (const { root } of this.worktrees.find(p.path)) out.push(path.join(root, p.docs));
    }
    return out;
  }

  #watch(dir) {
    try {
      const w = fs.watch(dir, { recursive: true }, (event, name) => this.#changed(dir, name));
      w.on("error", () => { w.close(); this.watchers.delete(dir); this.#sync(); });
      this.watchers.set(dir, w);
    } catch { /* folder vanished between the check and the watch */ }
  }

  #changed(dir, name) {
    if (this.closed) return;
    if (dir === this.home && String(name || "").startsWith("settings.json")) this.#sync();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { for (const l of [...this.listeners]) l(); }, this.debounce);
    this.timer.unref();
  }
}
