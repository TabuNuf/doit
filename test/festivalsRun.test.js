// launcher/festivals-run.md: the prompt names real commands and flags, and its log line lands in the activity log.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeActivity, makeContacts } from "../src/root.js";
import { setup } from "./helpers.js";
import { cliFor } from "./contactsCli.test.js";

const FILE = fs.readFileSync(path.join(import.meta.dirname, "..", "launcher", "festivals-run.md"), "utf8");
const prompt = FILE.split("```text\n")[1].split("\n```")[0];
const command = start => prompt.split("\n").find(l => l.startsWith("node /Users/tabu/Repos/doit/bin/doit.js " + start));

const SAMPLE = { year: "2027", starts: "2027-02-23", ends: "2027-03-02", deadline: "2026-12-15", cost: "free", where: "steam", genres: "co-op,puzzle", stages: "demo", platforms: "steam", url: "https://store.example.test/fest", type: "festival" };

test("the run is weekly on Monday at 07:00 and names every source", () => {
  assert.match(FILE, /\*\*Schedule:\*\* weekly, Monday at 07:00/);
  for (const s of ["Steam", "Epic", "GOG", "itch.io", "howtomarketagame.com/festivals", "public part only"]) assert.ok(prompt.includes(s), s);
  for (const t of ["game dev", "podcast", "design", "criteria unknown", "in development"]) assert.ok(prompt.includes(t), t);
});

test("the upsert in the prompt uses only flags the CLI takes, and a command built from it runs twice into one festival", t => {
  const s = setup(); t.after(s.cleanup);
  const run = cliFor(s);
  const flags = [...command("festival upsert").matchAll(/--(\w+)/g)].map(m => m[1]);
  assert.ok(flags.length >= 10);
  const args = ["festival", "upsert", "Sample Fest"];
  for (const f of flags) { assert.ok(f in SAMPLE, `the prompt's flag --${f} is not in the sample`); args.push(`--${f}`, SAMPLE[f]); }
  assert.equal(run(...args).out, "Added festival 1: Sample Fest 2027\n");
  assert.equal(run(...args).out, "Updated festival 1: Sample Fest 2027\n");
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  assert.equal(book.festivals().length, 1);
  assert.deepEqual(book.festivals()[0].event.criteria, { genres: ["co-op", "puzzle"], stages: ["demo"], platforms: ["steam"] });
  assert.equal(run("festival", "upsert", "Talk Con", "--year", "2027", "--type", "conference", "--topic", "game dev").code, 0);
  assert.ok(command("festival set").endsWith("festival set <id> state=past"));
  assert.equal(run("festival", "set", "1", "state=past").code, 0);
});

test("the summary line goes to the activity log under festivals", t => {
  const s = setup(); t.after(s.cleanup);
  const run = cliFor(s);
  assert.match(command("log festivals"), /^node \S+ log festivals "Festivals run <YYYY-MM-DD>: /);
  const text = "Festivals run 2026-11-23: 2 added, 1 updated, 0 marked past, 0 failed; sources read: Steam; skipped: GOG";
  assert.equal(run("log", "festivals", text).out, "Logged under festivals\n");
  const [entry] = makeActivity({ home: s.home, now: () => s.clock.t }).recent();
  assert.deepEqual([entry.ref, entry.what], ["festivals", text]);
  for (const bad of [["log"], ["log", "festivals"], ["log", "T-1/x", "text"], ["log", "Festivals", "text"]]) assert.equal(run(...bad).code, 1, bad.join(" "));
});
