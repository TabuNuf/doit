import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeCli, makeContacts } from "../src/root.js";
import { setup } from "./helpers.js";

const FIXTURE = path.join(import.meta.dirname, "fixtures", "new-streamers.csv");

/** A CLI over a temporary data folder; `run(...args)` gives {code, out, err}. */
export function cliFor(s) {
  return (...args) => {
    let out = "", err = "";
    const code = makeCli({ home: s.home, now: () => s.clock.t, out: { write: x => { out += x; } }, err: { write: x => { err += x; } } }).run(args);
    return { code, out, err };
  };
}

test("contacts import reads a file, and a second import updates", t => {
  const s = setup(); t.after(s.cleanup);
  const run = cliFor(s);
  assert.equal(run("contacts", "import", FIXTURE).out, "Imported: 5 added, 0 updated, 0 skipped\n");
  assert.equal(run("contacts", "import", FIXTURE).out, "Imported: 0 added, 5 updated, 0 skipped\n");
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  assert.equal(book.list().length, 5);
  const bad = run("contacts", "import", path.join(s.root, "missing.csv"));
  assert.equal(bad.code, 1);
  assert.match(bad.err, /^doit: /);
  assert.equal(run("contacts", "import").code, 1);
});

test("a command that does not use contacts leaves no marketing.db", t => {
  const s = setup(); t.after(s.cleanup);
  assert.equal(cliFor(s)("sweep").code, 0);
  assert.ok(!fs.existsSync(path.join(s.home, "marketing.db")));
});
