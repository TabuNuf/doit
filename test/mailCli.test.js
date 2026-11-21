import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeCli, makeMarketing } from "../src/root.js";
import { setup, addProfiles } from "./helpers.js";
import { FakeSender, FakeMailbox, FakeAccount } from "./fakeMail.js";

const PITCH = "Subject: {{game}} for {{name}}\n\nHi {{name}},\n\n{{personal}}\n\nPlay {{game}}.\n";

function world(t) {
  const s = setup(); t.after(s.cleanup);
  fs.mkdirSync(path.join(addProfiles(s), "Templates"));
  fs.writeFileSync(path.join(s.root, "marketing", "Docs", "Templates", "pitch.md"), PITCH);
  const ports = { account: new FakeAccount(), sender: new FakeSender(), mailbox: new FakeMailbox(), random: () => "r" };
  const options = { home: s.home, now: () => s.clock.t, ports };
  const run = async (...args) => {
    let out = "", err = "";
    const code = await makeCli({ ...options, out: { write: x => { out += x; } }, err: { write: x => { err += x; } } }).run(args);
    return { code, out, err };
  };
  const { book } = makeMarketing(options);
  const ada = book.add({ name: "Ada", types: ["press"], email: "ada@example.com" }).id;
  return { run, ada, ports, book };
}

test("templates, draft add, draft show and drafts", async t => {
  const w = world(t);
  assert.equal((await w.run("templates")).out, "pitch\n");
  const a = await w.run("draft", "add", String(w.ada), "--template", "pitch", "--game", "good-box", "--personal", "Loved the run.");
  assert.equal(a.code, 0);
  assert.equal(a.out, "Draft 1\nTo: Ada <ada@example.com>\nSubject: Good Box for Ada\n\nHi Ada,\n\nLoved the run.\n\nPlay Good Box.\n");
  assert.match((await w.run("draft", "show", "1")).out, /^Draft 1  draft  good-box\nTo: Ada/);
  assert.equal(JSON.parse((await w.run("draft", "show", "1", "--json")).out).subject, "Good Box for Ada");
  assert.equal((await w.run("drafts")).out, "1  draft  Ada  good-box  Good Box for Ada\n");
  assert.equal((await w.run("drafts", "--state", "sent")).out, "No drafts.\n");
});

test("a refused draft prints the message and exits 1", async t => {
  const w = world(t);
  const r = await w.run("draft", "add", String(w.ada), "--template", "pitch", "--game", "good-box");
  assert.equal(r.code, 1);
  assert.match(r.err, /^doit: .*\{\{personal\}\}/);
  assert.equal((await w.run("draft", "add", String(w.ada))).code, 1);
  assert.equal((await w.run("draft", "show", "9")).code, 1);
  assert.equal((await w.run("draft", "send", "1")).code, 1);
});

test("mail sweep prints the replies it filed, and there is no command that sends", async t => {
  const w = world(t);
  w.ports.mailbox.inbox = [{ uid: 1, from: "ada@example.com", subject: "Re: hi", date: "2026-11-20T08:00:00.000Z", messageId: "<a@example.com>" }];
  const r = await w.run("mail", "sweep");
  assert.equal(r.out, "Reply from Ada: Re: hi\nSwept: 1 replies, 0 sent mails labeled\n");
  assert.equal(w.book.get(w.ada).touches[0].kind, "reply");
  assert.equal((await w.run("mail", "send")).code, 1);
  assert.equal(w.ports.sender.sent.length, 0);
});

test("mail sweep without an account says so, and a mailbox error exits 1", async t => {
  const w = world(t);
  w.ports.account.account = null;
  assert.equal((await w.run("mail", "sweep")).out, "Mail is not set up\n");
  w.ports.account.account = { address: "me@example.com", name: "", password: "pw", dailyCap: 20 };
  w.ports.mailbox.error = "Login refused: check the app password";
  const r = await w.run("mail", "sweep");
  assert.deepEqual([r.code, r.err], [1, "doit: Login refused: check the app password\n"]);
});
