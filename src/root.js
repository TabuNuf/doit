// Composition root: builds every module and hands the board to an interface.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Board } from "./domain/board.js";
import { ContactBook } from "./domain/contactBook.js";
import { ActivityLog } from "./domain/activity.js";
import { DocsLibrary } from "./domain/docs.js";
import { ClaudeView } from "./domain/claude.js";
import { DocsFiles } from "./store/docsFolder.js";
import { FileSource } from "./store/source.js";
import { ActivityFile } from "./store/activityFile.js";
import { SettingsFile } from "./store/settings.js";
import { MarketingDb } from "./store/marketingDb.js";
import { SqliteContacts } from "./store/sqliteContacts.js";
import { ProfileShelf } from "./store/profileShelf.js";
import { EpicWorktrees } from "./store/worktrees.js";
import { ChangeWatcher } from "./store/changeWatcher.js";
import { Cli } from "./cli/cli.js";
import { HttpServer } from "./server/server.js";

export function dataDir() {
  return process.env.DOIT_HOME || path.join(os.homedir(), "Library", "Application Support", "Doit");
}

export function makeActivity({ home = dataDir(), now } = {}) {
  return new ActivityLog(new ActivityFile(home), now);
}

/** The board, telling the activity log `log` (by default the one in `home`) every change it makes. */
export function makeBoard({ home = dataDir(), now, log = makeActivity({ home, now }) } = {}) {
  return new Board(new FileSource(new SettingsFile(home), new EpicWorktrees()), now, (ref, what) => log.record({ ref, what }));
}

export function makeDocs({ home = dataDir(), board }) {
  return new DocsLibrary(new DocsFiles(new SettingsFile(home)), board);
}

/** The contact book over `marketing.db` in `home` and the profiles of the marketing project. */
export function makeContacts({ home = dataDir(), now } = {}) {
  return new ContactBook(new SqliteContacts(new MarketingDb(home)), new ProfileShelf(new SettingsFile(home)), now);
}

export function makeCli(options = {}) {
  const log = makeActivity(options);
  const board = makeBoard({ ...options, log });
  const readText = file => fs.readFileSync(file, "utf8");
  return new Cli(board, options.out || process.stdout, options.err || process.stderr, new ClaudeView(board, log, options.now), makeContacts(options), readText);
}

export function makeServer(options = {}) {
  const webDir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "web");
  const log = makeActivity(options);
  const board = makeBoard({ ...options, log });
  const home = options.home ?? dataDir();
  const changes = new ChangeWatcher(new SettingsFile(home), new EpicWorktrees(), home);
  return new HttpServer(board, webDir, options.commit ?? null, makeDocs({ home, board }), new ClaudeView(board, log, options.now), changes, makeContacts({ ...options, home }));
}
