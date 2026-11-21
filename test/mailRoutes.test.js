import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeServer, makeContacts } from "../src/root.js";
import { setup, addProfiles } from "./helpers.js";
import { FakeSender, FakeMailbox, FakeAccount } from "./fakeMail.js";

async function serve(t) {
  const s = setup(); t.after(s.cleanup);
  const docs = addProfiles(s);
  fs.mkdirSync(path.join(docs, "Templates"));
  fs.writeFileSync(path.join(docs, "Templates", "pitch.md"), "Subject: {{game}} for {{name}}\n\nHi {{name}},\n\n{{personal}}\n");
  const ports = { account: new FakeAccount(), sender: new FakeSender(), mailbox: new FakeMailbox(), random: () => "r" };
  const server = makeServer({ home: s.home, now: () => s.clock.t, ports });
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = (p, method = "GET", body) => fetch(`http://127.0.0.1:${port}${p}`, {
    method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  }).then(async r => ({ status: r.status, body: await r.json() }));
  return { s, api, ports };
}

// The route tests make drafts through the Mailroom the server uses, so they go through the CLI-built path.
async function withDraft(t) {
  const w = await serve(t);
  const book = makeContacts({ home: w.s.home, now: () => w.s.clock.t });
  book.add({ name: "Ada", types: ["press"], email: "ada@example.com" });
  const { makeCli } = await import("../src/root.js");
  const code = await makeCli({ home: w.s.home, now: () => w.s.clock.t, out: { write() {} }, err: { write() {} } })
    .run(["draft", "add", "1", "--template", "pitch", "--game", "good-box", "--personal", "Loved it."]);
  assert.equal(code, 0);
  return w;
}

test("drafts are listed, shown, edited and discarded over the API", async t => {
  const { api } = await withDraft(t);
  const list = await api("/api/drafts");
  assert.deepEqual([list.status, list.body.length, list.body[0].to], [200, 1, "ada@example.com"]);
  assert.equal((await api("/api/drafts?state=sent")).body.length, 0);
  assert.equal((await api("/api/drafts/1")).body.subject, "Good Box for Ada");
  const p = await api("/api/drafts/1", "PATCH", { subject: "Hello", body: "New body" });
  assert.deepEqual([p.status, p.body.subject, p.body.body], [200, "Hello", "New body"]);
  assert.equal((await api("/api/drafts/1", "PATCH", { body: " " })).status, 400);
  assert.equal((await api("/api/drafts/9")).status, 404);
  assert.equal((await api("/api/drafts/1", "DELETE")).status, 200);
  assert.equal((await api("/api/drafts/1", "DELETE")).status, 404);
});

test("sending over the API is awaited: the draft comes back sent, then refused a second time", async t => {
  const { api, ports } = await withDraft(t);
  const r = await api("/api/drafts/1/send", "POST");
  assert.deepEqual([r.status, r.body.state], [200, "sent"]);
  assert.equal(ports.sender.sent.length, 1);
  assert.equal((await api("/api/drafts/1/send", "POST")).status, 400);
  assert.equal((await api("/api/drafts/1", "DELETE")).status, 400);
  assert.deepEqual((await api("/api/mail/status")).body, { ready: true, address: "me@example.com", sentToday: 1, cap: 20 });
});

test("the sweep route files replies and reports them", async t => {
  const { api, ports } = await withDraft(t);
  ports.mailbox.inbox = [{ uid: 2, from: "ada@example.com", subject: "Re: hi", date: "2026-11-20T08:00:00.000Z", messageId: "<a@example.com>" }];
  const r = await api("/api/mail/sweep", "POST");
  assert.deepEqual([r.status, r.body.ok, r.body.replies], [200, true, [{ contact: "Ada", subject: "Re: hi" }]]);
  assert.equal((await api("/api/contacts/1")).body.touches[0].kind, "reply");
});

test("without an account the send is refused with 400 and the sweep is skipped", async t => {
  const { api, ports } = await withDraft(t);
  ports.account.account = null;
  const r = await api("/api/drafts/1/send", "POST");
  assert.deepEqual([r.status, r.body.error], [400, "Mail is not set up"]);
  assert.equal((await api("/api/mail/sweep", "POST")).body.skipped, "Mail is not set up");
  assert.equal((await api("/api/mail/status")).body.ready, false);
});

test("a contact's history lists its touches and sent mail newest first, each once", async t => {
  const { api } = await withDraft(t);
  await api("/api/contacts/1/touch", "POST", { kind: "video", game: "good-box", date: "2026-10-01" });
  await api("/api/drafts/1/send", "POST");
  await api("/api/contacts/1/touch", "POST", { kind: "reply", game: "good-box", date: "2026-11-30" });
  const h = await api("/api/contacts/1/history");
  assert.equal(h.status, 200);
  assert.deepEqual(h.body.map(e => [e.date, e.kind, e.game, e.note]), [
    ["2026-11-30", "reply", "good-box", ""],
    ["2026-11-20", "mail", "good-box", "Good Box for Ada"],
    ["2026-10-01", "video", "good-box", ""],
  ]);
  assert.equal((await api("/api/contacts/1")).body.last, "2026-11-30");
  assert.equal((await api("/api/contacts/9/history")).status, 404);
});
