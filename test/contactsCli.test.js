import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeCli, makeContacts } from "../src/root.js";
import { setup, addProfiles } from "./helpers.js";

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

test("contact add, set, show, fit, touch and the contacts list", t => {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const run = cliFor(s);
  assert.equal(run("contacts").out, "No contacts.\n");
  assert.equal(run("contact", "add", "Ada", "Plays", "--type", "influencer,blogger", "--reach", "5000", "--next", "2026-11-01", "--channels", "youtube=https://youtube.com/@ada,twitch=https://twitch.tv/ada", "--email", "ada@example.test").out, "Added contact 1: Ada Plays\n");
  run("contact", "add", "Bit", "Blog", "--type", "press", "--reach", "300");
  assert.equal(run("contact", "set", "2", "status=dormant", "next=2026-12-01", "notes=Slow to reply").out, "2  Bit Blog  press  300  dormant  next 2026-12-01\n");
  assert.equal(run("fit", "1", "bunny-bunker", "plays", "cozy", "co-op").out, "Ada Plays fits bunny-bunker\n");
  assert.equal(run("fit", "1", "bunny-bunker", "--remove").out, "1  Ada Plays  influencer+blogger  5000  active  due 2026-11-01\n");
  assert.match(run("fit", "1", "bunny-bunker", "--remove").err, /no fit/);
  run("fit", "1", "bunny-bunker", "plays", "cozy", "co-op");
  assert.equal(run("touch", "1", "mail", "--game", "bunny-bunker", "--date", "2026-11-10").out, "Ada Plays: mail 2026-11-10 bunny-bunker\n");
  assert.match(run("touch", "1", "reply").out, /Ada Plays: reply 2026-11-20/);

  const shown = run("contact", "show", "1").out;
  assert.match(shown, /^1  Ada Plays  influencer\+blogger  5000  active  due 2026-11-01  fits bunny-bunker\n/);
  assert.match(shown, /youtube https:\/\/youtube.com\/@ada\ntwitch https:\/\/twitch.tv\/ada\n/);
  assert.match(shown, /fits bunny-bunker: plays cozy co-op\n2026-11-20 reply\n2026-11-10 mail bunny-bunker/);
  assert.equal(JSON.parse(run("contact", "show", "2", "--json").out).notes, "Slow to reply");

  assert.equal(run("contacts", "--fits", "bunny-bunker").out, "1  Ada Plays  influencer+blogger  5000  active  due 2026-11-01  fits bunny-bunker\n");
  assert.equal(run("contacts", "--contacted", "bunny-bunker").out.trim().split("\n").length, 1);
  assert.match(run("contacts", "--not-contacted", "bunny-bunker").out, /^2  Bit Blog/);
  assert.match(run("contacts", "--no-about").out, /^1  Ada Plays/);
  assert.equal(run("contacts", "--due").out.trim().split("\n").length, 1);
  assert.equal(run("contacts", "--type", "press", "--status", "dormant").out.trim().split("\n").length, 1);
  assert.equal(run("contacts", "--reach", "1000").out.trim().split("\n").length, 1);
  assert.deepEqual(JSON.parse(run("contacts", "--json").out).map(c => c.name), ["Ada Plays", "Bit Blog"]);
  assert.match(run("profiles").out, /^bunny-bunker  Bunny Bunker  game  demo  2027-03-01  scale -  co-op, cozy\ngood-box  Good Box  game  released  scale -  puzzle\n$/);
});

test("refused values and missing arguments exit 1 with a message", t => {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const run = cliFor(s);
  run("contact", "add", "Ada", "--type", "influencer");
  for (const [args, re] of [
    [["contact", "add", "X", "--type", "alien"], /Unknown type/],
    [["contact", "add", "X"], /at least one type/],
    [["contact", "add", "--type", "press"], /Usage: doit contact add/],
    [["contact", "set", "1", "reach=Z"], /Reach must be/],
    [["contact", "set", "1", "colour=red"], /Unknown field/],
    [["contact", "show", "9"], /No contact 9/],
    [["fit", "1", "no-game", "why"], /No profile/],
    [["fit", "1", "good-box"], /needs a reason/],
    [["touch", "1", "call"], /Unknown touch kind/],
    [["contact", "frob"], /Usage/],
  ]) {
    const r = run(...args);
    assert.equal(r.code, 1, args.join(" "));
    assert.match(r.err, re, args.join(" "));
  }
  assert.match(run("help").out, /doit contacts \[--type/);
});

test("contact set genres= and about=, shown in contact show and filtered with --genre", t => {
  const s = setup(); t.after(s.cleanup);
  const run = cliFor(s);
  run("contact", "add", "Ada", "--type", "influencer");
  run("contact", "add", "Bit", "--type", "press", "--genres", "Horror");
  assert.equal(run("contact", "set", "1", "genres=Indie,Co-op", "about=Cozy co-op streamer").code, 0);
  const shown = run("contact", "show", "1").out;
  assert.match(shown, /^genres Indie, Co-op$/m);
  assert.match(shown, /^about Cozy co-op streamer$/m);
  assert.match(run("contacts", "--genre", "indie").out, /^1  Ada/);
  assert.doesNotMatch(run("contacts", "--genre", "indie").out, /Bit/);
  run("contact", "set", "1", "genres=");
  assert.equal(JSON.parse(run("contact", "show", "1", "--json").out).genres.length, 0);
  assert.match(run("help").out, /genres a,b|genres \(a,b\)/);
});

test("importing the fixture fills genres from the Genre column and keeps them out of the notes", t => {
  const s = setup(); t.after(s.cleanup);
  const run = cliFor(s);
  run("contacts", "import", FIXTURE);
  assert.match(run("contacts", "--genre", "co-op").out, /Pixel Pat/);
  assert.doesNotMatch(run("contact", "show", "1").out, /Genre:/);
});

test("contact set special= sets a one-line reason and an empty value clears it; show prints it", t => {
  const s = setup(); t.after(s.cleanup);
  const run = cliFor(s);
  run("contact", "add", "Special", "Geek", "40", "--type", "influencer");
  assert.equal(run("contact", "set", "1", "special=Good friend of Tabu").code, 0);
  assert.match(run("contact", "show", "1").out, /\nspecial Good friend of Tabu\n/);
  assert.equal(JSON.parse(run("contact", "show", "1", "--json").out).special, "Good friend of Tabu");
  assert.equal(run("contact", "set", "1", "special=").code, 0);
  assert.doesNotMatch(run("contact", "show", "1").out, /special/);
});
