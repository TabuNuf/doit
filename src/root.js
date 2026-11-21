// Composition root: builds every module and hands the board to an interface.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Board } from "./domain/board.js";
import { ContactBook } from "./domain/contactBook.js";
import { Mailroom } from "./domain/mailroom.js";
import { ActivityLog } from "./domain/activity.js";
import { DocsLibrary } from "./domain/docs.js";
import { ClaudeView } from "./domain/claude.js";
import { Outreach } from "./domain/outreach.js";
import { DocsFiles } from "./store/docsFolder.js";
import { FileSource } from "./store/source.js";
import { ActivityFile } from "./store/activityFile.js";
import { SettingsFile } from "./store/settings.js";
import { MarketingDb } from "./store/marketingDb.js";
import { SqliteContacts } from "./store/sqliteContacts.js";
import { SqliteDrafts } from "./store/sqliteDrafts.js";
import { TemplateShelf } from "./store/templateShelf.js";
import { MailAccount } from "./store/mailAccount.js";
import { SmtpSender } from "./store/smtpSender.js";
import { ImapMailbox } from "./store/imapMailbox.js";
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

/** The contact book over `marketing.db` in `home` (or the given `db`) and the profiles of the marketing project. */
export function makeContacts({ home = dataDir(), now, db = new MarketingDb(home) } = {}) {
  return new ContactBook(new SqliteContacts(db), new ProfileShelf(new SettingsFile(home)), now);
}

/** The mailroom over the same `db` and `book` as the contacts (one marketing.db handle per process).
 *  `ports` overrides account, sender, mailbox or random, for tests. */
export function makeMailroom({ home = dataDir(), now, db, book, ports = {} }) {
  const settings = new SettingsFile(home);
  return new Mailroom({
    drafts: new SqliteDrafts(db), book, templates: new TemplateShelf(settings), account: new MailAccount(settings),
    sender: new SmtpSender(), mailbox: new ImapMailbox(), now, ...ports,
  });
}

/** The contact book and the mailroom, sharing one `marketing.db`. */
export function makeMarketing(options = {}) {
  const home = options.home ?? dataDir();
  const db = new MarketingDb(home);
  const book = makeContacts({ ...options, home, db });
  return { book, mailroom: makeMailroom({ ...options, home, db, book }) };
}

/** Outreach over the board and the book, listening for the board's done facts. */
export function makeOutreach({ board, book, now }) {
  const outreach = new Outreach(board, book, now);
  board.subscribe(fact => outreach.taskDone(fact));
  return outreach;
}

export function makeCli(options = {}) {
  const log = makeActivity(options);
  const board = makeBoard({ ...options, log });
  const readText = file => fs.readFileSync(file, "utf8");
  const { book, mailroom } = makeMarketing(options);
  const outreach = makeOutreach({ board, book, now: options.now });
  return new Cli(board, options.out || process.stdout, options.err || process.stderr, new ClaudeView(board, log, options.now, outreach), book, readText, mailroom, outreach);
}

export function makeServer(options = {}) {
  const webDir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "web");
  const log = makeActivity(options);
  const board = makeBoard({ ...options, log });
  const home = options.home ?? dataDir();
  const changes = new ChangeWatcher(new SettingsFile(home), new EpicWorktrees(), home);
  const { book, mailroom } = makeMarketing({ ...options, home });
  const outreach = makeOutreach({ board, book, now: options.now });
  return new HttpServer(board, webDir, options.commit ?? null, makeDocs({ home, board }), new ClaudeView(board, log, options.now, outreach), changes, book, mailroom, outreach);
}
