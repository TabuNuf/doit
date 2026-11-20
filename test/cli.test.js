import test from "node:test";
import assert from "node:assert/strict";
import { Cli } from "../src/cli/cli.js";
import { setup } from "./helpers.js";

function run(board, ...args) {
  let out = "", err = "";
  const code = new Cli(board, { write: s => { out += s; } }, { write: s => { err += s; } }).run(args);
  return { code, out, err };
}

test("every command runs", t => {
  const s = setup(); t.after(s.cleanup);
  const b = s.board;
  assert.match(run(b, "projects").out, /^game  Game  /);
  assert.match(run(b, "epics", "game").out, /EPIC-014  Active  1\/3  Online lobby/);
  assert.match(run(b, "list", "--project", "game", "--state", "active").out, /game\/T-014.2  todo     ai    task Host migration/);
  assert.equal(JSON.parse(run(b, "list", "--owner", "human", "--json").out).length, 0);
  assert.match(run(b, "add", "game", "EPIC-014", "Lobby", "browser", "--type", "bug", "--owner", "human").out, /Added game\/T-014.4/);
  assert.match(run(b, "set", "game/T-014.4", "state=progress", "deadline=2026-12-01").out, /progress human bug  Lobby browser  due 2026-12-01/);
  assert.match(run(b, "comment", "game/T-014.4", "Looks", "good").out, /Commented/);
  const shown = run(b, "show", "game/T-014.4").out;
  assert.match(shown, /\[2026-11-20 09:00 ai\] Looks good/);
  assert.match(run(b, "epic", "add", "game", "Fog").out, /Added EPIC-017/);
  assert.match(run(b, "keep", "7").out, /kept 7 days/);
  assert.match(run(b, "sweep").out, /Archived 0/);
  assert.match(run(b, "help").out, /doit list/);
});

test("errors go to stderr with exit code 1", t => {
  const s = setup(); t.after(s.cleanup);
  const r = run(s.board, "set", "game/T-014.2", "state=nope");
  assert.equal(r.code, 1);
  assert.match(r.err, /^doit: state must be one of/);
  assert.equal(run(s.board, "frobnicate").code, 1);
});
