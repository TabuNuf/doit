// Composition root: builds every module and hands the board to an interface.

import os from "node:os";
import path from "node:path";
import { Board } from "./domain/board.js";
import { FileSource } from "./store/source.js";
import { SettingsFile } from "./store/settings.js";
import { Cli } from "./cli/cli.js";
import { HttpServer } from "./server/server.js";

export function dataDir() {
  return process.env.DOIT_HOME || path.join(os.homedir(), "Library", "Application Support", "Doit");
}

export function makeBoard({ home = dataDir(), now } = {}) {
  return new Board(new FileSource(new SettingsFile(home)), now);
}

export function makeCli(options = {}) {
  return new Cli(makeBoard(options), options.out || process.stdout, options.err || process.stderr);
}

export function makeServer(options = {}) {
  const webDir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "web");
  return new HttpServer(makeBoard(options), webDir, options.commit ?? null);
}
