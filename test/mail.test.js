import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MarketingDb } from "../src/store/marketingDb.js";
import { SqliteContacts } from "../src/store/sqliteContacts.js";
import { SqliteDrafts } from "../src/store/sqliteDrafts.js";
import { TemplateShelf } from "../src/store/templateShelf.js";
import { SettingsFile } from "../src/store/settings.js";
import { ContactBook } from "../src/domain/contactBook.js";
import { MemoryContacts } from "./memoryContacts.js";
import {
  parseTemplate, fillTemplate, makeDraft, editDraft, approveDraft, markSent, markFailed, MailError,
} from "../src/domain/mail.js";

const TEXT = "Subject: {{game}} for {{name}}\n\n\nHi {{name}},\n\n{{personal}}\n\nPlay {{game}} on Steam.\n";
const tpl = () => parseTemplate("pitch", TEXT);
const VALUES = { name: "Ada", personal: "Loved your co-op run.", game: "Bunny Bunker" };

test("a template is its Subject line and body with leading blank lines dropped", () => {
  assert.deepEqual(tpl(), { name: "pitch", subject: "{{game}} for {{name}}", body: "Hi {{name}},\n\n{{personal}}\n\nPlay {{game}} on Steam." });
  assert.throws(() => parseTemplate("x", "Hello\nbody"), /Subject/);
  assert.throws(() => parseTemplate("x", "Subject: s\n\n"), /no body/);
});

test("filling a template for a contact replaces every placeholder", () => {
  const f = fillTemplate(tpl(), VALUES);
  assert.equal(f.subject, "Bunny Bunker for Ada");
  assert.equal(f.body, "Hi Ada,\n\nLoved your co-op run.\n\nPlay Bunny Bunker on Steam.");
});

test("an unknown placeholder or an empty value is refused, naming it", () => {
  assert.throws(() => fillTemplate(parseTemplate("t", "Subject: s\n\nHi {{nick}}"), VALUES), /\{\{nick\}\}/);
  assert.throws(() => fillTemplate(tpl(), { ...VALUES, personal: "  " }), /\{\{personal\}\}/);
  assert.ok(fillTemplate(parseTemplate("t", "Subject: s\n\nHi {{name}}"), { name: "Ada" }));
});

test("a draft is edited while draft or failed, a failed one returns to draft, and approving needs a filled mail", () => {
  const d = makeDraft({ id: 1, contact: 1, game: "bunny-bunker", template: "pitch", personal: "p", ...fillTemplate(tpl(), VALUES), created: "2026-11-21T10:00:00" });
  assert.equal(d.state, "draft");
  const e = editDraft(d, { subject: "New  subject", body: "New body" });
  assert.equal(e.subject, "New subject");
  assert.throws(() => editDraft(d, { subject: " " }), /subject/);
  const open = editDraft(d, { body: "Hi {{name}}" });
  assert.throws(() => approveDraft(open), /\{\{name\}\}/);
  const approved = approveDraft(e);
  assert.equal(approved.state, "approved");
  assert.throws(() => editDraft(approved, { body: "x" }), /approved/);
  assert.throws(() => approveDraft(approved), /approved/);
  const failed = markFailed(approved, "Login refused");
  assert.equal(failed.error, "Login refused");
  const back = editDraft(failed, { body: "Retry" });
  assert.deepEqual([back.state, back.error], ["draft", ""]);
  const sent = markSent(approved, "2026-11-21T10:05:00", "<m@example.com>");
  assert.deepEqual([sent.state, sent.messageId], ["sent", "<m@example.com>"]);
  assert.throws(() => editDraft(sent, { body: "x" }), MailError);
});

function db() { return new MarketingDb(path.join(fs.mkdtempSync(path.join(os.tmpdir(), "doit-drafts-")), "home")); }

test("drafts are stored, filtered by state, updated, counted by sent day and removed", () => {
  const m = db();
  const contacts = new SqliteContacts(m);
  const cid = contacts.insert({ name: "Ada", types: ["press"], topic: "", email: "ada@example.com", reach: null, notes: "", status: "active", next: "", channels: [] });
  const drafts = new SqliteDrafts(m);
  const base = makeDraft({ contact: cid, game: "good-box", template: "pitch", personal: "p", subject: "S", body: "B", created: "2026-11-21T09:00:00" });
  const a = drafts.insert(base);
  const b = drafts.insert(base);
  assert.deepEqual(drafts.all().map(d => d.id), [b, a]);
  assert.deepEqual(drafts.get(a), { ...base, id: a, contact: cid });
  drafts.update(a, markSent({ ...base, state: "approved" }, "2026-11-21T10:00:00", "<m@example.com>"));
  assert.deepEqual(drafts.all({ state: "sent" }).map(d => d.id), [a]);
  assert.equal(drafts.sentOn("2026-11-21"), 1);
  assert.equal(drafts.sentOn("2026-11-20"), 0);
  drafts.remove(b);
  assert.equal(drafts.get(b), null);
  contacts.addTouch(cid, { date: "2026-11-21", kind: "mail" });
  m.db.prepare("DELETE FROM contacts WHERE id = ?").run(cid);
  assert.equal(drafts.all().length, 0, "drafts go with their contact");
  m.close();
});

test("the template shelf lists and reads the marketing project's Templates folder", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "doit-tpl-"));
  const dir = path.join(root, "proj", "Docs", "Templates");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "pitch.md"), TEXT);
  fs.writeFileSync(path.join(dir, "notes.txt"), "x");
  const settings = new SettingsFile(root);
  const shelf = new TemplateShelf(settings);
  assert.deepEqual(shelf.list(), [], "project not registered");
  assert.equal(shelf.read("pitch"), null);
  settings.write({ projects: [{ id: "polyspice-marketing", path: path.join(root, "proj"), docs: "Docs" }] });
  assert.deepEqual(shelf.list(), ["pitch"]);
  assert.equal(shelf.read("pitch"), TEXT);
  assert.equal(shelf.read("missing"), null);
  assert.equal(shelf.read("../pitch"), null);
});

test("ContactBook.addTouch carries a note and a ref and logs a ref once", () => {
  const book = new ContactBook(new MemoryContacts(), { has: () => true, list: () => [] }, () => new Date("2026-11-21T08:00:00"));
  book.add({ name: "Ada", types: ["press"] });
  book.addTouch(1, { kind: "mail", game: "good-box", note: "Hello  there", ref: "<a@example.com>" });
  const c = book.addTouch(1, { kind: "mail", game: "good-box", note: "Hello there", ref: "<a@example.com>" });
  assert.equal(c.touches.length, 1);
  assert.equal(c.touches[0].note, "Hello there");
});
