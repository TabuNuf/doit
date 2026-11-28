import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MarketingDb } from "../src/store/marketingDb.js";
import { SqliteContacts } from "../src/store/sqliteContacts.js";
import { SqliteDrafts } from "../src/store/sqliteDrafts.js";
import { ContactBook } from "../src/domain/contactBook.js";
import { Mailroom } from "../src/domain/mailroom.js";
import { FakeSender, FakeMailbox, FakeAccount, FakeTemplates } from "./fakeMail.js";

const PROFILES = [{ game: "bunny-bunker", name: "Bunny Bunker" }, { game: "good-box", name: "Good Box" }];
const TEMPLATES = { pitch: "Subject: {{game}} for {{name}}\n\nHi {{name}},\n\n{{personal}}\n\nPlay {{game}}.\n" };

function room(over = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "doit-room-"));
  const db = new MarketingDb(path.join(dir, "home"));
  const clock = { t: new Date("2026-11-21T10:00:00") };
  const now = () => clock.t;
  const book = new ContactBook(new SqliteContacts(db), { has: g => PROFILES.some(p => p.game === g), list: () => PROFILES.map(p => ({ ...p })) }, now);
  const sender = new FakeSender();
  const mailbox = new FakeMailbox();
  let n = 0;
  const mailroom = new Mailroom({
    drafts: new SqliteDrafts(db), book, templates: new FakeTemplates(TEMPLATES), account: new FakeAccount(), sender, mailbox,
    now, random: () => `r${++n}`, ...over,
  });
  const ada = book.add({ name: "Ada", types: ["press"], email: "Ada@example.com" }).id;
  return { mailroom, book, sender, mailbox, clock, ada, db };
}

const pitch = (r, personal = "Loved your run.") => r.mailroom.draft({ contact: r.ada, template: "pitch", game: "bunny-bunker", personal });

test("a draft is filled from the template with the profile's name and shows its recipient", t => {
  const r = room(); t.after(() => r.db.close());
  const d = pitch(r);
  assert.deepEqual([d.subject, d.state, d.to, d.contactName, d.game], ["Bunny Bunker for Ada", "draft", "Ada@example.com", "Ada", "bunny-bunker"]);
  assert.match(d.body, /^Hi Ada,\n\nLoved your run\.\n\nPlay Bunny Bunker\.$/);
  assert.deepEqual(r.mailroom.templates(), ["pitch"]);
});

test("a draft is refused without an email, a profile, a template or a personal line", t => {
  const r = room(); t.after(() => r.db.close());
  const bare = r.book.add({ name: "Bo", types: ["press"] }).id;
  assert.throws(() => r.mailroom.draft({ contact: bare, template: "pitch", game: "good-box", personal: "x" }), /no email/);
  assert.throws(() => r.mailroom.draft({ contact: r.ada, template: "pitch", game: "nope", personal: "x" }), /No profile/);
  assert.throws(() => r.mailroom.draft({ contact: r.ada, template: "nope", game: "good-box", personal: "x" }), /No template/);
  assert.throws(() => r.mailroom.draft({ contact: r.ada, template: "pitch", game: "good-box", personal: "" }), /\{\{personal\}\}/);
  assert.equal(r.mailroom.drafts().length, 0);
});

test("new personal lines refill the draft, an edited body is kept, a discarded draft is gone", t => {
  const r = room(); t.after(() => r.db.close());
  const d = pitch(r);
  assert.match(r.mailroom.edit(d.id, { personal: "Great stream." }).body, /Great stream\./);
  assert.equal(r.mailroom.edit(d.id, { subject: "Hello" }).subject, "Hello");
  assert.throws(() => r.mailroom.edit(d.id, { body: " " }), /body/);
  r.mailroom.discard(d.id);
  assert.throws(() => r.mailroom.getDraft(d.id), e => e.status === 404);
});

test("approve and send mails once, logs a mail touch, labels it and counts today", async t => {
  const r = room(); t.after(() => r.db.close());
  const d = pitch(r);
  r.mailbox.sentIds = new Set(["<doit-1-r1@example.com>"]);
  const s = await r.mailroom.approveAndSend(d.id);
  assert.deepEqual([s.state, s.messageId, s.labeled, s.sentAt], ["sent", "<doit-1-r1@example.com>", true, "2026-11-21T10:00:00"]);
  assert.equal(r.sender.sent.length, 1);
  assert.equal(r.sender.sent[0].to, "Ada@example.com");
  assert.deepEqual(r.mailbox.marketing, ["<doit-1-r1@example.com>"]);
  const touch = r.book.get(r.ada).touches[0];
  assert.deepEqual([touch.kind, touch.game, touch.date, touch.note], ["mail", "bunny-bunker", "2026-11-21", "Bunny Bunker for Ada"]);
  assert.deepEqual(await r.mailroom.status(), { ready: true, address: "me@example.com", sentToday: 1, cap: 20 });
  await assert.rejects(() => r.mailroom.send(d.id), /approved/);
  assert.throws(() => r.mailroom.discard(d.id), /sent/);
});

test("a mail still unfiled after sending stays unlabeled and the sweep files it later", async t => {
  const r = room(); t.after(() => r.db.close());
  const s = await r.mailroom.approveAndSend(pitch(r).id);
  assert.equal(s.labeled, false);
  r.mailbox.sentIds.add(s.messageId);
  const out = await r.mailroom.sweep();
  assert.deepEqual([out.ok, out.labeled], [true, 1]);
  assert.equal(r.mailroom.getDraft(s.id).labeled, true);
});

test("a failed send marks the draft failed with the error, and editing returns it to draft", async t => {
  const r = room(); t.after(() => r.db.close());
  r.sender.fail = "Login refused: check the app password";
  const d = await r.mailroom.approveAndSend(pitch(r).id);
  assert.deepEqual([d.state, d.error], ["failed", "Login refused: check the app password"]);
  assert.equal(r.book.get(r.ada).touches.length, 0);
  assert.equal(r.mailroom.edit(d.id, { body: "Retry" }).state, "draft");
});

test("the daily cap keeps the draft approved, and it goes the next day", async t => {
  const r = room({ account: new FakeAccount({ address: "me@example.com", name: "", password: "pw", dailyCap: 1 }) }); t.after(() => r.db.close());
  const a = pitch(r), b = pitch(r, "Second.");
  assert.equal((await r.mailroom.approveAndSend(a.id)).state, "sent");
  assert.equal((await r.mailroom.approveAndSend(b.id)).state, "approved");
  assert.equal(r.sender.sent.length, 1);
  r.clock.t = new Date("2026-11-22T09:00:00");
  assert.equal((await r.mailroom.approveAndSend(b.id)).state, "sent");
  assert.equal(r.sender.sent.length, 2);
});

test("without an account nothing is sent and the sweep is skipped", async t => {
  const r = room({ account: { read: async () => null } }); t.after(() => r.db.close());
  const d = pitch(r);
  await assert.rejects(() => r.mailroom.approveAndSend(d.id), /Mail is not set up/);
  assert.equal(r.mailroom.getDraft(d.id).state, "draft");
  assert.deepEqual(await r.mailroom.sweep(), { ok: false, skipped: "Mail is not set up" });
  assert.equal((await r.mailroom.status()).ready, false);
  assert.equal(r.mailbox.sessions, 0);
});

test("the sweep logs replies from contacts, moves them, and does nothing twice", async t => {
  const r = room(); t.after(() => r.db.close());
  const s = await r.mailroom.approveAndSend(pitch(r).id);
  r.mailbox.sentIds.add(s.messageId);
  r.mailbox.inbox = [
    { uid: 7, from: "ada@EXAMPLE.com", subject: "Re: Bunny Bunker for Ada", date: "2026-11-21T22:30:00.000Z", messageId: "<re1@example.com>", inReplyTo: s.messageId },
    { uid: 8, from: "stranger@example.com", subject: "Hi", date: "", messageId: "<x@example.com>" },
  ];
  const out = await r.mailroom.sweep();
  assert.deepEqual(out.replies, [{ contact: "Ada", subject: "Re: Bunny Bunker for Ada" }]);
  assert.deepEqual(r.mailbox.moved, [7]);
  const reply = r.book.get(r.ada).touches.find(x => x.kind === "reply");
  assert.deepEqual([reply.game, reply.note], ["bunny-bunker", "Re: Bunny Bunker for Ada"]);
  assert.equal(reply.date, dayOfLocal("2026-11-21T22:30:00.000Z"));
  assert.deepEqual((await r.mailroom.sweep()).replies, []);
  assert.equal(r.book.get(r.ada).touches.filter(x => x.kind === "reply").length, 1);
});

function dayOfLocal(iso) {
  const d = new Date(iso), p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

test("a reply that answers no draft takes the game of the latest sent one; a reply logged but not moved is not logged twice", async t => {
  const r = room(); t.after(() => r.db.close());
  const d = await r.mailroom.approveAndSend(r.mailroom.draft({ contact: r.ada, template: "pitch", game: "good-box", personal: "p" }).id);
  r.mailbox.sentIds.add(d.messageId);
  r.mailbox.inbox = [{ uid: 3, from: "ada@example.com", subject: "Thanks", date: "2026-11-21T08:00:00.000Z", messageId: "<re2@example.com>" }];
  const move = r.mailbox.moved;
  r.mailbox.error = null;
  await r.mailroom.sweep();
  assert.equal(r.book.get(r.ada).touches.find(x => x.kind === "reply").game, "good-box");
  // The same mail again (the move failed last time): the ref keeps it to one touch.
  r.mailbox.inbox = [{ uid: 3, from: "ada@example.com", subject: "Thanks", date: "2026-11-21T08:00:00.000Z", messageId: "<re2@example.com>" }];
  await r.mailroom.sweep();
  assert.equal(r.book.get(r.ada).touches.filter(x => x.kind === "reply").length, 1);
  assert.deepEqual(move, [3, 3]);
});

test("a mailbox error comes back as a result, and a second sweep during one gets the same promise", async t => {
  const r = room(); t.after(() => r.db.close());
  r.mailbox.error = "Login refused: check the app password";
  const a = r.mailroom.sweep(), b = r.mailroom.sweep();
  assert.equal(a, b);
  assert.deepEqual(await a, { ok: false, replies: [], labeled: 0, error: "Login refused: check the app password" });
  assert.equal(r.mailbox.sessions, 1);
});

test("the sweep files a reply from a parked contact", async t => {
  const r = room(); t.after(() => r.db.close());
  const s = await r.mailroom.approveAndSend(pitch(r).id);
  r.mailbox.sentIds.add(s.messageId);
  r.book.update(r.ada, { status: "parked" });
  r.mailbox.inbox = [{ uid: 7, from: "ada@example.com", subject: "Re: Bunny Bunker for Ada", date: "2026-11-21T22:30:00.000Z", messageId: "<re1@example.com>", inReplyTo: s.messageId }];
  const out = await r.mailroom.sweep();
  assert.deepEqual(out.replies, [{ contact: "Ada", subject: "Re: Bunny Bunker for Ada" }]);
  assert.deepEqual(r.mailbox.moved, [7]);
});
